import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Eye, Edit, Upload, RefreshCw, Send, 
  CheckCircle, Clock, Loader2, Building2, ExternalLink 
} from "lucide-react";
import { toast } from "sonner";
import EtherscanImporter from "./EtherscanImporter.jsx";
import DocumentViewer from "./DocumentViewer.jsx";
import FederalSubmission from "./FederalSubmission.jsx";

const DOCUMENT_TYPES = [
  { id: 'case_summary', name: 'Case Summary', icon: FileText, color: 'cyan' },
  { id: 'victim_statement', name: 'Victim Statement', icon: FileText, color: 'blue' },
  { id: 'transaction_log', name: 'Wallet Transaction Log', icon: FileText, color: 'purple' },
  { id: 'transaction_analysis', name: 'Transaction Analysis Sheet', icon: FileText, color: 'green' },
  { id: 'scammer_profile', name: 'Scammer Wallet Profile', icon: FileText, color: 'red' },
  { id: 'evidence_package', name: 'Evidence Package', icon: FileText, color: 'orange' }
];

export default function CaseDocuments({ caseData, onUpdate }) {
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [localDocuments, setLocalDocuments] = useState(caseData.case_documents || {});
  const [refreshKey, setRefreshKey] = useState(0);
  
  const queryClient = useQueryClient();

  // Sync local documents when caseData changes
  useEffect(() => {
    if (caseData.case_documents) {
      setLocalDocuments(caseData.case_documents);
    }
  }, [caseData.case_documents]);

  const documents = localDocuments;

  const generateDocument = async (docType, e, autoOpen = false) => {
    if (e) e.stopPropagation();
    setGenerating(docType);
    
    try {
      const docContent = await generateDocumentContent(docType, caseData);
      
      if (!docContent || !docContent.sections || docContent.sections.length === 0) {
        throw new Error('Document generation returned empty content');
      }
      
      const newDoc = {
        content: docContent,
        generated_at: new Date().toISOString(),
        status: 'generated',
        document_id: `${caseData.id}_${docType}_${Date.now()}`
      };
      
      const updatedDocs = {
        ...localDocuments,
        [docType]: newDoc
      };

      // Update local state immediately for instant UI feedback
      setLocalDocuments(updatedDocs);
      setRefreshKey(prev => prev + 1);

      // Persist to database
      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: updatedDocs,
        last_activity: new Date().toISOString()
      });

      toast.success(`${DOCUMENT_TYPES.find(d => d.id === docType)?.name} generated successfully`);
      
      // Auto-open the document viewer after generation
      if (autoOpen) {
        setSelectedDoc(docType);
        setViewerOpen(true);
      }
      
      onUpdate();
      return newDoc;
    } catch (error) {
      console.error('Document generation error:', error);
      toast.error(`Failed to generate document: ${error.message}`, {
        action: {
          label: 'Retry',
          onClick: () => generateDocument(docType, null, autoOpen)
        }
      });
      return null;
    } finally {
      setGenerating(null);
    }
  };

  const generateAllDocuments = async () => {
    setGeneratingAll(true);
    const errors = [];
    
    try {
      const allDocs = { ...localDocuments };
      
      for (const docType of DOCUMENT_TYPES) {
        try {
          const content = await generateDocumentContent(docType.id, caseData);
          allDocs[docType.id] = {
            content,
            generated_at: new Date().toISOString(),
            status: 'generated',
            document_id: `${caseData.id}_${docType.id}_${Date.now()}`
          };
          // Update UI progressively
          setLocalDocuments({ ...allDocs });
        } catch (docError) {
          console.error(`Error generating ${docType.id}:`, docError);
          errors.push(docType.name);
        }
      }

      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: allDocs,
        last_activity: new Date().toISOString()
      });

      setRefreshKey(prev => prev + 1);
      onUpdate();
      
      if (errors.length > 0) {
        toast.warning(`Generated with ${errors.length} error(s): ${errors.join(', ')}`);
      } else {
        toast.success("All documents generated successfully!");
      }
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast.error(`Failed to generate documents: ${error.message}`);
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleTransactionsImported = async (transactions) => {
    // Update case with imported transactions
    const timeline = caseData.timeline || [];
    const existingHashes = new Set(timeline.map(t => t.tx_hash).filter(Boolean));
    
    const newEvents = transactions
      .filter(tx => !existingHashes.has(tx.hash))
      .map(tx => ({
        date: tx.timestamp,
        event: `Transaction: ${tx.from_short} → ${tx.to_short}`,
        details: `${tx.value} ${tx.token || 'ETH'} ($${tx.value_usd?.toFixed(2) || 'N/A'})`,
        tx_hash: tx.hash,
        type: 'transaction'
      }));

    const walletAddresses = new Set([
      ...(caseData.monitored_wallets || []),
      ...transactions.map(tx => tx.from),
      ...transactions.map(tx => tx.to)
    ]);

    await base44.entities.InvestigationCase.update(caseData.id, {
      timeline: [...timeline, ...newEvents].sort((a, b) => new Date(b.date) - new Date(a.date)),
      imported_transactions: transactions,
      monitored_wallets: Array.from(walletAddresses),
      last_activity: new Date().toISOString()
    });

    // Regenerate transaction documents
    await generateDocument('transaction_log');
    await generateDocument('transaction_analysis');
    
    onUpdate();
    toast.success(`${transactions.length} transactions imported and documents updated`);
  };

  const openDocument = (docType, e) => {
    if (e) e.stopPropagation();
    
    const doc = documents[docType];
    if (!doc || !doc.content) {
      toast.error('Document not generated yet. Click Generate first.');
      return;
    }
    
    setSelectedDoc(docType);
    setViewerOpen(true);
  };

  const generateAndOpen = async (docType, e) => {
    if (e) e.stopPropagation();
    await generateDocument(docType, null, true);
  };

  const getDocStatus = (docType) => {
    const doc = documents[docType];
    if (!doc || !doc.content || !doc.content.sections) return 'not_generated';
    return doc.status || 'generated';
  };

  const handleDocumentUpdate = () => {
    setRefreshKey(prev => prev + 1);
    onUpdate();
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setSelectedDoc(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          Case Documents
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={generateAllDocuments}
            disabled={generatingAll || generating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            {generatingAll ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Generate All Documents</>
            )}
          </Button>
          <Button
            onClick={() => setSubmissionOpen(true)}
            className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Send to Authorities
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0f1419] border border-cyan-500/30">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="import">Etherscan Import</TabsTrigger>
          <TabsTrigger value="export">Export & Submit</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENT_TYPES.map((docType) => {
              const status = getDocStatus(docType.id);
              const doc = documents[docType.id];
              const Icon = docType.icon;

              return (
                <Card 
                  key={docType.id} 
                  className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-${docType.color}-500/20 hover:border-${docType.color}-500/40 transition-all cursor-pointer`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-${docType.color}-500/20 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 text-${docType.color}-400`} />
                      </div>
                      <Badge className={`${
                        status === 'generated' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      }`}>
                        {status === 'generated' ? 'Ready' : 'Not Generated'}
                      </Badge>
                    </div>

                    <h4 className="text-white font-semibold mb-1">{docType.name}</h4>
                    
                    {doc?.generated_at && (
                      <p className="text-xs text-gray-400 mb-3">
                        Generated: {new Date(doc.generated_at).toLocaleString()}
                      </p>
                    )}

                    <div className="flex gap-2 mt-3">
                      {status === 'generated' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => openDocument(docType.id, e)}
                            className="flex-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View & Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => generateDocument(docType.id, e, false)}
                            disabled={generating === docType.id || generatingAll}
                            className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                            title="Regenerate document"
                          >
                            {generating === docType.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={(e) => generateAndOpen(docType.id, e)}
                          disabled={generating === docType.id || generatingAll}
                          className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        >
                          {generating === docType.id ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                          ) : (
                            'Generate & Open'
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <EtherscanImporter 
            caseData={caseData} 
            onTransactionsImported={handleTransactionsImported}
          />
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <FederalSubmission caseData={caseData} documents={documents} />
        </TabsContent>
      </Tabs>

      {viewerOpen && selectedDoc && documents[selectedDoc]?.content && (
        <DocumentViewer
          key={`${selectedDoc}-${refreshKey}`}
          caseData={caseData}
          documentType={selectedDoc}
          document={documents[selectedDoc]}
          onClose={closeViewer}
          onUpdate={handleDocumentUpdate}
          onSubmit={() => {
            closeViewer();
            setSubmissionOpen(true);
          }}
        />
      )}

      {submissionOpen && (
        <FederalSubmission 
          caseData={caseData} 
          documents={documents}
          isDialog
          onClose={() => setSubmissionOpen(false)}
        />
      )}
    </div>
  );
}

async function generateDocumentContent(docType, caseData) {
  const transactions = caseData.imported_transactions || [];
  const wallets = caseData.monitored_wallets || [];
  
  switch (docType) {
    case 'case_summary':
      return {
        title: `Case Summary - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Case Information',
            content: `
Case Number: ${caseData.case_number}
Case Title: ${caseData.case_title}
Status: ${caseData.status}
Priority: ${caseData.priority || caseData.case_priority || 'Medium'}
Created: ${new Date(caseData.created_date).toLocaleString()}
Last Activity: ${caseData.last_activity ? new Date(caseData.last_activity).toLocaleString() : 'N/A'}
            `.trim()
          },
          {
            heading: 'Victim Information',
            content: `
Name: ${caseData.victim_name}
Email: ${caseData.victim_email || 'N/A'}
Phone: ${caseData.victim_phone || 'N/A'}
            `.trim()
          },
          {
            heading: 'Financial Summary',
            content: `
Amount Stolen: $${caseData.amount_stolen_usd?.toLocaleString() || 0} USD
Cryptocurrency: ${caseData.cryptocurrency || 'N/A'}
Blockchain: ${caseData.blockchain || 'N/A'}
Amount Recovered: $${caseData.recovery_amount?.toLocaleString() || 0} USD
            `.trim()
          },
          {
            heading: 'Incident Details',
            content: `
Fraud Type: ${caseData.fraud_type?.replace(/_/g, ' ').toUpperCase()}
Incident Date: ${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'N/A'}
Description: ${caseData.description || 'No description provided'}
            `.trim()
          }
        ]
      };

    case 'victim_statement':
      return {
        title: `Victim Statement - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Declaration',
            content: `
I, ${caseData.victim_name}, hereby declare the following statement to be true and accurate to the best of my knowledge:

On or about ${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : '[DATE]'}, I became a victim of ${caseData.fraud_type?.replace(/_/g, ' ')} resulting in a financial loss of approximately $${caseData.amount_stolen_usd?.toLocaleString() || 0} USD.

${caseData.description || '[Detailed description of the incident]'}
            `.trim()
          },
          {
            heading: 'Contact Information',
            content: `
Full Name: ${caseData.victim_name}
Email Address: ${caseData.victim_email || '[EMAIL]'}
Phone Number: ${caseData.victim_phone || '[PHONE]'}
            `.trim()
          },
          {
            heading: 'Acknowledgment',
            content: `
I understand that filing a false statement is a criminal offense. I certify under penalty of perjury that the foregoing is true and correct.

Signature: _______________________
Date: ${new Date().toLocaleDateString()}
            `.trim()
          }
        ]
      };

    case 'transaction_log':
      return {
        title: `Transaction Log - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Transaction Summary',
            content: `
Total Transactions: ${transactions.length}
Total Value: $${transactions.reduce((sum, tx) => sum + (tx.value_usd || 0), 0).toLocaleString()} USD
Date Range: ${transactions.length > 0 ? 
  `${new Date(transactions[transactions.length - 1]?.timestamp).toLocaleDateString()} - ${new Date(transactions[0]?.timestamp).toLocaleDateString()}` : 
  'N/A'}
            `.trim()
          },
          {
            heading: 'Transaction Details',
            content: transactions.length > 0 ? transactions.map((tx, i) => `
${i + 1}. Transaction Hash: ${tx.hash}
   From: ${tx.from}
   To: ${tx.to}
   Value: ${tx.value} ${tx.token || 'ETH'} ($${tx.value_usd?.toFixed(2) || 'N/A'} USD)
   Timestamp: ${new Date(tx.timestamp).toLocaleString()}
   Status: ${tx.status || 'Confirmed'}
`).join('\n') : 'No transactions imported. Use Etherscan Import to add transactions.'
          }
        ],
        transactions: transactions
      };

    case 'transaction_analysis':
      const uniqueFromAddresses = [...new Set(transactions.map(tx => tx.from))];
      const uniqueToAddresses = [...new Set(transactions.map(tx => tx.to))];
      const suspiciousPatterns = analyzeSuspiciousPatterns(transactions);
      
      return {
        title: `Transaction Analysis - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Wallet Analysis',
            content: `
Unique Sending Addresses: ${uniqueFromAddresses.length}
Unique Receiving Addresses: ${uniqueToAddresses.length}
Total Wallets Involved: ${new Set([...uniqueFromAddresses, ...uniqueToAddresses]).size}
            `.trim()
          },
          {
            heading: 'Suspicious Patterns Detected',
            content: suspiciousPatterns.length > 0 ? 
              suspiciousPatterns.map(p => `• ${p}`).join('\n') :
              'No suspicious patterns detected in analyzed transactions.'
          },
          {
            heading: 'Wallet Connections',
            content: wallets.length > 0 ? wallets.map(w => `• ${w}`).join('\n') : 'No wallet connections identified.'
          }
        ]
      };

    case 'scammer_profile':
      const scammerInfo = caseData.scammer_info || caseData.suspect_details || {};
      return {
        title: `Scammer Wallet Profile - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Suspect Information',
            content: `
Name/Alias: ${scammerInfo.name || scammerInfo.primary_suspect?.name || 'Unknown'}
Email: ${scammerInfo.email || scammerInfo.primary_suspect?.email || 'Unknown'}
Phone: ${scammerInfo.phone || scammerInfo.primary_suspect?.phone || 'Unknown'}
Website: ${scammerInfo.website || 'N/A'}
            `.trim()
          },
          {
            heading: 'Associated Wallet Addresses',
            content: (scammerInfo.wallet_addresses || scammerInfo.primary_suspect?.wallet_addresses || wallets || [])
              .map((w, i) => `${i + 1}. ${w}`).join('\n') || 'No wallet addresses recorded.'
          },
          {
            heading: 'Social Media Profiles',
            content: (scammerInfo.social_media || scammerInfo.social_profiles || [])
              .map(s => typeof s === 'string' ? `• ${s}` : `• ${s.platform}: ${s.url || s.profile}`).join('\n') || 'No social media profiles recorded.'
          }
        ]
      };

    case 'evidence_package':
      const evidenceFiles = caseData.evidence_files || caseData.evidence_log || [];
      return {
        title: `Evidence Package - ${caseData.case_number}`,
        sections: [
          {
            heading: 'Case Overview',
            content: `
Case: ${caseData.case_title}
Case Number: ${caseData.case_number}
Victim: ${caseData.victim_name}
Amount: $${caseData.amount_stolen_usd?.toLocaleString() || 0} USD
            `.trim()
          },
          {
            heading: 'Evidence Items',
            content: evidenceFiles.length > 0 ?
              evidenceFiles.map((e, i) => `
${i + 1}. ${e.description || e.name}
   Type: ${e.evidence_type || e.type || 'Document'}
   Date: ${new Date(e.timestamp || e.uploaded_date).toLocaleString()}
   Verified: ${e.verified ? 'Yes' : 'Pending'}
`).join('\n') : 'No evidence files uploaded.'
          },
          {
            heading: 'Chain of Custody',
            content: `
Evidence collected and maintained by SafeNestt Investigation System.
All files are timestamped and logged for legal integrity.
            `.trim()
          }
        ],
        evidence_count: evidenceFiles.length,
        evidence_files: evidenceFiles
      };

    default:
      return { title: 'Unknown Document', sections: [] };
  }
}

function analyzeSuspiciousPatterns(transactions) {
  const patterns = [];
  
  if (transactions.length === 0) return patterns;

  // Check for rapid succession transactions
  const sortedTx = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  for (let i = 1; i < sortedTx.length; i++) {
    const timeDiff = (new Date(sortedTx[i].timestamp) - new Date(sortedTx[i-1].timestamp)) / 1000 / 60;
    if (timeDiff < 5) {
      patterns.push(`Rapid transactions detected (${timeDiff.toFixed(1)} minutes apart)`);
      break;
    }
  }

  // Check for round number amounts
  const roundAmounts = transactions.filter(tx => tx.value % 1 === 0 && tx.value > 0);
  if (roundAmounts.length > transactions.length * 0.5) {
    patterns.push('Multiple round-number transactions (possible structuring)');
  }

  // Check for multiple recipients from same sender
  const senderGroups = {};
  transactions.forEach(tx => {
    if (!senderGroups[tx.from]) senderGroups[tx.from] = new Set();
    senderGroups[tx.from].add(tx.to);
  });
  
  Object.entries(senderGroups).forEach(([sender, recipients]) => {
    if (recipients.size > 5) {
      patterns.push(`Wallet ${sender.slice(0, 10)}... sent to ${recipients.size} different addresses (possible fund distribution)`);
    }
  });

  return patterns;
}
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Download, Eye, RefreshCw, Send, 
  CheckCircle, Loader2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import EtherscanImporter from "./EtherscanImporter.jsx";
import DocumentEditor from "./DocumentEditor.jsx";
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [documents, setDocuments] = useState(caseData.case_documents || {});
  const [generationError, setGenerationError] = useState(null);
  
  const queryClient = useQueryClient();

  // Sync documents when caseData changes
  useEffect(() => {
    console.log('[CaseDocuments] Syncing documents from caseData:', caseData.case_documents);
    setDocuments(caseData.case_documents || {});
  }, [caseData.case_documents]);

  // Generate document content based on type
  const generateDocumentContent = useCallback((docType) => {
    console.log(`[Generator] Starting generation for: ${docType}`);
    console.log('[Generator] Case data:', caseData);
    
    const transactions = caseData.imported_transactions || [];
    const wallets = caseData.monitored_wallets || [];
    const scammerInfo = caseData.scammer_info || caseData.suspect_details || {};
    const evidenceFiles = caseData.evidence_files || caseData.evidence_log || [];

    let content;
    
    switch (docType) {
      case 'case_summary':
        content = {
          title: `Case Summary - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_case_summary_${Date.now()}`,
          sections: [
            {
              heading: 'Case Information',
              editable: true,
              content: `Case Number: ${caseData.case_number || 'Pending'}
Case Title: ${caseData.case_title || 'Untitled'}
Status: ${caseData.status || 'New'}
Priority: ${caseData.priority || caseData.case_priority || 'Medium'}
Created: ${caseData.created_date ? new Date(caseData.created_date).toLocaleString() : 'N/A'}
Last Activity: ${caseData.last_activity ? new Date(caseData.last_activity).toLocaleString() : 'N/A'}`
            },
            {
              heading: 'Victim Information',
              editable: true,
              content: `Name: ${caseData.victim_name || '[Enter Name]'}
Email: ${caseData.victim_email || '[Enter Email]'}
Phone: ${caseData.victim_phone || '[Enter Phone]'}`
            },
            {
              heading: 'Financial Summary',
              editable: true,
              content: `Amount Stolen: $${(caseData.amount_stolen_usd || 0).toLocaleString()} USD
Cryptocurrency: ${caseData.cryptocurrency || 'N/A'}
Blockchain: ${caseData.blockchain || 'N/A'}
Amount Recovered: $${(caseData.recovery_amount || 0).toLocaleString()} USD`
            },
            {
              heading: 'Incident Details',
              editable: true,
              content: `Fraud Type: ${(caseData.fraud_type || 'unknown').replace(/_/g, ' ').toUpperCase()}
Incident Date: ${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : '[Enter Date]'}
Description: ${caseData.description || '[Enter detailed description of the incident]'}`
            }
          ]
        };
        break;

      case 'victim_statement':
        content = {
          title: `Victim Statement - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_victim_statement_${Date.now()}`,
          sections: [
            {
              heading: 'Declaration',
              editable: true,
              content: `I, ${caseData.victim_name || '[VICTIM NAME]'}, hereby declare the following statement to be true and accurate to the best of my knowledge:

On or about ${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : '[DATE]'}, I became a victim of ${(caseData.fraud_type || 'fraud').replace(/_/g, ' ')} resulting in a financial loss of approximately $${(caseData.amount_stolen_usd || 0).toLocaleString()} USD.

${caseData.description || '[Provide a detailed description of what happened, how you were contacted, what was promised, and how the fraud occurred]'}`
            },
            {
              heading: 'Contact Information',
              editable: true,
              content: `Full Name: ${caseData.victim_name || '[Enter Full Name]'}
Email Address: ${caseData.victim_email || '[Enter Email]'}
Phone Number: ${caseData.victim_phone || '[Enter Phone]'}
Address: ${caseData.victim_contact_info?.address || '[Enter Address]'}`
            },
            {
              heading: 'Acknowledgment',
              editable: true,
              content: `I understand that filing a false statement is a criminal offense. I certify under penalty of perjury that the foregoing is true and correct.

Signature: _______________________
Date: ${new Date().toLocaleDateString()}`
            }
          ]
        };
        break;

      case 'transaction_log':
        content = {
          title: `Transaction Log - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_transaction_log_${Date.now()}`,
          transactions: transactions,
          sections: [
            {
              heading: 'Transaction Summary',
              editable: true,
              content: `Total Transactions: ${transactions.length}
Total Value: $${transactions.reduce((sum, tx) => sum + (parseFloat(tx.value_usd) || 0), 0).toLocaleString()} USD
Date Range: ${transactions.length > 0 ? 
  `${new Date(transactions[transactions.length - 1]?.timestamp || Date.now()).toLocaleDateString()} - ${new Date(transactions[0]?.timestamp || Date.now()).toLocaleDateString()}` : 
  'No transactions imported'}`
            },
            {
              heading: 'Transaction Details',
              editable: true,
              content: transactions.length > 0 
                ? transactions.map((tx, i) => `${i + 1}. Hash: ${tx.hash || 'N/A'}
   From: ${tx.from || 'N/A'}
   To: ${tx.to || 'N/A'}
   Value: ${tx.value || 0} ${tx.token || 'ETH'} ($${(tx.value_usd || 0).toFixed(2)} USD)
   Time: ${tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
   Status: ${tx.status || 'Confirmed'}`).join('\n\n')
                : '⚠️ NO TRANSACTIONS IMPORTED\n\nUse the "Etherscan Import" tab to import transactions from a CSV file.'
            }
          ]
        };
        break;

      case 'transaction_analysis':
        const uniqueFrom = [...new Set(transactions.map(tx => tx.from).filter(Boolean))];
        const uniqueTo = [...new Set(transactions.map(tx => tx.to).filter(Boolean))];
        const patterns = [];
        
        if (transactions.length > 0) {
          const sorted = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          for (let i = 1; i < sorted.length; i++) {
            const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / 1000 / 60;
            if (diff < 5) {
              patterns.push(`Rapid transactions detected (${diff.toFixed(1)} min apart)`);
              break;
            }
          }
          const roundAmounts = transactions.filter(tx => parseFloat(tx.value) % 1 === 0);
          if (roundAmounts.length > transactions.length * 0.5) {
            patterns.push('Multiple round-number transactions (possible structuring)');
          }
        }

        content = {
          title: `Transaction Analysis - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_transaction_analysis_${Date.now()}`,
          sections: [
            {
              heading: 'Wallet Analysis',
              editable: true,
              content: `Unique Sending Addresses: ${uniqueFrom.length}
Unique Receiving Addresses: ${uniqueTo.length}
Total Wallets Involved: ${new Set([...uniqueFrom, ...uniqueTo]).size}`
            },
            {
              heading: 'Suspicious Patterns Detected',
              editable: true,
              content: patterns.length > 0 
                ? patterns.map(p => `• ${p}`).join('\n')
                : 'No suspicious patterns detected (or no transactions to analyze)'
            },
            {
              heading: 'Monitored Wallet Addresses',
              editable: true,
              content: wallets.length > 0 
                ? wallets.map((w, i) => `${i + 1}. ${w}`).join('\n')
                : 'No wallet addresses being monitored'
            }
          ]
        };
        break;

      case 'scammer_profile':
        content = {
          title: `Scammer Profile - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_scammer_profile_${Date.now()}`,
          sections: [
            {
              heading: 'Suspect Information',
              editable: true,
              content: `Name/Alias: ${scammerInfo.name || scammerInfo.primary_suspect?.name || '[Unknown]'}
Email: ${scammerInfo.email || scammerInfo.primary_suspect?.email || '[Unknown]'}
Phone: ${scammerInfo.phone || scammerInfo.primary_suspect?.phone || '[Unknown]'}
Website: ${scammerInfo.website || '[N/A]'}
Location: ${scammerInfo.location || scammerInfo.primary_suspect?.location || '[Unknown]'}`
            },
            {
              heading: 'Associated Wallet Addresses',
              editable: true,
              content: (scammerInfo.wallet_addresses || wallets || []).length > 0
                ? (scammerInfo.wallet_addresses || wallets).map((w, i) => `${i + 1}. ${w}`).join('\n')
                : 'No wallet addresses recorded - add suspected scammer wallets here'
            },
            {
              heading: 'Social Media / Online Presence',
              editable: true,
              content: (scammerInfo.social_media || []).length > 0
                ? scammerInfo.social_media.map(s => typeof s === 'string' ? `• ${s}` : `• ${s.platform}: ${s.url || s.profile}`).join('\n')
                : 'No social media profiles recorded'
            }
          ]
        };
        break;

      case 'evidence_package':
        content = {
          title: `Evidence Package - ${caseData.case_number || 'NEW'}`,
          document_id: `${caseData.id}_evidence_package_${Date.now()}`,
          evidence_files: evidenceFiles,
          sections: [
            {
              heading: 'Case Overview',
              editable: true,
              content: `Case: ${caseData.case_title || 'Untitled'}
Case Number: ${caseData.case_number || 'Pending'}
Victim: ${caseData.victim_name || '[Name]'}
Amount: $${(caseData.amount_stolen_usd || 0).toLocaleString()} USD
Status: ${caseData.status || 'New'}`
            },
            {
              heading: 'Evidence Items',
              editable: true,
              content: evidenceFiles.length > 0
                ? evidenceFiles.map((e, i) => `${i + 1}. ${e.description || e.name || 'Unnamed'}
   Type: ${e.evidence_type || e.type || 'Document'}
   Date: ${e.timestamp || e.uploaded_date ? new Date(e.timestamp || e.uploaded_date).toLocaleString() : 'N/A'}
   Verified: ${e.verified ? 'Yes' : 'Pending'}`).join('\n\n')
                : 'No evidence files uploaded yet.\n\nUpload evidence files in the Case Details > Evidence tab.'
            },
            {
              heading: 'Chain of Custody',
              editable: true,
              content: `Evidence collected and maintained by SafeNestt Investigation System.
All files are timestamped and logged for legal integrity.
Case created: ${caseData.created_date ? new Date(caseData.created_date).toLocaleString() : 'N/A'}
Last updated: ${caseData.last_activity ? new Date(caseData.last_activity).toLocaleString() : 'N/A'}`
            }
          ]
        };
        break;

      default:
        content = { 
          title: 'Unknown Document', 
          document_id: `${caseData.id}_unknown_${Date.now()}`,
          sections: [{ heading: 'Error', content: 'Unknown document type', editable: false }] 
        };
    }

    console.log(`[Generator] Generated content for ${docType}:`, content);
    return content;
  }, [caseData]);

  // Main generate function - generates and opens editor
  const handleGenerate = async (docType, event) => {
    if (event) event.stopPropagation();
    
    console.log(`[Generate] Button clicked for: ${docType}`);
    console.log(`[Generate] Current case ID: ${caseData.id}`);
    
    setGenerationError(null);
    setGenerating(docType);

    try {
      // Step 1: Generate the document content
      console.log('[Generate] Step 1: Generating content...');
      const content = generateDocumentContent(docType);
      
      if (!content || !content.sections || content.sections.length === 0) {
        throw new Error('Generator returned empty content');
      }

      console.log(`[Generate] Step 2: Content generated with ${content.sections.length} sections`);
      console.log(`[Generate] Document ID: ${content.document_id}`);

      // Step 2: Create document record
      const newDoc = {
        content: content,
        generated_at: new Date().toISOString(),
        status: 'generated',
        document_id: content.document_id
      };

      // Step 3: Update local state immediately
      const updatedDocs = { ...documents, [docType]: newDoc };
      setDocuments(updatedDocs);
      console.log('[Generate] Step 3: Local state updated');

      // Step 4: Persist to database
      console.log('[Generate] Step 4: Saving to database...');
      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: updatedDocs,
        last_activity: new Date().toISOString()
      });
      console.log('[Generate] Step 5: Database updated successfully');

      // Step 5: Open the editor
      console.log('[Generate] Step 6: Opening editor...');
      setSelectedDocType(docType);
      setEditorOpen(true);
      
      toast.success(`${DOCUMENT_TYPES.find(d => d.id === docType)?.name} generated - Editor opened`);
      
      // Refresh parent
      if (onUpdate) onUpdate();
      
      return newDoc;

    } catch (error) {
      console.error('[Generate] ERROR:', error);
      setGenerationError(error.message);
      toast.error(`Generation failed: ${error.message}`, {
        duration: 10000,
        action: {
          label: 'Retry',
          onClick: () => handleGenerate(docType)
        }
      });
      return null;
    } finally {
      setGenerating(null);
    }
  };

  // Generate all documents
  const handleGenerateAll = async () => {
    console.log('[GenerateAll] Starting bulk generation...');
    setGeneratingAll(true);
    setGenerationError(null);
    
    const errors = [];
    const newDocs = { ...documents };

    for (const docType of DOCUMENT_TYPES) {
      try {
        console.log(`[GenerateAll] Generating: ${docType.id}`);
        const content = generateDocumentContent(docType.id);
        newDocs[docType.id] = {
          content,
          generated_at: new Date().toISOString(),
          status: 'generated',
          document_id: content.document_id
        };
        setDocuments({ ...newDocs });
      } catch (err) {
        console.error(`[GenerateAll] Error for ${docType.id}:`, err);
        errors.push(docType.name);
      }
    }

    try {
      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: newDocs,
        last_activity: new Date().toISOString()
      });
      
      if (errors.length > 0) {
        toast.warning(`Generated with ${errors.length} error(s)`);
      } else {
        toast.success('All documents generated!');
      }
      
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to save documents');
    }

    setGeneratingAll(false);
  };

  // Open existing document in editor
  const handleOpenEditor = (docType, event) => {
    if (event) event.stopPropagation();
    console.log(`[OpenEditor] Opening: ${docType}`);
    
    const doc = documents[docType];
    if (!doc || !doc.content) {
      toast.error('Document not generated. Click Generate first.');
      return;
    }
    
    setSelectedDocType(docType);
    setEditorOpen(true);
  };

  // Handle document save from editor
  const handleDocumentSave = async (docType, updatedContent) => {
    console.log(`[Save] Saving document: ${docType}`);
    
    const updatedDocs = {
      ...documents,
      [docType]: {
        ...documents[docType],
        content: updatedContent,
        last_edited: new Date().toISOString()
      }
    };

    setDocuments(updatedDocs);

    await base44.entities.InvestigationCase.update(caseData.id, {
      case_documents: updatedDocs,
      last_activity: new Date().toISOString()
    });

    if (onUpdate) onUpdate();
    toast.success('Document saved');
  };

  // Handle transactions imported
  const handleTransactionsImported = async (transactions) => {
    console.log(`[Import] Received ${transactions.length} transactions`);
    
    const timeline = caseData.timeline || [];
    const existingHashes = new Set(timeline.map(t => t.tx_hash).filter(Boolean));
    
    const newEvents = transactions
      .filter(tx => !existingHashes.has(tx.hash))
      .map(tx => ({
        date: tx.timestamp,
        event: `Transaction: ${tx.from?.slice(0,8)}... → ${tx.to?.slice(0,8)}...`,
        details: `${tx.value} ${tx.token || 'ETH'}`,
        tx_hash: tx.hash,
        type: 'transaction'
      }));

    const walletAddresses = new Set([
      ...(caseData.monitored_wallets || []),
      ...transactions.map(tx => tx.from).filter(Boolean),
      ...transactions.map(tx => tx.to).filter(Boolean)
    ]);

    await base44.entities.InvestigationCase.update(caseData.id, {
      timeline: [...timeline, ...newEvents],
      imported_transactions: transactions,
      monitored_wallets: Array.from(walletAddresses),
      last_activity: new Date().toISOString()
    });

    // Auto-regenerate transaction documents
    const txLogContent = generateDocumentContent('transaction_log');
    const txAnalysisContent = generateDocumentContent('transaction_analysis');
    
    const updatedDocs = {
      ...documents,
      transaction_log: { content: txLogContent, generated_at: new Date().toISOString(), status: 'generated', document_id: txLogContent.document_id },
      transaction_analysis: { content: txAnalysisContent, generated_at: new Date().toISOString(), status: 'generated', document_id: txAnalysisContent.document_id }
    };

    setDocuments(updatedDocs);
    
    await base44.entities.InvestigationCase.update(caseData.id, {
      case_documents: updatedDocs
    });

    if (onUpdate) onUpdate();
    toast.success(`${transactions.length} transactions imported. Documents updated.`);
  };

  const getDocStatus = (docType) => {
    const doc = documents[docType];
    return doc?.content?.sections?.length > 0 ? 'generated' : 'not_generated';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-cyan-400" />
          Case Documents
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateAll}
            disabled={generatingAll || generating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            {generatingAll ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating All...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Generate All Documents</>
            )}
          </Button>
          <Button
            onClick={() => setSubmissionOpen(true)}
            className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit to Authorities
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {generationError && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold">Generation Error</p>
            <p className="text-gray-300 text-sm">{generationError}</p>
            <p className="text-gray-500 text-xs mt-1">Check browser console for details</p>
          </div>
        </div>
      )}

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
              const isGenerating = generating === docType.id;
              const Icon = docType.icon;

              return (
                <Card 
                  key={docType.id} 
                  className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <Badge className={status === 'generated' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      }>
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
                            onClick={(e) => handleOpenEditor(docType.id, e)}
                            className="flex-1 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View & Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => handleGenerate(docType.id, e)}
                            disabled={isGenerating || generatingAll}
                            className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                            title="Regenerate"
                          >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={(e) => handleGenerate(docType.id, e)}
                          disabled={isGenerating || generatingAll}
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
                        >
                          {isGenerating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                          ) : (
                            <>Generate Document</>
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

      {/* Document Editor Dialog */}
      {editorOpen && selectedDocType && documents[selectedDocType]?.content && (
        <DocumentEditor
          caseData={caseData}
          documentType={selectedDocType}
          document={documents[selectedDocType]}
          documentName={DOCUMENT_TYPES.find(d => d.id === selectedDocType)?.name || 'Document'}
          onClose={() => {
            setEditorOpen(false);
            setSelectedDocType(null);
          }}
          onSave={(updatedContent) => handleDocumentSave(selectedDocType, updatedContent)}
          onSubmit={() => {
            setEditorOpen(false);
            setSelectedDocType(null);
            setSubmissionOpen(true);
          }}
        />
      )}

      {/* Federal Submission Dialog */}
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
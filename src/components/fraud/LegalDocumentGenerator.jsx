import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Loader2, CheckCircle, Scale } from "lucide-react";
import { toast } from "sonner";

export default function LegalDocumentGenerator({ selectedCase }) {
  const [generating, setGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([
    "ic3_complaint",
    "police_report",
    "exchange_notice"
  ]);

  const documentTypes = [
    {
      id: "ic3_complaint",
      name: "FBI IC3 Complaint",
      description: "Official complaint form for FBI Internet Crime Complaint Center",
      agency: "FBI IC3"
    },
    {
      id: "police_report",
      name: "Police Report Template",
      description: "Detailed incident report for local law enforcement",
      agency: "Local Police"
    },
    {
      id: "exchange_notice",
      name: "Exchange Fraud Notice",
      description: "Formal notice to cryptocurrency exchanges about stolen funds",
      agency: "Crypto Exchanges"
    },
    {
      id: "attorney_brief",
      name: "Legal Brief",
      description: "Comprehensive legal document for attorney consultation",
      agency: "Legal Counsel"
    },
    {
      id: "affidavit",
      name: "Affidavit of Fraud",
      description: "Sworn statement detailing the fraudulent activity",
      agency: "Court Filing"
    },
    {
      id: "recovery_demand",
      name: "Asset Recovery Demand Letter",
      description: "Formal demand letter for return of stolen assets",
      agency: "Scammer/Exchanges"
    },
    {
      id: "subpoena",
      name: "Subpoena",
      description: "Generate subpoena for ISP or Exchange records",
      agency: "Court"
    },
    {
      id: "evidence_req",
      name: "Evidence Request",
      description: "Formal request for preservation of evidence",
      agency: "Service Providers"
    },
    {
      id: "case_file_req",
      name: "Request New Case File",
      description: "Generate full case file request package",
      agency: "Internal"
    }
  ];

  const toggleDocument = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const generateDocuments = async () => {
    if (!selectedCase) {
      toast.error("Please select a case first");
      return;
    }

    if (selectedDocs.length === 0) {
      toast.error("Please select at least one document type");
      return;
    }

    setGenerating(true);
    const generated = [];

    try {
      for (const docType of selectedDocs) {
        const doc = documentTypes.find(d => d.id === docType);
        
        // Generate document using AI
        const prompt = `Generate a professional ${doc.name} for a cryptocurrency fraud case:

Case Details:
- Title: ${selectedCase.case_title}
- Fraud Type: ${selectedCase.fraud_type}
- Amount Stolen: $${selectedCase.amount_stolen_usd} in ${selectedCase.cryptocurrency || 'crypto'}
- Blockchain: ${selectedCase.blockchain}
- Incident Date: ${selectedCase.incident_date || 'Unknown'}
- Scammer Wallet: ${selectedCase.scammer_wallet}
- Description: ${selectedCase.description}

Generate a complete, ready-to-file legal document with all necessary sections and proper formatting.`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt
        });

        generated.push({
          id: docType,
          name: doc.name,
          agency: doc.agency,
          content: response,
          generated_date: new Date().toISOString()
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setGeneratedDocs(generated);
      toast.success(`Generated ${generated.length} legal documents!`);
    } catch (error) {
      toast.error("Failed to generate documents: " + error.message);
    }

    setGenerating(false);
  };

  const downloadDocument = (doc) => {
    const blob = new Blob([doc.content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.id}_${selectedCase.case_title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("Document downloaded");
  };

  const downloadAllDocuments = async () => {
    for (const doc of generatedDocs) {
      downloadDocument(doc);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            Legal Document Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCase && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-gray-400 mb-1">Generating for:</p>
              <p className="text-white font-semibold">{selectedCase.case_title}</p>
              <p className="text-sm text-gray-400 mt-1">
                ${selectedCase.amount_stolen_usd?.toLocaleString()} • {selectedCase.blockchain}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Select Documents to Generate:</h4>
            <div className="space-y-2">
              {documentTypes.map(doc => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedDocs.includes(doc.id)
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "bg-[#0f1419] border-gray-700/30 hover:border-blue-500/20"
                  }`}
                  onClick={() => toggleDocument(doc.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => toggleDocument(doc.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-medium text-sm">{doc.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {doc.agency}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{doc.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generateDocuments}
              disabled={!selectedCase || generating || selectedDocs.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating {selectedDocs.length} documents...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Documents
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                 // Download All Blank Templates
                 const content = documentTypes.map(d => 
                   `TEMPLATE: ${d.name.toUpperCase()}\nAGENCY: ${d.agency}\nDESCRIPTION: ${d.description}\n\n[Enter Date]\n[Enter Case Number]\n\nTo Whom It May Concern,\n\n[Insert Body Content Here]\n\nSincerely,\n[Your Name]\n\n`
                 ).join('====================================\n\n');

                 const blob = new Blob([content], { type: "text/plain" });
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement("a");
                 a.href = url;
                 a.download = "Legal_Templates_Blank.txt";
                 document.body.appendChild(a);
                 a.click();
                 window.URL.revokeObjectURL(url);
                 a.remove();
                 toast.success("Templates package downloaded");
              }}
              variant="outline"
              className="border-blue-500/30 text-blue-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Documents */}
      {generatedDocs.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Generated Documents ({generatedDocs.length})
              </CardTitle>
              <Button
                onClick={downloadAllDocuments}
                size="sm"
                className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatedDocs.map(doc => (
              <div key={doc.id} className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-green-400" />
                      <h4 className="text-white font-semibold text-sm">{doc.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{doc.agency}</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(doc.generated_date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadDocument(doc)}
                    size="sm"
                    variant="outline"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="mt-3 p-3 bg-[#1a2332] rounded border border-green-500/10 max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-4">
                    {doc.content.substring(0, 300)}...
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
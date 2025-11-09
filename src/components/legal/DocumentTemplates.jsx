import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DocumentTemplates({ properties, alerts, selectedProperty }) {
  const [generating, setGenerating] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('dispute_notice');
  const [selectedPropertyId, setSelectedPropertyId] = useState(selectedProperty?.id || '');

  const queryClient = useQueryClient();

  const TEMPLATES = {
    dispute_notice: {
      name: 'Property Title Dispute Notice',
      description: 'Formal notice to dispute an unauthorized property filing',
      icon: '📋'
    },
    cease_desist: {
      name: 'Cease and Desist Letter',
      description: 'Legal demand to stop fraudulent activity immediately',
      icon: '🛑'
    },
    affidavit: {
      name: 'Affidavit of Ownership',
      description: 'Sworn statement of property ownership',
      icon: '✍️'
    },
    police_report: {
      name: 'Deed Fraud Police Report',
      description: 'Template for filing a police report for deed theft',
      icon: '🚔'
    },
    title_claim: {
      name: 'Title Insurance Claim',
      description: 'File a claim with your title insurance company',
      icon: '🛡️'
    },
    court_complaint: {
      name: 'Court Complaint Filing',
      description: 'Legal complaint for title fraud litigation',
      icon: '⚖️'
    }
  };

  const generateTemplateMutation = useMutation({
    mutationFn: async ({ templateType, propertyId }) => {
      setGenerating(templateType);

      const property = properties.find(p => p.id === propertyId);
      const user = await base44.auth.me();
      const propertyAlerts = alerts.filter(a => a.property_id === propertyId && a.status === 'new');

      // Generate document content with AI
      const documentContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a ${TEMPLATES[templateType].name} for property title fraud case.

Property Owner: ${user.full_name}
Email: ${user.email}
Property Address: ${property.address}
Borough: ${property.borough}
BBL: ${property.borough_block_lot}

${propertyAlerts.length > 0 ? `
Recent Suspicious Activity:
${propertyAlerts.map(a => `- ${a.filing_type} filed by ${a.filing_party} on ${a.filing_date}`).join('\n')}
` : ''}

Generate a complete, legally-formatted ${TEMPLATES[templateType].name} in markdown format.
Include:
- Proper legal formatting and headers
- All necessary sections and clauses
- Blank spaces for signatures and dates
- Professional legal language
- NYC-specific references where applicable

Return the complete document as markdown text.`,
        add_context_from_internet: true
      });

      // Upload generated document
      const blob = new Blob([documentContent], { type: 'text/markdown' });
      const file = new File([blob], `${templateType}_${property.borough_block_lot}.md`, { type: 'text/markdown' });

      const uploadResult = await base44.integrations.Core.UploadPrivateFile({
        file: file
      });

      // Create legal document record
      const doc = await base44.entities.LegalDocument.create({
        property_id: propertyId,
        document_type: templateType === 'dispute_notice' ? 'dispute_notice' :
                       templateType === 'cease_desist' ? 'cease_and_desist' :
                       templateType === 'affidavit' ? 'affidavit' :
                       templateType === 'police_report' ? 'police_report' :
                       templateType === 'title_claim' ? 'title_insurance_claim' :
                       'court_filing',
        document_name: `${TEMPLATES[templateType].name} - ${property.address}`,
        encrypted_file_uri: uploadResult.file_uri,
        file_size_bytes: blob.size,
        file_extension: 'md',
        template_generated: true,
        template_type: templateType,
        status: 'draft',
        tags: ['template', 'generated', templateType]
      });

      // Create legal action
      await base44.entities.LegalAction.create({
        property_id: propertyId,
        action_type: 'document_sent',
        action_date: new Date().toISOString(),
        description: `Generated ${TEMPLATES[templateType].name} for ${property.address}`,
        status: 'pending',
        associated_documents: [doc.id],
        priority: 'medium'
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: `Legal document template generated: ${TEMPLATES[templateType].name}`,
        metadata: {
          property_id: propertyId,
          document_id: doc.id,
          template_type: templateType
        },
        severity: 'info',
        status: 'success'
      });

      setGenerating(null);
      return { doc, content: documentContent };
    },
    onSuccess: ({ doc, content }) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-actions'] });
      
      // Download the document
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name + '.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('✅ Document generated and downloaded!');
    },
    onError: () => {
      setGenerating(null);
      toast.error('Failed to generate document template');
    }
  });

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Generate Legal Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Select Property</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="Choose property..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Select Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {Object.entries(TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.icon} {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-sm">
                <strong>{TEMPLATES[selectedTemplate].name}</strong>
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {TEMPLATES[selectedTemplate].description}
              </p>
            </div>
          )}

          <Button
            onClick={() => generateTemplateMutation.mutate({ 
              templateType: selectedTemplate, 
              propertyId: selectedPropertyId 
            })}
            disabled={!selectedPropertyId || generating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {generating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Generating Document...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate & Download
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Available Templates Grid */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Available Document Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedTemplate === key
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-cyan-500/10 bg-[#0f1419] hover:border-cyan-500/30'
                }`}
                onClick={() => setSelectedTemplate(key)}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <h3 className="text-white font-bold text-sm mb-1">{template.name}</h3>
                <p className="text-gray-400 text-xs">{template.description}</p>
                {selectedTemplate === key && (
                  <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-purple-500/50 border">
                    Selected
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <p className="text-cyan-300 text-sm">
            <strong>💡 Note:</strong> All documents are AI-generated templates customized for your specific property and situation. 
            Review carefully and consult with a licensed attorney before filing any legal documents.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
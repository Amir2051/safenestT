import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Globe, ChevronRight, FileText } from "lucide-react";
import AgencyDetailDialog from "./AgencyDetailDialog.jsx";

export default function RecommendedAgencies({ caseData }) {
  const [selectedAgency, setSelectedAgency] = useState(null);

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.filter({ status: 'active' }),
    initialData: [],
  });

  // Get fraud type and match with agencies
  const fraudType = caseData.fraud_type;
  
  const recommendedAgencies = agencies.filter(agency => {
    if (!agency.related_case_types || agency.related_case_types.length === 0) return false;
    return agency.related_case_types.some(type => 
      type.toLowerCase().includes(fraudType?.toLowerCase()) ||
      fraudType?.toLowerCase().includes(type.toLowerCase())
    );
  });

  // Always show these core agencies for fraud cases
  const coreAgencyNames = ['FBI', 'IC3', 'FTC'];
  const coreAgencies = agencies.filter(agency => 
    coreAgencyNames.some(name => agency.agency_name?.includes(name))
  );

  const finalRecommended = [...new Map(
    [...recommendedAgencies, ...coreAgencies].map(item => [item.id, item])
  ).values()].slice(0, 6);

  const getCategoryColor = (category) => {
    const colors = {
      federal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      state: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      local: 'bg-green-500/20 text-green-400 border-green-500/50',
      international: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  if (finalRecommended.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            Recommended Agencies for This Case
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {finalRecommended.map((agency) => (
            <div
              key={agency.id}
              className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer"
              onClick={() => setSelectedAgency(agency)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white font-semibold">{agency.agency_name}</h4>
                    <Badge className={getCategoryColor(agency.category)}>
                      {agency.category}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {agency.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3 h-3 text-cyan-400" />
                        <span className="text-gray-300">{agency.phone}</span>
                      </div>
                    )}
                    {agency.submission_portal && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span className="text-gray-300">Online submission available</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              </div>
            </div>
          ))}

          <Button 
            variant="outline" 
            className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => window.open('/AgenciesDirectory', '_self')}
          >
            <FileText className="w-4 h-4 mr-2" />
            View All Agencies
          </Button>
        </CardContent>
      </Card>

      {selectedAgency && (
        <AgencyDetailDialog
          agency={selectedAgency}
          caseData={caseData}
          onClose={() => setSelectedAgency(null)}
        />
      )}
    </>
  );
}
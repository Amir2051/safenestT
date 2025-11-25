import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Search, Shield, ExternalLink, 
  Wallet, Globe, Calendar, DollarSign, Eye
} from "lucide-react";

export default function ReportedScams() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);

  const { data: scamDatabase = [], isLoading } = useQuery({
    queryKey: ['scam-database'],
    queryFn: () => base44.entities.ScamDatabase.list('-created_date', 200),
    initialData: [],
  });

  // Only show ScamDatabase entries on Reported Scams page
  const uniqueScams = scamDatabase.map(s => ({
    id: s.id,
    type: 'scam',
    identifier: s.identifier,
    scam_type: s.scam_type,
    blockchain: s.blockchain,
    risk_level: s.risk_level || 'medium',
    description: s.scam_description,
    victim_count: s.victim_count || 1,
    total_stolen_usd: s.total_stolen_usd || 0,
    first_reported: s.first_reported || s.created_date,
    verified: s.verified,
    status: s.status
  }));

  const filteredScams = uniqueScams.filter(scam => 
    scam.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scam.case_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskColor = (level) => {
    switch(level) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'wallet': return <Wallet className="w-5 h-5" />;
      case 'website': return <Globe className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          Reported Scams Database
        </h1>
        <p className="text-gray-400 mt-1">
          Community-verified scams and fraud reports. Help protect others by staying informed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{uniqueScams.length}</p>
            <p className="text-xs text-gray-400">Reported Scams</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-400">
              {uniqueScams.filter(s => s.risk_level === 'critical' || s.risk_level === 'high').length}
            </p>
            <p className="text-xs text-gray-400">High Risk</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">
              {uniqueScams.reduce((sum, s) => sum + (s.victim_count || 0), 0)}
            </p>
            <p className="text-xs text-gray-400">Reported Victims</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">
              ${(uniqueScams.reduce((sum, s) => sum + (s.total_stolen_usd || 0), 0) / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-gray-400">Total Stolen</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by wallet address, website, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0f1419] border-cyan-500/30 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm">
            <strong>Stay Safe:</strong> Always verify addresses before sending crypto. If you recognize a scam not listed here, report it to help protect the community.
          </p>
        </CardContent>
      </Card>

      {/* Scam List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">All Reported Scams ({filteredScams.length})</h2>
        
        {filteredScams.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No scams found matching your search</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredScams.map((scam) => (
              <Card 
                key={scam.id} 
                className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20 hover:border-red-500/40 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getRiskColor(scam.risk_level)}`}>
                        {getTypeIcon(scam.scam_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={getRiskColor(scam.risk_level)}>
                            {scam.risk_level?.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {scam.scam_type?.replace('_', ' ')}
                          </Badge>
                          {scam.blockchain && scam.blockchain !== 'n/a' && (
                            <Badge variant="outline" className="text-cyan-400 border-cyan-500/50">
                              {scam.blockchain}
                            </Badge>
                          )}
                          {scam.verified && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              VERIFIED
                            </Badge>
                          )}
                          {scam.case_title && (
                            <Badge variant="outline" className="text-purple-400 border-purple-500/50">
                              Case
                            </Badge>
                          )}
                        </div>
                        {scam.case_title && (
                          <p className="text-purple-300 text-sm font-semibold mb-1">{scam.case_title}</p>
                        )}
                        <p className="text-white font-mono text-sm break-all mb-2">
                          {scam.identifier}
                        </p>
                        {scam.description && (
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {scam.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {scam.victim_count > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {scam.victim_count} victims
                            </span>
                          )}
                          {scam.total_stolen_usd > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${scam.total_stolen_usd.toLocaleString()} stolen
                            </span>
                          )}
                          {scam.first_reported && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(scam.first_reported).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedCase(scam)}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCase(null)}>
          <Card className="bg-[#1a2332] border-cyan-500/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-cyan-500/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Scam Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCase(null)} className="text-gray-400 hover:text-white hover:bg-gray-700">
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getRiskColor(selectedCase.risk_level)}>
                  {selectedCase.risk_level?.toUpperCase()} RISK
                </Badge>
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  {selectedCase.scam_type?.replace('_', ' ')}
                </Badge>
                {selectedCase.verified ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    VERIFIED
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    REPORTED
                  </Badge>
                )}
              </div>

              {selectedCase.case_title && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Case Title</p>
                  <p className="text-purple-300 font-semibold">{selectedCase.case_title}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-1">Identifier</p>
                <p className="text-white font-mono text-sm break-all bg-[#0f1419] p-3 rounded-lg">
                  {selectedCase.identifier}
                </p>
              </div>

              {selectedCase.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Description</p>
                  <p className="text-gray-300 text-sm">{selectedCase.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedCase.blockchain && selectedCase.blockchain !== 'n/a' && (
                  <div className="p-3 bg-[#0f1419] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Blockchain</p>
                    <p className="text-white capitalize">{selectedCase.blockchain}</p>
                  </div>
                )}
                {selectedCase.victim_count > 0 && (
                  <div className="p-3 bg-[#0f1419] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Reported Victims</p>
                    <p className="text-red-400 font-bold">{selectedCase.victim_count}</p>
                  </div>
                )}
                {selectedCase.total_stolen_usd > 0 && (
                  <div className="p-3 bg-[#0f1419] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Total Stolen</p>
                    <p className="text-red-400 font-bold">${selectedCase.total_stolen_usd.toLocaleString()}</p>
                  </div>
                )}
                {selectedCase.first_reported && (
                  <div className="p-3 bg-[#0f1419] rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">First Reported</p>
                    <p className="text-white">{new Date(selectedCase.first_reported).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm font-semibold mb-1">⚠️ Warning</p>
                <p className="text-gray-300 text-xs">
                  Do not interact with this address/website. If you have been affected, report to local authorities and file a complaint with the FBI's IC3.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
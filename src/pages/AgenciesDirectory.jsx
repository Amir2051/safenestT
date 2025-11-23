import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, Building2, Globe, Phone, Mail, MapPin, 
  ChevronRight, Shield, FileText, Landmark, Flag
} from "lucide-react";
import AgencyDetailDialog from "../components/investigation/AgencyDetailDialog.jsx";

export default function AgenciesDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAgency, setSelectedAgency] = useState(null);

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => base44.entities.Agency.filter({ status: 'active' }, '-priority'),
    initialData: [],
  });

  const categories = [
    { id: 'all', label: 'All Agencies', icon: Building2, color: 'cyan' },
    { id: 'federal', label: 'Federal', icon: Landmark, color: 'blue' },
    { id: 'state', label: 'State', icon: Flag, color: 'purple' },
    { id: 'local', label: 'Local', icon: Shield, color: 'green' },
    { id: 'international', label: 'International', icon: Globe, color: 'orange' }
  ];

  const filteredAgencies = agencies.filter(agency => {
    const matchesSearch = agency.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agency.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || agency.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedAgencies = categories
    .filter(cat => cat.id !== 'all')
    .map(cat => ({
      ...cat,
      agencies: filteredAgencies.filter(a => a.category === cat.id)
    }))
    .filter(group => group.agencies.length > 0);

  const getCategoryColor = (category) => {
    const colors = {
      federal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      state: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      local: 'bg-green-500/20 text-green-400 border-green-500/50',
      international: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
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
        <h1 className="text-3xl font-bold text-white mb-2">Law Enforcement Directory</h1>
        <p className="text-gray-400">Access contact information for federal, state, and local agencies</p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agencies..."
              className="pl-10 bg-[#0f1419] border-cyan-500/30 text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  className={selectedCategory === cat.id 
                    ? `bg-${cat.color}-500/20 border-${cat.color}-500/50 text-${cat.color}-400 hover:bg-${cat.color}-500/30`
                    : 'border-cyan-500/30 text-gray-300 hover:bg-cyan-500/10'
                  }
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-400">
          Showing <span className="text-white font-semibold">{filteredAgencies.length}</span> {filteredAgencies.length === 1 ? 'agency' : 'agencies'}
        </p>
      </div>

      {/* Agencies List - Grouped by Category */}
      <div className="space-y-6">
        {selectedCategory === 'all' ? (
          groupedAgencies.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-6 h-6 text-${group.color}-400`} />
                  <h2 className="text-xl font-bold text-white">{group.label}</h2>
                  <Badge className={`bg-${group.color}-500/20 text-${group.color}-400 border-${group.color}-500/50`}>
                    {group.agencies.length}
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {group.agencies.map((agency) => (
                    <AgencyCard 
                      key={agency.id} 
                      agency={agency} 
                      onSelect={setSelectedAgency}
                      getCategoryColor={getCategoryColor}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid gap-4">
            {filteredAgencies.map((agency) => (
              <AgencyCard 
                key={agency.id} 
                agency={agency} 
                onSelect={setSelectedAgency}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
        )}

        {filteredAgencies.length === 0 && (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No agencies found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Agency Detail Dialog */}
      {selectedAgency && (
        <AgencyDetailDialog
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
        />
      )}
    </div>
  );
}

function AgencyCard({ agency, onSelect, getCategoryColor }) {
  return (
    <Card 
      className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer"
      onClick={() => onSelect(agency)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-white">{agency.agency_name}</h3>
              <Badge className={getCategoryColor(agency.category)}>
                {agency.category}
              </Badge>
            </div>

            <div className="space-y-2">
              {agency.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">{agency.phone}</span>
                </div>
              )}
              {agency.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">{agency.email}</span>
                </div>
              )}
              {agency.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300 truncate">{agency.website}</span>
                </div>
              )}
              {agency.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">{agency.address}</span>
                </div>
              )}
            </div>

            {agency.related_case_types && agency.related_case_types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {agency.related_case_types.slice(0, 3).map((type, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-cyan-500/30 text-cyan-300">
                    {type}
                  </Badge>
                ))}
                {agency.related_case_types.length > 3 && (
                  <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-300">
                    +{agency.related_case_types.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
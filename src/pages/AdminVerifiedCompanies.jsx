import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building, Plus, Search, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import CompanyVerificationForm from "@/components/investment/CompanyVerificationForm";

export default function AdminVerifiedCompanies() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: companies = [], refetch } = useQuery({
    queryKey: ['verified-companies'],
    queryFn: () => base44.entities.VerifiedCompany.list('-created_date')
  });

  const handleEdit = (company) => {
    setEditingCompany(company);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };

  const filteredCompanies = companies.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Verified Active</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pending Review</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Rejected</Badge>;
      case 'suspended': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Suspended</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Company Verification</h1>
          <p className="text-slate-400">Manage verified entities and investment listings</p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Company
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search by name or registration ID..." 
              className="pl-10 bg-slate-950 border-slate-800 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCompanies.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No companies found.</p>
            ) : (
              filteredCompanies.map(company => (
                <div key={company.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.company_name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Building className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{company.company_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{company.industry}</span>
                        <span className="text-slate-700">•</span>
                        <span className="text-xs text-slate-400">{company.registration_number || 'No Reg ID'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(company.verification_status)}
                      <span className="text-xs text-slate-500">
                        {company.is_public ? <span className="flex items-center gap-1 text-green-500"><Eye className="w-3 h-3"/> Visible</span> : "Hidden"}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(company)} className="border-slate-700 text-slate-300 hover:text-white">
                      Manage
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company Verification" : "New Company Verification"}</DialogTitle>
          </DialogHeader>
          <CompanyVerificationForm 
            initialData={editingCompany} 
            onSuccess={handleSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
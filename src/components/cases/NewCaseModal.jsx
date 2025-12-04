import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function NewCaseModal({ onCaseCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    phone_number: "",
    issue_type: "crypto_theft",
    urgency: "Medium",
    description: "",
    amount_lost: ""
  });

  const queryClient = useQueryClient();

  const createCaseMutation = useMutation({
    mutationFn: async (data) => {
      // Use backend function to create case with auto-generated ID
      const response = await base44.functions.invoke('caseManagement', { 
        action: 'create', 
        data: data 
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data.case;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-cases'] });
      toast.success(`Case created: ${data.case_number}`);
      setIsOpen(false);
      setFormData({
        client_name: "",
        client_email: "",
        phone_number: "",
        issue_type: "crypto_theft",
        urgency: "Medium",
        description: "",
        amount_lost: ""
      });

      // Trigger AI Analysis
      if (data && data.id) {
        base44.functions.invoke('casePrioritization', { case_id: data.id })
          .then(() => {
             toast.success("AI Prioritization Complete");
             queryClient.invalidateQueries({ queryKey: ['client-cases'] });
          })
          .catch(err => console.error("AI analysis failed", err));
      }

      if (onCaseCreated) onCaseCreated();
    },
    onError: (error) => {
      toast.error("Failed to create case: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client_name || !formData.issue_type) {
      toast.error("Please fill in required fields");
      return;
    }
    createCaseMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Client Case</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input 
                id="client_name"
                value={formData.client_name}
                onChange={e => setFormData({...formData, client_name: e.target.value})}
                className="bg-[#0f1419] border-gray-600 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_email">Email</Label>
              <Input 
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={e => setFormData({...formData, client_email: e.target.value})}
                className="bg-[#0f1419] border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone</Label>
              <Input 
                id="phone_number"
                value={formData.phone_number}
                onChange={e => setFormData({...formData, phone_number: e.target.value})}
                className="bg-[#0f1419] border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_lost">Amount Lost (USD)</Label>
              <Input 
                id="amount_lost"
                type="number"
                value={formData.amount_lost}
                onChange={e => setFormData({...formData, amount_lost: e.target.value})}
                className="bg-[#0f1419] border-gray-600 text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="issue_type">Issue Type</Label>
              <Select 
                value={formData.issue_type} 
                onValueChange={val => setFormData({...formData, issue_type: val})}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                  <SelectItem value="scam">Scam</SelectItem>
                  <SelectItem value="hacked_account">Hacked Account</SelectItem>
                  <SelectItem value="impersonation_scam">Impersonation</SelectItem>
                  <SelectItem value="recovery_request">Recovery Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select 
                value={formData.urgency} 
                onValueChange={val => setFormData({...formData, urgency: val})}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="bg-[#0f1419] border-gray-600 text-white min-h-[100px]"
              placeholder="Details about the case..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createCaseMutation.isPending}>
              {createCaseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
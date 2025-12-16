import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CreateCaseForUserDialog({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openUserSelect, setOpenUserSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    amount_lost: 0,
    currency_type: 'USD',
    blockchain: 'Ethereum',
    fraud_type: 'Crypto Theft',
    incident_date: '',
    description: '',
    scammer_wallet: '',
    victim_wallet: ''
  });

  // Search users query
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-search-users'],
    queryFn: async () => {
        // We use the adminUserService endpoint to list users
        const res = await base44.functions.invoke('adminUserService', { endpoint: 'list-users' });
        if (res.data.success) {
            return res.data.users.map(u => ({
                id: u.id,
                name: u.full_name || 'Unknown',
                email: u.email
            }));
        }
        return [];
    },
    enabled: isOpen
  });

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
        toast.error("Please select a user first");
        return;
    }

    setLoading(true);
    try {
        const caseData = {
            target_user_id: selectedUser.id,
            target_user_email: selectedUser.email,
            target_user_name: selectedUser.name,
            
            // Financial
            amount_lost: parseFloat(formData.amount_lost) || 0,
            cryptocurrency: formData.currency_type,
            blockchain: formData.blockchain,
            
            // Case
            issue_type: formData.fraud_type.toLowerCase().replace(/ /g, '_'),
            transaction_date: formData.incident_date,
            description: formData.description,
            
            // Wallets
            scammer_wallet: formData.scammer_wallet,
            victim_wallet: formData.victim_wallet,
            scammer_info: {
                wallet_addresses: [formData.scammer_wallet]
            },
            
            // Meta
            status: 'Pending',
            urgency: 'Medium',
            is_admin_created: true
        };

        const response = await base44.functions.invoke('caseManagement', {
            action: 'create_for_user',
            data: caseData
        });

        if (response.data.error) throw new Error(response.data.error);

        toast.success(`Case created successfully for ${selectedUser.email}`);
        onClose();
        
        // Reset form
        setFormData({
            amount_lost: 0,
            currency_type: 'USD',
            blockchain: 'Ethereum',
            fraud_type: 'Crypto Theft',
            incident_date: '',
            description: '',
            scammer_wallet: '',
            victim_wallet: ''
        });
        setSelectedUser(null);

    } catch (error) {
        toast.error("Failed to create case: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-cyan-400">
            <UserPlus className="w-6 h-6" />
            Create Case for User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* User Selection */}
            <div className="space-y-2">
                <Label className="text-gray-300">Select User *</Label>
                <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openUserSelect}
                            className="w-full justify-between bg-[#0f1419] border-gray-700 text-white hover:bg-[#0f1419]/80"
                        >
                            {selectedUser
                                ? `${selectedUser.name} (${selectedUser.email})`
                                : "Select user..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-[#0f1419] border-gray-700">
                        <Command className="bg-[#0f1419] text-white">
                            <CommandInput 
                                placeholder="Search user by name or email..." 
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                className="h-9"
                            />
                            <CommandList>
                                <CommandEmpty>No user found.</CommandEmpty>
                                <CommandGroup>
                                    {loadingUsers ? (
                                        <div className="p-4 text-center text-sm text-gray-400">Loading users...</div>
                                    ) : (
                                        filteredUsers.slice(0, 50).map((user) => (
                                            <CommandItem
                                                key={user.id}
                                                value={user.email}
                                                onSelect={() => {
                                                    setSelectedUser(user);
                                                    setOpenUserSelect(false);
                                                }}
                                                className="text-white hover:bg-gray-800 cursor-pointer"
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span>{user.name}</span>
                                                    <span className="text-xs text-gray-400">{user.email}</span>
                                                </div>
                                            </CommandItem>
                                        ))
                                    )}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Case Details */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Fraud Type</Label>
                    <Select 
                        value={formData.fraud_type} 
                        onValueChange={(v) => setFormData({...formData, fraud_type: v})}
                    >
                        <SelectTrigger className="bg-[#0f1419] border-gray-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f1419] border-gray-700 text-white">
                            <SelectItem value="Crypto Theft">Crypto Theft</SelectItem>
                            <SelectItem value="Phishing">Phishing</SelectItem>
                            <SelectItem value="Investment Scam">Investment Scam</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Incident Date</Label>
                    <Input 
                        type="date"
                        value={formData.incident_date}
                        onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                        className="bg-[#0f1419] border-gray-700"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Amount Lost (USD)</Label>
                    <Input 
                        type="number"
                        value={formData.amount_lost}
                        onChange={(e) => setFormData({...formData, amount_lost: e.target.value})}
                        className="bg-[#0f1419] border-gray-700"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Blockchain</Label>
                    <Select 
                        value={formData.blockchain} 
                        onValueChange={(v) => setFormData({...formData, blockchain: v})}
                    >
                        <SelectTrigger className="bg-[#0f1419] border-gray-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f1419] border-gray-700 text-white">
                            <SelectItem value="Ethereum">Ethereum</SelectItem>
                            <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                            <SelectItem value="Tron">Tron</SelectItem>
                            <SelectItem value="Solana">Solana</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Scammer Wallet *</Label>
                <Input 
                    value={formData.scammer_wallet}
                    onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
                    placeholder="0x..."
                    className="bg-[#0f1419] border-gray-700 font-mono"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>Victim Wallet (Optional)</Label>
                <Input 
                    value={formData.victim_wallet}
                    onChange={(e) => setFormData({...formData, victim_wallet: e.target.value})}
                    placeholder="0x..."
                    className="bg-[#0f1419] border-gray-700 font-mono"
                />
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-[#0f1419] border-gray-700 min-h-[100px]"
                    placeholder="Case details..."
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-cyan-600 hover:bg-cyan-700"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Case
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
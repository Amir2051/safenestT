import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Wallet, Send, RefreshCw, Plus, QrCode, History, 
  ShieldCheck, Lock, ArrowUpRight, ArrowDownLeft, Copy,
  Coins, Layers
} from "lucide-react";
import { toast } from "sonner";

// Components
import WalletCreator from "@/components/electra/WalletCreator";
import WalletBalance from "@/components/electra/WalletBalance";
import TransactionList from "@/components/electra/TransactionList";
import SendForm from "@/components/electra/SendForm";
import TokenList from "@/components/electra/TokenList";

export default function ElectraWalletPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const queryClient = useQueryClient();

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['electra-wallets'],
    queryFn: () => base44.entities.ElectraWallet.list('-created_date')
  });

  // Select primary wallet by default
  useEffect(() => {
    if (wallets.length > 0 && !selectedWallet) {
      const primary = wallets.find(w => w.is_primary) || wallets[0];
      setSelectedWallet(primary);
    }
  }, [wallets, selectedWallet]);

  const handleWalletCreated = () => {
    queryClient.invalidateQueries(['electra-wallets']);
    setActiveTab("overview");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full bg-[#1a1f2e] border-purple-500/30">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-purple-400" />
            </div>
            <CardTitle className="text-2xl text-white">Welcome to Electra</CardTitle>
            <p className="text-gray-400 mt-2">Create your first secure Electra wallet to get started.</p>
          </CardHeader>
          <CardContent>
            <WalletCreator onCreated={handleWalletCreated} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <img src="https://explorer.electraprotocol.com/img/logo.png" alt="XEP" className="w-8 h-8" onError={(e) => e.target.style.display='none'} />
              Electra Wallet
            </h1>
            <p className="text-gray-400 mt-1">Secure Crypto & Asset Management</p>
          </div>
          <div className="flex items-center gap-3">
            <SelectWallet 
              wallets={wallets} 
              selected={selectedWallet} 
              onSelect={setSelectedWallet} 
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> New Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1f2e] border-purple-500/30 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Wallet</DialogTitle>
                </DialogHeader>
                <WalletCreator onCreated={handleWalletCreated} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedWallet && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-[#1a1f2e] border border-purple-500/20">
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Wallet className="w-4 h-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="send" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Send className="w-4 h-4 mr-2" /> Send
              </TabsTrigger>
              <TabsTrigger value="tokens" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Layers className="w-4 h-4 mr-2" /> Assets (Omni)
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <History className="w-4 h-4 mr-2" /> History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <WalletBalance address={selectedWallet.address} />
              <div className="grid md:grid-cols-2 gap-6">
                <SecurityStatus wallet={selectedWallet} />
                <TransactionList address={selectedWallet.address} limit={5} compact />
              </div>
            </TabsContent>

            <TabsContent value="send">
              <SendForm wallet={selectedWallet} />
            </TabsContent>

            <TabsContent value="tokens">
              <TokenList address={selectedWallet.address} />
            </TabsContent>

            <TabsContent value="history">
              <TransactionList address={selectedWallet.address} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function SelectWallet({ wallets, selected, onSelect }) {
  return (
    <div className="relative">
      <select 
        className="bg-[#1a1f2e] border border-purple-500/30 text-white px-4 py-2 rounded-lg appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
        value={selected?.id}
        onChange={(e) => onSelect(wallets.find(w => w.id === e.target.value))}
      >
        {wallets.map(w => (
          <option key={w.id} value={w.id}>{w.label} ({w.address.slice(0, 6)}...)</option>
        ))}
      </select>
      <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

function SecurityStatus({ wallet }) {
  return (
    <Card className="bg-[#1a1f2e] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-green-500/20">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-white font-medium">Private Keys Encrypted</p>
                <p className="text-xs text-gray-400">AES-256 Encryption Active</p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">SECURE</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-3">
              <QrCode className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-white font-medium">Wallet Address</p>
                <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{wallet.address}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-purple-400 hover:bg-purple-500/10"
              onClick={() => {
                navigator.clipboard.writeText(wallet.address);
                toast.success("Address copied");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
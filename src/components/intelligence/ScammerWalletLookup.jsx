import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, Shield, AlertTriangle, Search, Copy, ExternalLink,
  CheckCircle, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ScammerWalletLookup({ wallets, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredWallets = wallets.filter(wallet => 
    wallet.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.scamCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (address, id) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    toast.success('Wallet address copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse text-white">Loading flagged wallets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-400" />
              Scammer Wallet Lookup
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 ml-2">
                {wallets.length} FLAGGED
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Blacklisted and flagged wallet addresses from exchanges and reports
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search wallet address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredWallets.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? 'No wallets match your search' : 'No flagged wallets'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredWallets.map((wallet, index) => (
              <motion.div
                key={wallet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-gradient-to-br from-[#0f1419] to-[#1a2332] rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                    </div>
                    <Badge className={
                      wallet.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                      wallet.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      wallet.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }>
                      {wallet.riskLevel}
                    </Badge>
                  </div>
                  {wallet.verified && (
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Wallet Address:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-xs break-all flex-1">
                      {wallet.address}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(wallet.address, wallet.id)}
                      className="h-6 w-6 p-0"
                    >
                      {copiedId === wallet.id ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Scam Type:</span>
                    <span className="text-white font-semibold">{wallet.scamCategory}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Reports:</span>
                    <span className="text-red-400 font-bold">{wallet.reportCount}</span>
                  </div>

                  {wallet.totalStolen > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Stolen Amount:</span>
                      <span className="text-red-400 font-bold">
                        ${wallet.totalStolen.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Platforms:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {wallet.platforms.slice(0, 3).map((platform, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
                  <span>Source: {wallet.source}</span>
                  <span>{new Date(wallet.firstReported).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
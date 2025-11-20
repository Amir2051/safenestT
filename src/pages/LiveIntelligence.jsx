import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import GlobalScamReports from "../components/intelligence/GlobalScamReports.jsx";
import ScammerWalletLookup from "../components/intelligence/ScammerWalletLookup.jsx";
import CryptoPriceTracker from "../components/intelligence/CryptoPriceTracker.jsx";
import SecurityTips from "../components/intelligence/SecurityTips.jsx";

export default function LiveIntelligence() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [prices, setPrices] = useState({});
  const [tips, setTips] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const fetchAllData = async () => {
    try {
      const [alertsRes, walletsRes, pricesRes, tipsRes] = await Promise.all([
        base44.functions.invoke('cryptoIntelligence', { endpoint: 'scam-alerts' }),
        base44.functions.invoke('cryptoIntelligence', { endpoint: 'flagged-wallets' }),
        base44.functions.invoke('cryptoIntelligence', { endpoint: 'crypto-prices' }),
        base44.functions.invoke('cryptoIntelligence', { endpoint: 'security-tips' })
      ]);

      setAlerts(alertsRes.data.alerts || []);
      setWallets(walletsRes.data.wallets || []);
      setPrices(pricesRes.data.prices || {});
      setTips(tipsRes.data.tips || []);
      setLastUpdate(new Date());
    } catch (error) {
      toast.error('Failed to fetch intelligence data: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
      
      // Auto-refresh every 60 seconds
      const interval = setInterval(() => {
        fetchAllData();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleReportScam = () => {
    navigate(createPageUrl('CryptoProtection'));
    toast.info('Redirecting to Crypto Protection...');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            Live Intelligence Center
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-1" />
              LIVE
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time crypto threat intelligence and market data
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-cyan-500/30 hover:border-cyan-500/50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleReportScam}
            className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report a Scam
          </Button>
        </div>
      </motion.div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-lg border border-cyan-500/30"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
          <p className="text-white font-semibold">All Systems Operational</p>
          <span className="text-gray-400 text-sm ml-auto">
            {alerts.length} reports • {wallets.length} flagged wallets
          </span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Global Scam Reports Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlobalScamReports alerts={alerts} loading={loading} />
        </motion.div>

        {/* Scammer Wallet Lookup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ScammerWalletLookup wallets={wallets} loading={loading} />
        </motion.div>

        {/* Crypto Price Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CryptoPriceTracker prices={prices} loading={loading} />
        </motion.div>

        {/* Security Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SecurityTips tips={tips} loading={loading} />
        </motion.div>
      </div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-xs text-gray-500 pt-4"
      >
        <p>Intelligence data refreshes automatically every 60 seconds</p>
        <p className="mt-1">Powered by SafeNestt AI • Data from trusted sources</p>
      </motion.div>
    </div>
  );
}
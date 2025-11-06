import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Shield, Globe, Lock } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function VPNControl({ user }) {
  const queryClient = useQueryClient();
  
  const updateVPNMutation = useMutation({
    mutationFn: (enabled) => base44.auth.updateMe({ vpn_enabled: enabled }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success(updatedUser.vpn_enabled ? 'VPN enabled successfully! 🛡️' : 'VPN disabled');
    },
    onError: () => {
      toast.error('Failed to update VPN status');
    }
  });

  const toggleVPN = () => {
    updateVPNMutation.mutate(!user?.vpn_enabled);
  };

  const isEnabled = user?.vpn_enabled;
  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';

  return (
    <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
      isEnabled ? 'border-green-500/50' : 'border-cyan-500/20'
    }`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wifi className={`w-5 h-5 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`} />
          VPN Protection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className={`p-4 rounded-xl border-2 ${
          isEnabled 
            ? 'bg-green-500/10 border-green-500/50' 
            : 'bg-gray-500/10 border-gray-500/30'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-sm font-semibold ${isEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                {isEnabled ? 'CONNECTED' : 'DISCONNECTED'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isEnabled ? 'Your connection is secure' : 'Your connection is not protected'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          </div>

          {isEnabled && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Server Location:</span>
                <span className="text-white font-semibold">🇺🇸 US East</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">IP Address:</span>
                <span className="text-white font-mono">198.51.100.42</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Encryption:</span>
                <span className="text-green-400 font-semibold">AES-256</span>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2">
          {[
            { icon: Shield, text: 'Military-grade encryption', active: isEnabled },
            { icon: Globe, text: 'Anonymous browsing', active: isEnabled },
            { icon: Lock, text: 'Secure public WiFi', active: isEnabled }
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <feature.icon className={`w-3 h-3 ${feature.active ? 'text-green-400' : 'text-gray-500'}`} />
              <span className={feature.active ? 'text-gray-300' : 'text-gray-500'}>{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Toggle Button */}
        {isPremium ? (
          <Button
            onClick={toggleVPN}
            disabled={updateVPNMutation.isPending}
            className={`w-full ${
              isEnabled
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
            }`}
          >
            {updateVPNMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {isEnabled ? 'Disconnecting...' : 'Connecting...'}
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 mr-2" />
                {isEnabled ? 'Disconnect VPN' : 'Connect VPN'}
              </>
            )}
          </Button>
        ) : (
          <div className="text-center p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 mb-2">VPN requires Premium</p>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
              onClick={() => window.location.href = '/Upgrade'}
            >
              Upgrade Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
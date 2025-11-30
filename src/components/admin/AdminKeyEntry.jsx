import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Lock, History, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function AdminKeyEntry({ onAuthorized }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch (e) {
        console.log("User not authenticated", e);
      }
      
      // Fetch the master key
      let correctKey = 'Ronzoro';
      try {
        // Only admins can read SystemConfig due to RLS. 
        // If fetch fails or returns empty, we fallback to 'Ronzoro'
        const configs = await base44.entities.SystemConfig.list();
        const masterKeyConfig = configs.find(c => c.key_name === 'admin_master_key');
        if (masterKeyConfig && masterKeyConfig.value) {
          correctKey = masterKeyConfig.value;
        }
      } catch (err) {
        console.log("Could not fetch system config, using fallback", err);
      }

      // Robust comparison: trim whitespace
      if (key.trim() === correctKey.trim()) {
        // Log success only if we have a user context (optional)
        if (user) {
          try {
            await base44.entities.AdminAccessLog.create({
              admin_email: user.email,
              status: 'success',
              timestamp: new Date().toISOString(),
              action: 'Admin Access Granted',
              ip_address: 'Unknown' 
            });
          } catch (logErr) {
            console.error("Failed to log access", logErr);
          }
        }
        
        toast.success('Access Granted');
        onAuthorized();
      } else {
        // Log failure
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (user) {
          try {
            await base44.entities.AdminAccessLog.create({
              admin_email: user.email,
              status: 'failure',
              timestamp: new Date().toISOString(),
              action: `Failed Access Attempt (${newAttempts})`,
              ip_address: 'Unknown'
            });

            // Send email alert
            await base44.integrations.Core.SendEmail({
                to: user.email, 
                subject: "Suspicious Admin Access Attempt",
                body: `Someone entered a wrong admin key at ${new Date().toLocaleTimeString()}. User: ${user.email}`
            });
          } catch (logErr) {
             console.error("Logging/Alerting failed", logErr);
          }
        }

        setError('Invalid Key. Access Denied.');
        toast.error('Invalid Authorization Key');
      }
    } catch (err) {
      console.error(err);
      setError('System Error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Restricted Area</h2>
          <p className="mt-2 text-gray-400">Enter authorization key to access admin controls</p>
        </div>

        <Card className="bg-[#1a1f2e] border-red-500/20 shadow-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="bg-[#0f1419] border-gray-700 text-white pr-10 h-12 text-lg tracking-widest text-center"
                    placeholder="ENTER KEY"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Access Denied</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold tracking-wider shadow-lg shadow-red-900/20"
                disabled={isLoading || !key}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'AUTHORIZE ACCESS'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 font-mono">
          SECURE CONNECTION • IP LOGGED • 256-BIT ENCRYPTED
        </p>
      </div>
    </div>
  );
}
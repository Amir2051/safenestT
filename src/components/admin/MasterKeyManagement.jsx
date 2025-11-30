import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Save, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from "sonner";

export default function MasterKeyManagement() {
  const [currentKeyConfig, setCurrentKeyConfig] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchKeyConfig();
  }, []);

  const fetchKeyConfig = async () => {
    setIsLoading(true);
    try {
      const configs = await base44.entities.SystemConfig.list();
      const config = configs.find(c => c.key_name === 'admin_master_key');
      setCurrentKeyConfig(config);
    } catch (error) {
      console.error("Failed to fetch key config", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!newKey || newKey.length < 4) {
      toast.error("Key must be at least 4 characters");
      return;
    }

    setIsSaving(true);
    try {
      if (currentKeyConfig) {
        await base44.entities.SystemConfig.update(currentKeyConfig.id, {
          value: newKey
        });
      } else {
        await base44.entities.SystemConfig.create({
          key_name: 'admin_master_key',
          value: newKey,
          description: 'Master key for admin access authorization'
        });
      }
      
      // Log the change
      const user = await base44.auth.me();
      await base44.entities.AdminAccessLog.create({
        admin_email: user.email,
        status: 'success',
        timestamp: new Date().toISOString(),
        action: 'Master Key Updated',
        ip_address: 'Unknown'
      });

      toast.success("Master Key updated successfully");
      setNewKey('');
      fetchKeyConfig();
    } catch (error) {
      toast.error("Failed to update key");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[#1a2332] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-cyan-400" />
          Master Key Management
        </CardTitle>
        <CardDescription className="text-gray-400">
          Change the master authorization key for all admins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Current Key</label>
          <div className="flex items-center gap-2 p-3 bg-[#0f1419] rounded border border-gray-700">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="text-gray-500 font-mono">••••••••</span>
            <span className="text-xs text-gray-500 ml-auto">Hidden for security</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">New Master Key</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Enter new secure key"
              className="bg-[#0f1419] border-gray-700 text-white"
            />
            <Button 
              onClick={handleUpdateKey}
              disabled={isSaving || !newKey}
              className="bg-cyan-600 hover:bg-cyan-700 min-w-[100px]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
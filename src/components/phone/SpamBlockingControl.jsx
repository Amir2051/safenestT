import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Settings, Info, Check } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SpamBlockingControl({ user }) {
  const [blockLevel, setBlockLevel] = useState('MEDIUM');
  const queryClient = useQueryClient();

  const { data: blockSettings } = useQuery({
    queryKey: ['phone-block-settings'],
    queryFn: async () => {
      const settings = await base44.entities.PhoneBlockList.filter({ created_by: user.email });
      return settings[0] || { block_level: 'MEDIUM' };
    },
    enabled: !!user
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newLevel) => {
      // Create or update settings
      if (blockSettings?.id) {
        await base44.entities.PhoneBlockList.update(blockSettings.id, {
          block_level: newLevel
        });
      } else {
        await base44.entities.PhoneBlockList.create({
          phone_number: '__SETTINGS__',
          block_level: newLevel,
          block_type: 'AUTO_BEHAVIOR',
          block_reason: 'User sensitivity settings'
        });
      }
      return newLevel;
    },
    onSuccess: (newLevel) => {
      queryClient.invalidateQueries({ queryKey: ['phone-block-settings'] });
      toast.success(`Block level updated to ${newLevel}`);
    }
  });

  return (
    <div className="space-y-6">
      {/* Blocking Overview */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Three-Layer Spam Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Layer 1: Reputation */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Layer 1</Badge>
                Reputation Database
              </h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Community-reported spam numbers</li>
                <li>• Known scam and robocall databases</li>
                <li>• Verified abuse reports</li>
              </ul>
            </div>

            {/* Layer 2: Behavioral Detection */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Layer 2</Badge>
                Behavioral Detection
              </h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• High-frequency call patterns</li>
                <li>• Short call duration loops</li>
                <li>• Sequential or rotating number patterns</li>
                <li>• Time-based scam activity indicators</li>
              </ul>
            </div>

            {/* Layer 3: User Control */}
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Layer 3</Badge>
                User Control
              </h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Adjustable block sensitivity</li>
                <li>• Personal whitelist and blocklist</li>
                <li>• Real-time warnings or silent blocking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Level Settings */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Block Sensitivity Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select 
            value={blockLevel} 
            onValueChange={(value) => {
              setBlockLevel(value);
              updateSettingsMutation.mutate(value);
            }}
          >
            <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-cyan-500/30 text-white">
              <SelectItem value="LOW">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400">Low</Badge>
                  <span>Only known spam</span>
                </div>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500/20 text-yellow-400">Medium</Badge>
                  <span>Balanced protection</span>
                </div>
              </SelectItem>
              <SelectItem value="AGGRESSIVE">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-400">Aggressive</Badge>
                  <span>Maximum filtering</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Level Descriptions */}
          <div className="space-y-3 text-sm">
            {blockLevel === 'LOW' && (
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  <strong>Low Sensitivity:</strong> Only blocks numbers with 5+ verified spam reports. 
                  Minimal false positives, but may allow some spam through.
                </AlertDescription>
              </Alert>
            )}
            {blockLevel === 'MEDIUM' && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <Info className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  <strong>Medium Sensitivity:</strong> Blocks known spam + suspicious patterns. 
                  Balanced approach recommended for most users.
                </AlertDescription>
              </Alert>
            )}
            {blockLevel === 'AGGRESSIVE' && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <Info className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Aggressive Filtering:</strong> Blocks all suspicious activity including 
                  unverified numbers. Maximum protection, but may block legitimate calls.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <Card className="bg-gradient-to-r from-gray-500/10 to-gray-500/10 border-gray-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-white font-semibold mb-1">Platform Compliance</p>
              <ul className="text-gray-300 space-y-1 text-xs">
                <li>✓ Adheres to Android Call Screening APIs</li>
                <li>✓ Compatible with iOS CallKit frameworks</li>
                <li>✓ No call audio recording</li>
                <li>✓ No contact scraping</li>
                <li>✓ Privacy-first design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
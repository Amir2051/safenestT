import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ban, Plus, Trash2, Shield, Phone } from "lucide-react";
import { toast } from "sonner";

export default function BlockListManager({ user }) {
  const [newNumber, setNewNumber] = useState('');
  const [newReason, setNewReason] = useState('');
  const queryClient = useQueryClient();

  const { data: blockList, isLoading } = useQuery({
    queryKey: ['phone-block-list'],
    queryFn: async () => {
      const blocks = await base44.entities.PhoneBlockList.filter({ 
        created_by: user.email 
      });
      return blocks.filter(b => b.phone_number !== '__SETTINGS__') || [];
    },
    enabled: !!user
  });

  const addBlockMutation = useMutation({
    mutationFn: async () => {
      if (!newNumber.trim()) {
        throw new Error('Phone number required');
      }

      await base44.entities.PhoneBlockList.create({
        phone_number: newNumber,
        block_type: 'MANUAL',
        block_reason: newReason || 'Manually blocked by user',
        blocked_at: new Date().toISOString(),
        is_whitelisted: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-block-list'] });
      toast.success('Number added to block list');
      setNewNumber('');
      setNewReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add number');
    }
  });

  const removeBlockMutation = useMutation({
    mutationFn: async (blockId) => {
      await base44.entities.PhoneBlockList.delete(blockId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-block-list'] });
      toast.success('Number removed from block list');
    }
  });

  return (
    <div className="space-y-6">
      {/* Add Number */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Add Number to Block List
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="Phone number (e.g., +1 555-123-4567)"
            className="bg-[#0f1419] border-cyan-500/30 text-white"
          />
          <Input
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason (optional)"
            className="bg-[#0f1419] border-cyan-500/30 text-white"
          />
          <Button
            onClick={() => addBlockMutation.mutate()}
            disabled={addBlockMutation.isPending || !newNumber.trim()}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500"
          >
            <Ban className="w-4 h-4 mr-2" />
            Add to Block List
          </Button>
        </CardContent>
      </Card>

      {/* Block List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Blocked Numbers ({blockList?.length || 0})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
            </div>
          ) : blockList && blockList.length > 0 ? (
            <div className="space-y-2">
              {blockList.map((block) => (
                <div
                  key={block.id}
                  className="p-3 bg-[#0f1419] rounded-lg border border-red-500/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-white font-mono">{block.phone_number}</p>
                      {block.block_reason && (
                        <p className="text-xs text-gray-400">{block.block_reason}</p>
                      )}
                    </div>
                    <Badge className={
                      block.block_type === 'MANUAL' ? 'bg-gray-500/20 text-gray-400' :
                      block.block_type === 'AUTO_SPAM' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {block.block_type === 'MANUAL' ? 'Manual' :
                       block.block_type === 'AUTO_SPAM' ? 'Auto-Spam' :
                       block.block_type === 'AUTO_SCAM' ? 'Auto-Scam' : 'Auto'}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => removeBlockMutation.mutate(block.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    disabled={removeBlockMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No blocked numbers</p>
              <p className="text-xs text-gray-500 mt-1">Add numbers manually or they'll be added automatically based on spam reports</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
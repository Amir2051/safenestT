import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Key, ArrowRight } from "lucide-react";

export default function InviteCodeManager() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Invite Code Management</h2>
      
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardContent className="p-8 text-center">
          <Key className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Full Invite Manager</h3>
          <p className="text-gray-400 mb-6">
            Access the complete invite code management system with advanced features
          </p>
          <Button
            onClick={() => navigate(createPageUrl('AdminInvites'))}
            className="bg-gradient-to-r from-purple-500 to-pink-600"
          >
            Go to Invite Manager
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
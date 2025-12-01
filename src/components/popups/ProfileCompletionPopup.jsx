import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { UserCircle } from "lucide-react";
import { toast } from "sonner";

export default function ProfileCompletionPopup({ user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || ""
  });

  if (!user) return null;

  // Check if profile is incomplete
  const isProfileIncomplete = !user.full_name || !user.phone;

  if (!isProfileIncomplete) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        onboarding_checklist: {
          ...user.onboarding_checklist,
          profile_completed: true
        }
      });
      toast.success("Profile updated successfully!");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isProfileIncomplete}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserCircle className="w-6 h-6 text-cyan-400" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please provide the following information to continue using SafeNestt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-gray-200">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe"
              className="bg-[#0f1419] border-gray-700 text-white focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-200">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="bg-[#0f1419] border-gray-700 text-white focus:border-cyan-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-cyan-600 hover:bg-cyan-700 mt-4"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
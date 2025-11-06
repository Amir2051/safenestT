import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from "sonner";

export default function AddPasswordDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    site_name: '',
    site_url: '',
    username: '',
    encrypted_password: '',
    category: 'other',
    notes: ''
  });
  const [generating, setGenerating] = useState(false);

  const queryClient = useQueryClient();

  const createPasswordMutation = useMutation({
    mutationFn: (data) => base44.entities.Password.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      toast.success('Password added successfully!');
      onClose();
      setFormData({
        site_name: '',
        site_url: '',
        username: '',
        encrypted_password: '',
        category: 'other',
        notes: ''
      });
    },
    onError: () => {
      toast.error('Failed to add password');
    }
  });

  const generateStrongPassword = () => {
    setGenerating(true);
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, encrypted_password: password }));
    setTimeout(() => setGenerating(false), 500);
    toast.success('Strong password generated!');
  };

  const calculateStrength = (password) => {
    if (!password) return 'weak';
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()]/.test(password);
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength >= 3 && password.length >= 12) return 'excellent';
    if (strength >= 2) return 'strong';
    return 'medium';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const passwordStrength = calculateStrength(formData.encrypted_password);
    createPasswordMutation.mutate({
      ...formData,
      password_strength: passwordStrength,
      last_changed: new Date().toISOString()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Add New Password</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Site Name *</Label>
            <Input
              required
              value={formData.site_name}
              onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              placeholder="e.g., Facebook"
            />
          </div>

          <div>
            <Label className="text-gray-300">Website URL</Label>
            <Input
              type="url"
              value={formData.site_url}
              onChange={(e) => setFormData(prev => ({ ...prev, site_url: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label className="text-gray-300">Username/Email *</Label>
            <Input
              required
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              placeholder="username@email.com"
            />
          </div>

          <div>
            <Label className="text-gray-300 flex items-center justify-between">
              <span>Password *</span>
              <Button
                type="button"
                size="sm"
                onClick={generateStrongPassword}
                disabled={generating}
                variant="ghost"
                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-auto py-1"
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Generate Strong
              </Button>
            </Label>
            <Input
              required
              type="text"
              value={formData.encrypted_password}
              onChange={(e) => setFormData(prev => ({ ...prev, encrypted_password: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2 font-mono"
              placeholder="Enter password"
            />
            {formData.encrypted_password && (
              <p className={`text-xs mt-1 ${
                calculateStrength(formData.encrypted_password) === 'excellent' ? 'text-green-400' :
                calculateStrength(formData.encrypted_password) === 'strong' ? 'text-green-400' :
                calculateStrength(formData.encrypted_password) === 'medium' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                Strength: {calculateStrength(formData.encrypted_password)}
              </p>
            )}
          </div>

          <div>
            <Label className="text-gray-300">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="banking">Banking</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2 h-20"
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPasswordMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {createPasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
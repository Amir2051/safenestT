import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles } from 'lucide-react';

export default function AddPasswordDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    site_name: '',
    site_url: '',
    username: '',
    encrypted_password: '',
    password_strength: 'medium',
    category: 'other',
    notes: '',
    last_changed: new Date().toISOString(),
  });

  const createPasswordMutation = useMutation({
    mutationFn: (data) => base44.entities.Password.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      onClose();
      setFormData({
        site_name: '',
        site_url: '',
        username: '',
        encrypted_password: '',
        password_strength: 'medium',
        category: 'other',
        notes: '',
        last_changed: new Date().toISOString(),
      });
    },
  });

  const analyzePasswordStrength = (pwd) => {
    if (!pwd) return 'weak';
    const length = pwd.length;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    const conditions = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (length >= 16 && conditions >= 4) return 'excellent';
    if (length >= 12 && conditions >= 3) return 'strong';
    if (length >= 8 && conditions >= 2) return 'medium';
    return 'weak';
  };

  const generatePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({
      ...prev,
      encrypted_password: password,
      password_strength: analyzePasswordStrength(password)
    }));
  };

  const handlePasswordChange = (pwd) => {
    setFormData(prev => ({
      ...prev,
      encrypted_password: pwd,
      password_strength: analyzePasswordStrength(pwd)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createPasswordMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Lock className="w-5 h-5 text-cyan-400" />
            Add New Password
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Site Name *</Label>
            <Input
              value={formData.site_name}
              onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              placeholder="e.g., Gmail, Facebook"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">Site URL</Label>
            <Input
              value={formData.site_url}
              onChange={(e) => setFormData(prev => ({ ...prev, site_url: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label className="text-gray-300">Username / Email *</Label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">Password *</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={formData.encrypted_password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="bg-[#0f1419] border-cyan-500/20 text-white flex-1"
                placeholder="Enter or generate password"
                required
              />
              <Button
                type="button"
                onClick={generatePassword}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Strength: <span className={
                formData.password_strength === 'excellent' ? 'text-emerald-400' :
                formData.password_strength === 'strong' ? 'text-green-400' :
                formData.password_strength === 'medium' ? 'text-yellow-400' : 'text-red-400'
              }>
                {formData.password_strength}
              </span>
            </p>
          </div>

          <div>
            <Label className="text-gray-300">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="banking">Banking</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="social">Social</SelectItem>
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
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              placeholder="Additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-cyan-500/20 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPasswordMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {createPasswordMutation.isPending ? 'Adding...' : 'Add Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
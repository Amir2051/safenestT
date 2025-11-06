
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Trash2, ExternalLink, AlertTriangle, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const strengthColors = {
  weak: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  strong: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  excellent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' }
};

const categoryIcons = {
  banking: '🏦',
  email: '📧',
  social: '👥',
  shopping: '🛒',
  work: '💼',
  other: '🔐'
};

export default function PasswordItem({ password, onDelete }) {
  const [showPassword, setShowPassword] = useState(false);
  const [fixing, setFixing] = useState(false);

  const copyPassword = () => {
    navigator.clipboard.writeText(password.encrypted_password);
    toast.success('Password copied to clipboard');
  };

  const quickFix = async () => {
    setFixing(true);
    try {
      // Generate strong password
      const length = 16;
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
      let newPassword = "";
      for (let i = 0; i < length; i++) {
        newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
      }

      // Update password
      // Assuming 'base44' is globally available or imported elsewhere in the application context.
      // If not, this line will cause a runtime error.
      await window.base44.entities.Password.update(password.id, { // Changed to window.base44 for safer global access
        encrypted_password: newPassword,
        password_strength: 'excellent',
        last_changed: new Date().toISOString()
      });

      // Log remediation
      // Assuming 'base44' is globally available or imported elsewhere in the application context.
      // If not, this line will cause a runtime error.
      await window.base44.entities.AutomatedRemediation.create({ // Changed to window.base44 for safer global access
        action_type: 'password_update',
        trigger_reason: `Weak password detected for ${password.site_name}`,
        status: 'completed',
        affected_entity: password.id,
        details: {
          before: password.password_strength,
          after: 'excellent',
          score_impact: 5
        },
        user_notified: true,
        auto_approved: true
      });

      toast.success('Password updated to strong version! 🎉');
      window.location.reload();
    } catch (error) {
      console.error('Quick fix error:', error);
      toast.error('Failed to update password');
    } finally {
      setFixing(false);
    }
  };

  const colors = strengthColors[password.password_strength] || strengthColors.medium;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">
              {categoryIcons[password.category] || '🔐'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate flex items-center gap-2">
                {password.site_name}
                {password.compromised && (
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                )}
              </h3>
              <p className="text-sm text-gray-400 truncate">{password.username}</p>
            </div>
          </div>
          <Badge className={`${colors.bg} ${colors.text} ${colors.border} border flex-shrink-0`}>
            {password.password_strength}
          </Badge>
        </div>

        {password.site_url && (
          <a
            href={password.site_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-3 truncate"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{password.site_url}</span>
          </a>
        )}

        <div className="bg-[#0f1419] rounded-lg p-3 mb-4 border border-cyan-500/10">
          <div className="flex items-center gap-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password.encrypted_password}
              readOnly
              className="flex-1 bg-transparent text-white text-sm outline-none font-mono"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:bg-cyan-500/10 flex-shrink-0"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyPassword}
              className="hover:bg-cyan-500/10 flex-shrink-0"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>

        {password.notes && (
          <p className="text-xs text-gray-400 mb-3 line-clamp-2">{password.notes}</p>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {password.last_changed 
              ? `Updated ${new Date(password.last_changed).toLocaleDateString()}`
              : 'Never updated'
            }
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(password.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {(password.compromised || password.password_strength === 'weak' || password.password_strength === 'medium') && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-red-400 font-semibold flex-1">
                {password.compromised ? '⚠️ This password may be compromised' : '⚠️ Weak password detected'}
              </p>
              <Button
                size="sm"
                onClick={quickFix}
                disabled={fixing}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs flex-shrink-0"
              >
                {fixing ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Quick Fix
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

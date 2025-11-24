import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Save, X, Plus, Trash2, Upload, Loader2, User, Wallet, 
  Mail, Phone, MapPin, FileText, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

export default function SuspectEditForm({ caseData, onSave, onCancel, saving }) {
  const existingData = caseData?.scammer_info || caseData?.suspect_details?.primary_suspect || {};
  
  const [formData, setFormData] = useState({
    name: existingData.name || '',
    email: existingData.email || '',
    phone: existingData.phone || '',
    telegram: existingData.telegram || '',
    whatsapp: existingData.whatsapp || '',
    location: existingData.location || '',
    website: existingData.website || '',
    notes: existingData.notes || '',
    wallet_addresses: existingData.wallet_addresses || caseData?.suspect_details?.wallet_addresses || [],
    known_emails: existingData.known_emails || [],
    social_media: existingData.social_media || caseData?.suspect_details?.social_profiles || []
  });

  const [newWallet, setNewWallet] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState(existingData.evidence_files || []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addWallet = () => {
    if (!newWallet.trim()) return;
    if (formData.wallet_addresses.includes(newWallet.trim())) {
      toast.error('Wallet already added');
      return;
    }
    setFormData(prev => ({
      ...prev,
      wallet_addresses: [...prev.wallet_addresses, newWallet.trim()]
    }));
    setNewWallet('');
  };

  const removeWallet = (index) => {
    setFormData(prev => ({
      ...prev,
      wallet_addresses: prev.wallet_addresses.filter((_, i) => i !== index)
    }));
  };

  const addEmail = () => {
    if (!newEmail.trim()) return;
    if (formData.known_emails.includes(newEmail.trim())) {
      toast.error('Email already added');
      return;
    }
    setFormData(prev => ({
      ...prev,
      known_emails: [...prev.known_emails, newEmail.trim()]
    }));
    setNewEmail('');
  };

  const removeEmail = (index) => {
    setFormData(prev => ({
      ...prev,
      known_emails: prev.known_emails.filter((_, i) => i !== index)
    }));
  };

  const addSocialMedia = () => {
    if (!newSocialPlatform.trim() || !newSocialUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      social_media: [...prev.social_media, { platform: newSocialPlatform.trim(), url: newSocialUrl.trim() }]
    }));
    setNewSocialPlatform('');
    setNewSocialUrl('');
  };

  const removeSocialMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      social_media: prev.social_media.filter((_, i) => i !== index)
    }));
  };

  const handleEvidenceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEvidence(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEvidenceFiles(prev => [...prev, {
        name: file.name,
        url: file_url,
        type: file.type,
        uploaded_at: new Date().toISOString()
      }]);
      toast.success('Evidence uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploadingEvidence(false);
    e.target.value = '';
  };

  const removeEvidence = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const suspectData = {
      ...formData,
      evidence_files: evidenceFiles
    };
    onSave(suspectData);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-red-400" />
          Suspect Identity
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 mb-2 block">Suspect Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-[#1a2332] border-red-500/30 text-white"
              placeholder="Enter suspect name or alias"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Primary Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="bg-[#1a2332] border-red-500/30 text-white"
              placeholder="suspect@email.com"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Phone Number</Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="bg-[#1a2332] border-red-500/30 text-white"
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="bg-[#1a2332] border-red-500/30 text-white"
              placeholder="City, Country"
            />
          </div>
        </div>
      </div>

      {/* Messaging Apps */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-purple-400" />
          Messaging Apps
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 mb-2 block">Telegram</Label>
            <Input
              value={formData.telegram}
              onChange={(e) => handleChange('telegram', e.target.value)}
              className="bg-[#1a2332] border-purple-500/30 text-white"
              placeholder="@username or t.me/username"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">WhatsApp</Label>
            <Input
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="bg-[#1a2332] border-purple-500/30 text-white"
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>
      </div>

      {/* Wallet Addresses */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          Suspect Wallet Addresses
        </h4>
        <div className="flex gap-2 mb-3">
          <Input
            value={newWallet}
            onChange={(e) => setNewWallet(e.target.value)}
            className="bg-[#1a2332] border-cyan-500/30 text-white font-mono text-sm"
            placeholder="0x..."
            onKeyDown={(e) => e.key === 'Enter' && addWallet()}
          />
          <Button onClick={addWallet} size="sm" className="bg-cyan-500/20 text-cyan-400">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.wallet_addresses.length > 0 && (
          <div className="space-y-2">
            {formData.wallet_addresses.map((wallet, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-[#1a2332] rounded-lg">
                <span className="text-white font-mono text-sm truncate">{wallet}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeWallet(idx)}
                  className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Known Emails */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400" />
          Known Emails (Additional)
        </h4>
        <div className="flex gap-2 mb-3">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="bg-[#1a2332] border-orange-500/30 text-white"
            placeholder="another@email.com"
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          />
          <Button onClick={addEmail} size="sm" className="bg-orange-500/20 text-orange-400">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.known_emails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.known_emails.map((email, idx) => (
              <Badge key={idx} className="bg-orange-500/20 text-orange-400 border-orange-500/50 flex items-center gap-1">
                {email}
                <button onClick={() => removeEmail(idx)} className="ml-1 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Social Media */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-blue-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-blue-400" />
          Social Media / Online Presence
        </h4>
        <div className="flex gap-2 mb-3">
          <Input
            value={newSocialPlatform}
            onChange={(e) => setNewSocialPlatform(e.target.value)}
            className="w-32 bg-[#1a2332] border-blue-500/30 text-white"
            placeholder="Platform"
          />
          <Input
            value={newSocialUrl}
            onChange={(e) => setNewSocialUrl(e.target.value)}
            className="flex-1 bg-[#1a2332] border-blue-500/30 text-white"
            placeholder="https://..."
          />
          <Button onClick={addSocialMedia} size="sm" className="bg-blue-500/20 text-blue-400">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.social_media.length > 0 && (
          <div className="space-y-2">
            {formData.social_media.map((profile, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-[#1a2332] rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{typeof profile === 'string' ? 'Link' : profile.platform}</Badge>
                  <span className="text-cyan-400 text-sm truncate">
                    {typeof profile === 'string' ? profile : profile.url}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeSocialMedia(idx)}
                  className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Attachments */}
      <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-400" />
          Evidence Attachments (Optional)
        </h4>
        <label className="block mb-3">
          <input
            type="file"
            className="hidden"
            onChange={handleEvidenceUpload}
            disabled={uploadingEvidence}
          />
          <Button
            disabled={uploadingEvidence}
            className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
            asChild
          >
            <span>
              {uploadingEvidence ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Upload Evidence</>
              )}
            </span>
          </Button>
        </label>
        {evidenceFiles.length > 0 && (
          <div className="space-y-2">
            {evidenceFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-[#1a2332] rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-400" />
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline text-sm"
                  >
                    {file.name}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeEvidence(idx)}
                  className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-gray-300 mb-2 block">Additional Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="bg-[#0f1419] border-gray-500/30 text-white min-h-[120px]"
          placeholder="Any additional information about the suspect..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-gray-500/30"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 min-w-[150px]"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Suspect Info</>
          )}
        </Button>
      </div>
    </div>
  );
}
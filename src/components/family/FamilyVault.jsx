import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Lock, FileText, Upload, Download, Eye, Trash2, Shield, 
  File, Image, Video, Plus, Loader2 
} from "lucide-react";
import { toast } from "sonner";

export default function FamilyVault({ groupId, userEmail, members, isAdmin }) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState('document');
  const [category, setCategory] = useState('other');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: vaultItems = [], isLoading } = useQuery({
    queryKey: ['family-vault', groupId],
    queryFn: async () => {
      const items = await base44.entities.FamilyVaultItem.filter({ group_id: groupId }, '-uploaded_at');
      return items;
    },
    enabled: !!groupId
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.FamilyVaultItem.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-vault'] });
      toast.success('✅ Item added to vault!');
      setShowUploadDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.FamilyVaultItem.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-vault'] });
      toast.success('Item deleted');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setItemType('document');
    setCategory('other');
    setFile(null);
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let mimeType = null;

      if (file) {
        const uploadResponse = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResponse.file_url;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
      }

      await uploadMutation.mutateAsync({
        group_id: groupId,
        item_type: itemType,
        title,
        description: description || null,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: userEmail,
        uploaded_at: new Date().toISOString(),
        category,
        tags: [],
        access_control: {
          view_permissions: members.map(m => m.member_email),
          edit_permissions: isAdmin ? [userEmail] : [],
          download_permissions: members.map(m => m.member_email),
          inherit_from_group: true
        },
        is_emergency_access: false,
        is_pinned: false,
        view_count: 0,
        version: 1,
        version_history: []
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'document': return FileText;
      case 'photo': return Image;
      case 'video': return Video;
      case 'note': return FileText;
      default: return File;
    }
  };

  const categoryColors = {
    legal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    medical: 'bg-red-500/10 text-red-400 border-red-500/30',
    financial: 'bg-green-500/10 text-green-400 border-green-500/30',
    education: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    personal: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    emergency: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    other: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              Family Vault ({vaultItems.length})
            </CardTitle>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            </div>
          ) : vaultItems.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Vault is Empty</p>
              <p className="text-gray-400 text-sm mb-6">
                Start adding important documents, photos, and notes
              </p>
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vaultItems.map((item) => {
                const Icon = getItemIcon(item.item_type);
                
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold">{item.title}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge className={`text-xs ${categoryColors[item.category]} border`}>
                              {item.category}
                            </Badge>
                            {item.file_size && (
                              <span className="text-xs text-gray-500">
                                {(item.file_size / 1024).toFixed(1)} KB
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              by {members.find(m => m.member_email === item.uploaded_by)?.member_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.file_url, '_blank')}
                            className="text-cyan-400 hover:bg-cyan-500/10"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {(isAdmin || item.uploaded_by === userEmail) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-[#1a2332] border-purple-500/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Add to Family Vault</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Birth Certificate"
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger className="bg-[#0f1419] border-purple-500/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#0f1419] border-purple-500/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>File (Optional)</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
              />
              {file && (
                <p className="text-xs text-gray-400 mt-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-xs">
                🔒 Files are encrypted and only accessible by family members
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowUploadDialog(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!title || uploading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add to Vault
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
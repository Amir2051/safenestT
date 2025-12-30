import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Upload, X, FileText, Image, File, CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

const ALLOWED_TYPES = {
  'application/pdf': { ext: '.pdf', icon: FileText, color: 'text-red-400' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', icon: FileText, color: 'text-blue-400' },
  'image/jpeg': { ext: '.jpg', icon: Image, color: 'text-green-400' },
  'image/png': { ext: '.png', icon: Image, color: 'text-purple-400' },
  'image/jpg': { ext: '.jpg', icon: Image, color: 'text-green-400' }
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function MultiFileUploader({ onFilesUploaded, maxFiles = 10 }) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!ALLOWED_TYPES[file.type]) {
      return { valid: false, error: 'Invalid file type. Only PDF, DOCX, JPG, PNG allowed.' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large. Maximum 10MB per file.' };
    }
    return { valid: true };
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validatedFiles = fileArray.map((file) => {
      const validation = validateFile(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
        progress: 0,
        url: null
      };
    });

    setFiles(prev => [...prev, ...validatedFiles]);

    // Start uploading valid files
    validatedFiles.forEach((fileObj) => {
      if (fileObj.status === 'pending') {
        uploadFile(fileObj);
      }
    });
  };

  const uploadFile = async (fileObj) => {
    setFiles(prev => prev.map(f => 
      f.id === fileObj.id ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id && f.progress < 90 
            ? { ...f, progress: f.progress + 10 } 
            : f
        ));
      }, 200);

      const response = await base44.integrations.Core.UploadFile({ file: fileObj.file });
      
      clearInterval(progressInterval);

      setFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, status: 'completed', progress: 100, url: response.file_url } 
          : f
      ));

      // Notify parent component
      if (onFilesUploaded) {
        const completedFiles = files
          .filter(f => f.status === 'completed' || (f.id === fileObj.id && response.file_url))
          .map(f => ({
            name: f.name,
            url: f.id === fileObj.id ? response.file_url : f.url,
            type: f.type,
            size: f.size
          }));
        onFilesUploaded(completedFiles);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, status: 'error', error: 'Upload failed. Please try again.' } 
          : f
      ));
      toast.error(`Failed to upload ${fileObj.name}`);
    }
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
          dragActive 
            ? 'border-cyan-500 bg-cyan-500/10' 
            : 'border-gray-600 hover:border-cyan-500/50 bg-[#0f1419]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
        />

        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-400' : 'text-gray-400'}`} />
          <p className="text-white font-semibold mb-2">
            {dragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            PDF, DOCX, JPG, PNG • Max 10MB per file • Up to {maxFiles} files
          </p>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold">
              Uploaded Files ({completedCount}/{files.length})
            </h4>
            {completedCount === files.length && files.length > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="w-3 h-3 mr-1" />
                All Complete
              </Badge>
            )}
          </div>

          {files.map((fileObj) => {
            const fileConfig = ALLOWED_TYPES[fileObj.type] || { icon: File, color: 'text-gray-400' };
            const FileIcon = fileConfig.icon;

            return (
              <Card key={fileObj.id} className="p-3 bg-[#0f1419] border-cyan-500/20">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 ${
                    fileObj.status === 'completed' ? 'bg-green-500/20' :
                    fileObj.status === 'error' ? 'bg-red-500/20' : ''
                  }`}>
                    {fileObj.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : fileObj.status === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : fileObj.status === 'uploading' ? (
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <FileIcon className={`w-5 h-5 ${fileConfig.color}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-white text-sm font-medium truncate">{fileObj.name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeFile(fileObj.id)}
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </Button>
                    </div>

                    <p className="text-xs text-gray-400 mb-2">
                      {(fileObj.size / 1024).toFixed(1)} KB
                      {fileObj.status === 'completed' && ' • Upload complete'}
                      {fileObj.status === 'error' && ` • ${fileObj.error}`}
                    </p>

                    {fileObj.status === 'uploading' && (
                      <div className="space-y-1">
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                            style={{ width: `${fileObj.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-cyan-400">{fileObj.progress}%</p>
                      </div>
                    )}

                    {fileObj.status === 'completed' && fileObj.url && (
                      <a
                        href={fileObj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                      >
                        View file
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
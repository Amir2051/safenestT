import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Download } from "lucide-react";

export default function FilePreviewModal({ file, isOpen, onClose }) {
  if (!file) return null;

  const isImage = file.type?.includes("image") || file.mime_type?.includes("image") || file.url?.match(/\.(jpeg|jpg|png|gif)$/i);
  const isPDF = file.type?.includes("pdf") || file.mime_type?.includes("pdf") || file.url?.match(/\.pdf$/i);

  // Prevent right click to discourage simple saving (not full proof)
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 bg-black/90 border-cyan-500/20 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <DialogTitle className="text-white text-lg font-medium truncate pr-4">
            {file.name || "File Preview"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {/* Download button removed for non-admins (or everyone in this viewer per requirements "Users must NOT be able to ... Download") */}
            {/* If we want to allow Admins to download, we could pass isAdmin prop, but requirements say "Users must NOT...", implying Admins might still want full access. 
                However, for this specific viewer, let's keep it read-only for now. 
                Admins can use the main list download button if we keep it there for them.
            */}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4 relative" onContextMenu={handleContextMenu}>
          {isImage ? (
            <img 
              src={file.url || file.file_url} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain select-none" 
              style={{ pointerEvents: 'none' }} // Disable drag
            />
          ) : isPDF ? (
            <iframe 
              src={`${file.url || file.file_url}#toolbar=0&navpanes=0&scrollbar=0`} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className="mb-4">Preview not available for this file type.</p>
              {/* Only show external link if we strictly cannot preview */}
            </div>
          )}
          
          {/* Overlay to prevent drag/drop saving if possible, though basic */}
          <div className="absolute inset-0 pointer-events-none" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Download } from "lucide-react";

export default function FilePreviewModal({ file, isOpen, onClose }) {
  if (!file) return null;

  const url = file.url || file.file_url;
  const name = file.name || "File";
  const type = (file.type || file.mime_type || "").toLowerCase();
  
  const isImage = type.includes("image") || url?.match(/\.(jpeg|jpg|png|gif|webp)$/i);
  const isPDF = type.includes("pdf") || url?.match(/\.pdf$/i);
  const isVideo = type.includes("video") || url?.match(/\.(mp4|webm|ogg|mov)$/i);
  const isAudio = type.includes("audio") || url?.match(/\.(mp3|wav|ogg)$/i);
  
  // Office docs (using Google Docs Viewer)
  const isOffice = url?.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i);
  // Text files
  const isText = type.includes("text") || url?.match(/\.(txt|md|csv|json|xml|js|css|html)$/i);

  // Prevent right click to discourage simple saving (not full proof)
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 bg-black/90 border-cyan-500/20 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <DialogTitle className="text-white text-lg font-medium truncate pr-4">
            {name}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.open(url, '_blank')} 
                className="text-gray-400 hover:text-white"
                title="Open / Download"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4 relative" onContextMenu={handleContextMenu}>
          {isImage ? (
            <img 
              src={url} 
              alt={name} 
              className="max-w-full max-h-full object-contain select-none" 
              style={{ pointerEvents: 'none' }} 
            />
          ) : isPDF ? (
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : isVideo ? (
            <video 
              src={url} 
              controls 
              className="max-w-full max-h-full"
            />
          ) : isAudio ? (
             <div className="w-full max-w-md bg-gray-900 p-6 rounded-xl border border-gray-800">
                <audio src={url} controls className="w-full" />
                <p className="text-center mt-4 text-gray-400">{name}</p>
             </div>
          ) : isOffice ? (
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              className="w-full h-full border-none"
              title="Document Preview"
            />
          ) : isText ? (
             <iframe 
               src={url}
               className="w-full h-full border-none bg-white"
               title="Text Preview"
             />
          ) : (
            <div className="text-center text-gray-400">
              <p className="mb-4">No preview available for this file type.</p>
              <Button 
                onClick={() => window.open(url, '_blank')}
                variant="outline"
                className="border-white/20 hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
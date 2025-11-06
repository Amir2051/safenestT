import React from 'react';
import { Card } from "@/components/ui/card";
import { CheckCircle, Trash2, Zap, Sparkles } from 'lucide-react';

export default function CleanupResults({ results }) {
  return (
    <div className="mt-8 space-y-4">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-1">Scan Complete!</h3>
            <p className="text-sm text-gray-300">
              {results.status === 'clean' 
                ? "Your device is clean and optimized! Great job keeping your security up to date."
                : `Found and cleaned ${results.threats_found} security issue${results.threats_found > 1 ? 's' : ''}. Your device is now secure.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f1419] rounded-lg p-4 border border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{results.threats_found}</p>
              <p className="text-xs text-gray-400">Threats Cleaned</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{results.junk_cleaned_mb}MB</p>
              <p className="text-xs text-gray-400">Junk Removed</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{results.memory_released_mb}MB</p>
              <p className="text-xs text-gray-400">Memory Freed</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {results.ai_summary && (
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400 mb-1">Mia's Analysis</p>
              <p className="text-sm text-gray-300 leading-relaxed">{results.ai_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Device Info */}
      {results.device_info && (
        <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Scan Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="text-white ml-2 font-semibold">{results.scan_duration_seconds}s</span>
            </div>
            <div>
              <span className="text-gray-500">Items Scanned:</span>
              <span className="text-white ml-2 font-semibold">{results.device_info.apps_scanned}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className="text-green-400 ml-2 font-semibold">Optimized</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
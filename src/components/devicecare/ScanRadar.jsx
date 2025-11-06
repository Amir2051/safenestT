import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

export default function ScanRadar({ scanning, progress, currentScan }) {
  return (
    <div className="relative">
      {/* Radar Circle */}
      <div className="relative w-64 h-64 mx-auto mb-6">
        {/* Outer rings */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
        <div className="absolute inset-4 rounded-full border-2 border-cyan-500/15" />
        <div className="absolute inset-8 rounded-full border-2 border-cyan-500/10" />
        
        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-500 ${
            scanning 
              ? 'from-cyan-500 to-blue-600 shadow-cyan-500/50 animate-pulse' 
              : progress === 100
              ? 'from-green-500 to-emerald-600 shadow-green-500/50'
              : 'from-gray-600 to-gray-700 shadow-gray-600/30'
          }`}>
            {scanning ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : progress === 100 ? (
              <Shield className="w-10 h-10 text-white" />
            ) : (
              <Shield className="w-10 h-10 text-gray-300" />
            )}
          </div>
        </div>

        {/* Scanning wave effect */}
        {scanning && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-cyan-400/10 animate-pulse" />
            
            {/* Rotating scanner line */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent transform -translate-x-1/2 -translate-y-1/2 origin-left" />
            </div>
          </>
        )}

        {/* Progress ring */}
        {progress > 0 && (
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              className="text-cyan-500"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <div className="text-4xl font-bold text-white mb-1">
          {scanning ? `${progress}%` : progress === 100 ? '100%' : 'Ready'}
        </div>
        <p className="text-gray-400 text-sm">
          {scanning ? currentScan : progress === 100 ? 'Scan Complete!' : 'Ready to scan your device'}
        </p>
        {scanning && (
          <div className="flex justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
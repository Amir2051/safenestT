import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Eye, EyeOff, Loader2, Info } from 'lucide-react';

export default function PasswordBreachChecker() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [strength, setStrength] = useState(null);

  const checkPasswordBreach = async (pwd) => {
    if (!pwd) return;
    
    setChecking(true);
    setResult(null);
    
    try {
      // Hash password with SHA-1
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);
      
      // FREE API - No key needed! Uses k-anonymity
      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to check password');
      }
      
      const text = await response.text();
      const lines = text.split('\n');
      
      let breachCount = 0;
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          breachCount = parseInt(count.trim());
          break;
        }
      }
      
      setResult({
        breached: breachCount > 0,
        count: breachCount
      });
      
    } catch (error) {
      console.error('Error checking password:', error);
      setResult({ error: true });
    }
    
    setChecking(false);
  };

  const calculateStrength = (pwd) => {
    if (!pwd) return null;
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    const percentage = (score / 6) * 100;
    
    if (score <= 2) return { level: 'weak', color: 'bg-red-500', percentage };
    if (score <= 4) return { level: 'medium', color: 'bg-yellow-500', percentage };
    return { level: 'strong', color: 'bg-green-500', percentage };
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setStrength(calculateStrength(pwd));
    setResult(null);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Password Security Checker
        </CardTitle>
        <p className="text-sm text-gray-400">
          Check if your password has been exposed in data breaches (100% FREE & Unlimited)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter password to check..."
            className="bg-[#0f1419] border-purple-500/20 text-white pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength Indicator */}
        {strength && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Password Strength:</span>
              <Badge className={`${
                strength.level === 'strong' ? 'bg-green-500/20 text-green-400' :
                strength.level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {strength.level}
              </Badge>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all duration-300`}
                style={{ width: `${strength.percentage}%` }}
              />
            </div>
          </div>
        )}

        <Button
          onClick={() => checkPasswordBreach(password)}
          disabled={!password || checking}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Check if Breached
            </>
          )}
        </Button>

        {/* Results */}
        {result && !result.error && (
          <div className={`p-4 rounded-lg border ${
            result.breached 
              ? 'bg-red-500/10 border-red-500/30' 
              : 'bg-green-500/10 border-green-500/30'
          }`}>
            {result.breached ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="text-red-400 font-semibold">Password Compromised!</h3>
                </div>
                <p className="text-sm text-gray-300">
                  This password appeared in <strong className="text-red-400">{result.count.toLocaleString()}</strong> data breaches.
                </p>
                <p className="text-xs text-red-300 font-semibold">
                  🚨 Never use this password! Create a new, unique password immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className="text-green-400 font-semibold">Password Safe</h3>
                </div>
                <p className="text-sm text-gray-300">
                  This password has not been found in any known breaches.
                </p>
                <p className="text-xs text-gray-400">
                  💡 Still, use unique passwords for each account and enable 2FA.
                </p>
              </div>
            )}
          </div>
        )}

        {result && result.error && (
          <div className="p-4 rounded-lg border bg-gray-500/10 border-gray-500/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <h3 className="text-gray-300 font-semibold">Unable to Check</h3>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Please try again in a moment.
            </p>
          </div>
        )}

        {/* Privacy Note */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-cyan-400 mb-1">🔒 Privacy Protected</h4>
              <p className="text-xs text-gray-300">
                Your password is never sent to our servers. We use k-anonymity hashing (only first 5 chars of SHA-1 hash) to check breaches without revealing your password.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
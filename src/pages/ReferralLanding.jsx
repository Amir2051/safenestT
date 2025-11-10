import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Gift, CheckCircle, Loader2, Users, Sparkles, 
  Home, Scale, Lock, Radio, TrendingUp, ArrowRight
} from "lucide-react";

export default function ReferralLanding() {
  const [referralCode, setReferralCode] = useState('');
  const [validating, setValidating] = useState(true);
  const [referrerName, setReferrerName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // Get referral code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (!refCode) {
        // No referral code, redirect to home
        navigate(createPageUrl('Dashboard'));
        return;
      }

      setReferralCode(refCode.toUpperCase());

      // Check if user is already authenticated
      try {
        const user = await base44.auth.me();
        setIsAuthenticated(true);
        
        // If already authenticated and has referral code, redirect to onboarding
        if (!user.referred_by && !user.onboarding_completed) {
          navigate(`/onboarding?ref=${refCode}`);
        } else if (user.referred_by) {
          // Already used a referral code
          navigate(createPageUrl('Dashboard'));
        } else {
          // Completed onboarding without referral
          navigate(createPageUrl('Dashboard'));
        }
      } catch {
        // Not authenticated, continue with landing page
        setIsAuthenticated(false);
      }

      // Validate referral code
      try {
        const response = await base44.functions.invoke('referralService', {
          endpoint: 'validate-code',
          code: refCode.toUpperCase()
        });

        if (response.data.valid) {
          setIsValid(true);
          setReferrerName(response.data.referrer_name);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error('Validate error:', error);
        setIsValid(false);
      } finally {
        setValidating(false);
      }
    };

    init();
  }, [navigate]);

  const handleSignUp = () => {
    // Store referral code in sessionStorage to preserve through auth
    sessionStorage.setItem('pending_referral_code', referralCode);
    
    // Redirect to sign up with nextUrl that includes ref code
    const nextUrl = `/onboarding?ref=${referralCode}`;
    base44.auth.redirectToLogin(nextUrl);
  };

  if (validating || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30 max-w-md">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Invalid Referral Code</h2>
            <p className="text-gray-400 mb-6">
              The referral code <strong className="text-red-400">{referralCode}</strong> is not valid.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-12">
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/30 animate-pulse">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to SafeNest!
          </h1>
          <p className="text-xl text-gray-400">
            You've been invited by <strong className="text-cyan-400">{referrerName}</strong>
          </p>
        </div>

        {/* Referral Bonus Card */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/50 mb-8 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl">
                <Gift className="w-16 h-16 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-white mb-3">
                  🎁 Get 1 Month FREE Premium!
                </h2>
                <p className="text-purple-200 text-lg mb-4">
                  Sign up now and unlock all premium features for <strong>30 days</strong> - completely free!
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/50 text-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    No Credit Card Required
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 text-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Full Access
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 text-sm">
                    <Users className="w-3 h-3 mr-1" />
                    Thanks to {referrerName}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <Home className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Title Protection</h3>
              <p className="text-gray-400 text-sm">
                AI-powered monitoring of NYC property records to detect fraud and unauthorized changes.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Scale className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Legal Support</h3>
              <p className="text-gray-400 text-sm">
                Access to licensed attorneys, legal AI assistant, and automated document generation.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Identity Monitor</h3>
              <p className="text-gray-400 text-sm">
                Dark web scanning, breach monitoring, and encrypted vault for sensitive data.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-sky-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center mb-4">
                <Radio className="w-7 h-7 text-sky-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Signal Watch</h3>
              <p className="text-gray-400 text-sm">
                Real-time cellular network monitoring to detect suspicious tower activity.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Credit Monitor</h3>
              <p className="text-gray-400 text-sm">
                FCRA-compliant credit score monitoring with encrypted PII storage.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-pink-500/20">
            <CardContent className="p-6">
              <div className="w-14 h-14 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">AI Assistants</h3>
              <p className="text-gray-400 text-sm">
                Mia (Security) and Lex (Legal) - 24/7 AI-powered assistance.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/30 shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="inline-block px-6 py-2 bg-purple-500/20 rounded-full border border-purple-500/50 mb-6">
                <p className="text-purple-300 font-semibold">
                  🎟️ Referral Code: <span className="text-white font-mono">{referralCode}</span>
                </p>
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Create your free account and unlock 1 month of premium access instantly!
              </p>

              <Button
                onClick={handleSignUp}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg px-12 py-6 h-auto rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
              >
                Sign Up for FREE
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>

              <p className="text-gray-500 text-sm mt-6">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 mb-6">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => {
                sessionStorage.setItem('pending_referral_code', referralCode);
                base44.auth.redirectToLogin(`/onboarding?ref=${referralCode}`);
              }}
              className="text-cyan-400 hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, Shield, CheckCircle, Zap, Lock, Eye, 
  Sparkles, TrendingUp, Users, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReferralLanding() {
  const [referralCode, setReferralCode] = useState('');
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // User already logged in, redirect to dashboard
          navigate(createPageUrl("Dashboard"));
          return;
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    // Get referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      setReferralCode(refCode);
      // Store in localStorage for signup process
      localStorage.setItem('pending_referral_code', refCode);
      localStorage.setItem('referral_code_timestamp', Date.now().toString());

      // Simulate getting referrer info (in production, fetch from API)
      setReferrerInfo({
        code: refCode,
        message: 'Your friend invited you to SafeNest!'
      });
    }

    checkAuth();
  }, [navigate]);

  const handleSignup = () => {
    // Redirect to Base44 login/signup with referral code stored
    const nextUrl = createPageUrl("Dashboard");
    base44.auth.redirectToLogin(nextUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1a2e] to-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">SafeNest</h1>
              <p className="text-cyan-400 text-sm font-semibold">Complete Security Protection</p>
            </div>
          </div>

          {referrerInfo && (
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-3 rounded-full border border-purple-500/30 mb-4">
              <Gift className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">You've Been Invited!</span>
              <Badge className="bg-purple-500/30 text-purple-300 ml-2">
                Code: {referralCode}
              </Badge>
            </div>
          )}

          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            {referrerInfo 
              ? "Join SafeNest & Get 3 Days Free!"
              : "Welcome to SafeNest"
            }
          </h2>
          <p className="text-xl text-gray-400">
            Complete security protection powered by OWASP standards
          </p>
        </div>

        {/* Special Offer */}
        {referrerInfo && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-green-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">🎁 Special Referral Bonus</h3>
                  <p className="text-green-300 text-sm">
                    Sign up now and get <strong>3 days of full premium access FREE</strong> using code: {referralCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">OWASP Protected</h3>
              <p className="text-sm text-gray-400">
                100% coverage of OWASP Top 10 vulnerabilities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Dark Web Monitor</h3>
              <p className="text-sm text-gray-400">
                Monitor emails and passwords for data breaches
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Password Vault</h3>
              <p className="text-sm text-gray-400">
                Secure unlimited passwords with AES-256 encryption
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Auto Protection</h3>
              <p className="text-sm text-gray-400">
                AI-powered automatic security responses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Security Score</h3>
              <p className="text-sm text-gray-400">
                Real-time security posture monitoring
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-pink-500/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Credit Card Monitor</h3>
              <p className="text-sm text-gray-400">
                Monitor cards for breaches and fraud
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              {referrerInfo ? "Accept Your Invitation" : "Get Started Today"}
            </h3>
            <p className="text-purple-300 mb-6">
              {referrerInfo 
                ? "Start your 3-day free trial and experience complete security protection"
                : "Join thousands of protected users worldwide"
              }
            </p>
            
            <Button
              onClick={handleSignup}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-6 text-lg"
            >
              {referrerInfo ? (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Your 3-Day Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {referrerInfo && (
              <p className="text-sm text-gray-400 mt-4">
                Using referral code: <strong className="text-purple-400">{referralCode}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400 mb-1">100K+</p>
            <p className="text-sm text-gray-400">Protected Users</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400 mb-1">2.5M</p>
            <p className="text-sm text-gray-400">Breaches Detected</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400 mb-1">100%</p>
            <p className="text-sm text-gray-400">OWASP Coverage</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-400 mb-1">4.8★</p>
            <p className="text-sm text-gray-400">Average Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}
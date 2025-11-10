import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, Share2, Mail, MessageSquare, Home, Users, 
  Sparkles, CheckCircle, Twitter, Facebook, Linkedin
} from "lucide-react";
import { toast } from "sonner";

export default function ReferralShareWidget({ user, variant = "full" }) {
  const [copied, setCopied] = useState(null);

  const APP_URL = window.location.origin;
  
  const links = {
    general: `${APP_URL}?ref=${user?.referral_code}`,
    titleProtection: `${APP_URL}${window.location.pathname.includes('/title-protection') ? '/title-protection' : '/title-protection'}?ref=${user?.referral_code}`,
    legalSupport: `${APP_URL}/legal-support?ref=${user?.referral_code}`
  };

  const copyLink = (linkType) => {
    navigator.clipboard.writeText(links[linkType]);
    setCopied(linkType);
    toast.success('✅ Link copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const shareViaEmail = (linkType) => {
    const link = links[linkType];
    let subject = '';
    let body = '';

    if (linkType === 'titleProtection') {
      subject = encodeURIComponent('🏠 Protect Your Property from Fraud - FREE!');
      body = encodeURIComponent(
        `Hi there!\n\n` +
        `I'm using SafeNest to protect my property from title fraud. I think you should check it out!\n\n` +
        `🏠 FREE Title Protection:\n` +
        `• Monitor NYC property records 24/7\n` +
        `• AI-powered threat detection\n` +
        `• Digital Title Lock\n` +
        `• Legal support included\n\n` +
        `🎁 Use my referral code: ${user.referral_code}\n\n` +
        `Sign up here: ${link}\n\n` +
        `100% FREE - No credit card required!\n\n` +
        `Best regards,\n${user.full_name}`
      );
    } else if (linkType === 'legalSupport') {
      subject = encodeURIComponent('⚖️ Free Legal Support for Property Protection');
      body = encodeURIComponent(
        `Hi!\n\n` +
        `I found an amazing FREE legal support service for property owners.\n\n` +
        `⚖️ Legal Support Features:\n` +
        `• Free attorney consultations\n` +
        `• Auto-generated legal documents\n` +
        `• Secure document storage\n` +
        `• NYC Bar-verified attorneys\n\n` +
        `🎁 Use my code: ${user.referral_code}\n\n` +
        `Get started: ${link}\n\n` +
        `Completely FREE!\n\n` +
        `${user.full_name}`
      );
    }

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = (linkType) => {
    const link = links[linkType];
    const message = encodeURIComponent(
      `${linkType === 'titleProtection' ? '🏠 Protect your property!' : '⚖️ Free legal help!'}\n\n` +
      `SafeNest - 100% FREE\n\n` +
      `Code: ${user.referral_code}\n` +
      `${link}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaWhatsApp = (linkType) => {
    const link = links[linkType];
    let message = '';

    if (linkType === 'titleProtection') {
      message = encodeURIComponent(
        `Hi! 👋\n\n` +
        `I'm protecting my property with SafeNest and thought you might be interested!\n\n` +
        `🏠 *Title Protection Features:*\n` +
        `✅ 24/7 NYC ACRIS Monitoring\n` +
        `✅ AI Threat Detection\n` +
        `✅ Digital Title Lock\n` +
        `✅ Legal Support\n\n` +
        `Use my code: *${user.referral_code}*\n\n` +
        `Sign up: ${link}\n\n` +
        `100% FREE Forever! 🎉`
      );
    } else if (linkType === 'legalSupport') {
      message = encodeURIComponent(
        `Hi! 👋\n\n` +
        `Need legal help for property issues? SafeNest has FREE attorney access!\n\n` +
        `⚖️ *Legal Support:*\n` +
        `✅ Free 30-min consultations\n` +
        `✅ Bar-verified attorneys\n` +
        `✅ Document templates\n` +
        `✅ Secure storage\n\n` +
        `Code: *${user.referral_code}*\n\n` +
        `${link}\n\n` +
        `Completely FREE! 🎁`
      );
    }

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaTwitter = (linkType) => {
    const link = links[linkType];
    const text = linkType === 'titleProtection'
      ? `🏠 Protecting my property from fraud with @SafeNest!\n\n✅ FREE Title Protection\n✅ AI Monitoring\n✅ Legal Support\n\nUse code ${user.referral_code} 👇`
      : `⚖️ Free legal support for property owners!\n\n✅ Attorney access\n✅ Document templates\n✅ Secure storage\n\nCode: ${user.referral_code} 👇`;
    
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
  };

  const shareViaFacebook = (linkType) => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(links[linkType])}`, '_blank');
  };

  const shareViaLinkedIn = (linkType) => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(links[linkType])}`, '_blank');
  };

  if (variant === "compact") {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => copyLink('titleProtection')}
          size="sm"
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          {copied === 'titleProtection' ? (
            <CheckCircle className="w-4 h-4 mr-1" />
          ) : (
            <Copy className="w-4 h-4 mr-1" />
          )}
          Copy Link
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-white font-bold text-lg mb-2 flex items-center justify-center gap-2">
            <Share2 className="w-5 h-5 text-purple-400" />
            Share Your Referral Links
          </h3>
          <p className="text-gray-400 text-sm">
            Choose which service to promote for maximum rewards
          </p>
        </div>

        {/* Title Protection Link */}
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-5 h-5 text-cyan-400" />
            <h4 className="text-white font-bold">Title Protection</h4>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs ml-auto">
              +30 credits
            </Badge>
          </div>
          <div className="p-2 bg-[#0f1419] rounded text-xs text-gray-300 mb-3 break-all border border-cyan-500/10">
            {links.titleProtection}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => copyLink('titleProtection')}
              size="sm"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              {copied === 'titleProtection' ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</>
              ) : (
                <><Copy className="w-3 h-3 mr-1" /> Copy</>
              )}
            </Button>
            <Button
              onClick={() => shareViaEmail('titleProtection')}
              size="sm"
              variant="outline"
              className="border-cyan-500/20 text-cyan-400"
            >
              <Mail className="w-3 h-3 mr-1" /> Email
            </Button>
            <Button
              onClick={() => shareViaWhatsApp('titleProtection')}
              size="sm"
              variant="outline"
              className="border-cyan-500/20 text-cyan-400"
            >
              <MessageSquare className="w-3 h-3 mr-1" /> SMS
            </Button>
          </div>
        </div>

        {/* Legal Support Link */}
        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-bold">Legal Support</h4>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs ml-auto">
              +50 credits
            </Badge>
          </div>
          <div className="p-2 bg-[#0f1419] rounded text-xs text-gray-300 mb-3 break-all border border-purple-500/10">
            {links.legalSupport}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => copyLink('legalSupport')}
              size="sm"
              className="flex-1 bg-purple-500 hover:bg-purple-600"
            >
              {copied === 'legalSupport' ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Copied!</>
              ) : (
                <><Copy className="w-3 h-3 mr-1" /> Copy</>
              )}
            </Button>
            <Button
              onClick={() => shareViaEmail('legalSupport')}
              size="sm"
              variant="outline"
              className="border-purple-500/20 text-purple-400"
            >
              <Mail className="w-3 h-3 mr-1" /> Email
            </Button>
            <Button
              onClick={() => shareViaWhatsApp('legalSupport')}
              size="sm"
              variant="outline"
              className="border-purple-500/20 text-purple-400"
            >
              <MessageSquare className="w-3 h-3 mr-1" /> SMS
            </Button>
          </div>
        </div>

        {/* Social Sharing */}
        <div className="pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs mb-3 text-center">Share on Social Media:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => shareViaTwitter('titleProtection')}
              size="sm"
              variant="outline"
              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
            >
              <Twitter className="w-4 h-4 mr-1" /> Twitter
            </Button>
            <Button
              onClick={() => shareViaFacebook('titleProtection')}
              size="sm"
              variant="outline"
              className="border-blue-600/20 text-blue-500 hover:bg-blue-600/10"
            >
              <Facebook className="w-4 h-4 mr-1" /> Facebook
            </Button>
            <Button
              onClick={() => shareViaLinkedIn('titleProtection')}
              size="sm"
              variant="outline"
              className="border-blue-700/20 text-blue-600 hover:bg-blue-700/10"
            >
              <Linkedin className="w-4 h-4 mr-1" /> LinkedIn
            </Button>
          </div>
        </div>

        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-300 text-xs">
            <Sparkles className="w-3 h-3 inline mr-1" />
            <strong>Pro Tip:</strong> Legal Support referrals earn 50 credits (vs 30 for Title Protection). 
            Share both links to maximize rewards!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
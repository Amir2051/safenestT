import React from 'react';
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Copy, Share2, Facebook, Twitter } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareButtons({ referralCode, referralLink }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  const shareViaEmail = () => {
    const subject = 'Join SafeNest - Get 3 Days Free!';
    const body = `Hey! I'm using SafeNest for complete security protection and I thought you'd love it too!\n\nUse my referral code: ${referralCode}\nOr click here: ${referralLink}\n\nYou'll get 3 days free trial, and I'll earn premium access too! 🎉`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaSMS = () => {
    const message = `Join SafeNest for complete security! Use my code: ${referralCode}\n${referralLink}`;
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  const shareViaWhatsApp = () => {
    const message = `🛡️ Join SafeNest for complete security protection!\n\nUse my referral code: *${referralCode}*\n${referralLink}\n\nGet 3 days free + we both get rewards! 🎉`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = `Just secured my digital life with @SafeNest 🛡️\n\nJoin me and get 3 days free! Use code: ${referralCode}\n${referralLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SafeNest',
          text: `Join SafeNest for complete security! Use my code: ${referralCode}`,
          url: referralLink
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      <Button
        onClick={copyToClipboard}
        variant="outline"
        className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Link
      </Button>

      <Button
        onClick={shareViaEmail}
        variant="outline"
        className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
      >
        <Mail className="w-4 h-4 mr-2" />
        Email
      </Button>

      <Button
        onClick={shareViaSMS}
        variant="outline"
        className="border-green-500/20 text-green-400 hover:bg-green-500/10"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        SMS
      </Button>

      <Button
        onClick={shareViaWhatsApp}
        variant="outline"
        className="border-green-500/20 text-green-400 hover:bg-green-500/10"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        WhatsApp
      </Button>

      <Button
        onClick={shareViaTwitter}
        variant="outline"
        className="border-blue-400/20 text-blue-400 hover:bg-blue-400/10"
      >
        <Twitter className="w-4 h-4 mr-2" />
        Twitter
      </Button>

      <Button
        onClick={shareViaFacebook}
        variant="outline"
        className="border-blue-600/20 text-blue-600 hover:bg-blue-600/10"
      >
        <Facebook className="w-4 h-4 mr-2" />
        Facebook
      </Button>

      <Button
        onClick={shareNative}
        variant="outline"
        className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
      >
        <Share2 className="w-4 h-4 mr-2" />
        More
      </Button>
    </div>
  );
}
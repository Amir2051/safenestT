import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UpgradePrompt({ feature, onClose, inline = false }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Track that upgrade prompt was shown
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({
      type: 'upgrade_prompt_shown',
      feature,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('analytics_events', JSON.stringify(events));
  }, [feature]);

  const handleClose = () => {
    setShow(false);
    if (onClose) onClose();
  };

  if (!show) return null;

  if (inline) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Unlock {feature}</p>
              <p className="text-gray-400 text-xs">Upgrade to premium starting at $9.99/month</p>
            </div>
            <Link to={createPageUrl("Upgrade")}>
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Upgrade
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Unlock {feature}</h2>
            <p className="text-gray-400">Upgrade to premium for full access</p>
          </div>

          {/* Features */}
          <div className="bg-[#0f1419] rounded-lg p-4 mb-6 border border-purple-500/20">
            <h3 className="text-white font-semibold mb-3 text-sm">With Premium you get:</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-300">✅ Real-time breach monitoring</li>
              <li className="text-gray-300">✅ Unlimited vault storage</li>
              <li className="text-gray-300">✅ VPN protection</li>
              <li className="text-gray-300">✅ Priority support</li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Basic Plan</p>
              <p className="text-2xl font-bold text-white">$9.99</p>
              <p className="text-xs text-gray-400">/month</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                Popular
              </div>
              <p className="text-xs text-gray-400 mb-1">Elite Plan</p>
              <p className="text-2xl font-bold text-white">$19.99</p>
              <p className="text-xs text-gray-400">/month</p>
            </div>
          </div>

          {/* CTA */}
          <Link to={createPageUrl("Upgrade")}>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-6 text-lg font-semibold">
              View All Plans
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-center text-gray-500 text-xs mt-4">
            14-day free trial • 30-day money-back guarantee • Cancel anytime
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
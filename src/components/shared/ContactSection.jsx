import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Shield } from "lucide-react";

export default function ContactSection() {
  const handleEmailClick = () => {
    window.location.href = "mailto:support@safenestt.com";
  };

  return (
    <section className="w-full py-8 mt-8">
      <Card className="bg-gradient-to-r from-[#1a2332] to-[#0f1419] border-cyan-500/20 overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <CardContent className="p-8 md:p-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="space-y-4 text-center md:text-left max-w-2xl">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-cyan-400 font-semibold tracking-wide text-sm uppercase">
                  Here to Help
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Need assistance with a case?
              </h2>
              
              <p className="text-gray-400 text-lg leading-relaxed">
                Our dedicated cybersecurity team is ready to assist you. Whether you need to report a new incident, have questions about our tools, or need technical support, we're just an email away.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 min-w-[280px]">
              <div className="p-1 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 backdrop-blur-sm">
                <Button 
                  onClick={handleEmailClick}
                  className="w-full h-14 px-8 bg-[#0f1419] hover:bg-[#1a2332] text-white border border-cyan-500/20 flex items-center justify-center gap-3 transition-all duration-300 group"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Mail className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="font-mono text-lg">support@safenestt.com</span>
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" />
                Typical response time: &lt; 24 hours
              </p>
            </div>

          </div>
        </CardContent>
      </Card>
    </section>
  );
}
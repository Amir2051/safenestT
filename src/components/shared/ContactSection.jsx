import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Shield, Phone, FileSearch, AlertTriangle, Bot } from "lucide-react";

export default function ContactSection() {
  const contacts = [
    {
      label: "General Support",
      email: "support@safenestt.com",
      icon: Mail,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      desc: "For general inquiries and assistance"
    },
    {
      label: "Forensic Team",
      email: "forensic@safenestt.com",
      icon: FileSearch,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      desc: "Deep dive investigation support"
    },
    {
      label: "Threat Intelligence",
      email: "threatintel@safenestt.com",
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      desc: "Report active threats and intel"
    }
  ];

  return (
    <section className="w-full py-8 mt-8">
      <Card className="bg-gradient-to-r from-[#1a2332] to-[#0f1419] border-cyan-500/20 overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <CardContent className="p-8 md:p-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Left Column: Header & Phone */}
            <div className="flex-1 space-y-8">
              <div className="space-y-4 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-cyan-400 font-semibold tracking-wide text-sm uppercase">
                    Here to Help
                  </span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Need assistance with a case?
                </h2>
                
                <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Our dedicated cybersecurity team is ready to assist you. Report incidents, request forensic analysis, or get immediate support through our specialized channels.
                </p>
              </div>

              {/* Phone Contacts - Prominent */}
              <div className="space-y-4 max-w-md mx-auto lg:mx-0">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-200 font-medium mb-1">24/7 Support Line</p>
                      <a href="tel:8776772336" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                        (877) 677-2336
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-200 font-medium mb-1">MIA – AI Receptionist</p>
                      <a href="tel:16506754166" className="text-2xl font-bold text-white hover:text-purple-300 transition-colors">
                        +1 650-675-4166
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Email Channels */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contacts.map((contact, idx) => (
                <div 
                  key={idx}
                  className="p-5 rounded-xl bg-[#0f1419]/80 border border-gray-800 hover:border-gray-600 transition-all group flex flex-col justify-between"
                >
                  <div className="mb-4">
                    <div className={`w-10 h-10 rounded-lg ${contact.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <contact.icon className={`w-5 h-5 ${contact.color}`} />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{contact.label}</h3>
                    <p className="text-xs text-gray-400">{contact.desc}</p>
                  </div>
                  
                  <a 
                    href={`mailto:${contact.email}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#1a2332] group-hover:bg-[#253042] transition-colors"
                  >
                    <span className="text-sm text-gray-300 truncate mr-2">{contact.email}</span>
                    <Mail className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </a>
                </div>
              ))}
            </div>

          </div>
        </CardContent>
      </Card>
    </section>
  );
}
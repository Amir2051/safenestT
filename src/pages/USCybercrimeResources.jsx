import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ExternalLink, Shield, ShieldAlert, Smartphone,
  Lock, MapPin, ChevronRight, Globe, FileText, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import ScamReportModal from "@/components/resources/ScamReportModal";
import { HackedGuideModal, SIMSwapModal, CreditFreezeModal, CyberUnitModal } from "@/components/resources/ProtectionGuides";

const FEDERAL_AGENCIES = [
  {
    id: "fbi",
    name: "FBI",
    full_name: "Federal Bureau of Investigation",
    description: "Handles major cybercrime, organized fraud, hacking, ransomware, and terrorism-related cyber threats.",
    button_label: "Submit Tip",
    url: "https://tips.fbi.gov",
    color: "blue",
    badge: "FEDERAL",
    icon_letter: "F",
    specialties: ["Cybercrime", "Organized Fraud", "Hacking", "Ransomware"],
  },
  {
    id: "ic3",
    name: "IC3",
    full_name: "Internet Crime Complaint Center",
    description: "The FBI's official platform to report online scams, phishing, crypto fraud, investment scams, and romance scams.",
    button_label: "File IC3 Complaint",
    url: "https://www.ic3.gov",
    color: "red",
    badge: "REPORT",
    icon_letter: "I",
    specialties: ["Crypto Fraud", "Phishing", "Investment Scams", "Romance Scams"],
  },
  {
    id: "ftc",
    name: "FTC",
    full_name: "Federal Trade Commission",
    description: "Report consumer fraud, deceptive business practices, identity theft, and scam operations targeting Americans.",
    button_label: "Report to FTC",
    url: "https://reportfraud.ftc.gov",
    color: "cyan",
    badge: "CONSUMER",
    icon_letter: "F",
    specialties: ["Consumer Fraud", "Identity Theft", "Deceptive Businesses"],
  },
  {
    id: "identitytheft",
    name: "IdentityTheft.gov",
    full_name: "FTC Identity Theft Recovery",
    description: "Official U.S. government site to create a personalized identity theft recovery plan and dispute fraudulent accounts.",
    button_label: "Start Recovery Plan",
    url: "https://www.identitytheft.gov",
    color: "purple",
    badge: "IDENTITY",
    icon_letter: "ID",
    specialties: ["Identity Theft Recovery", "Credit Disputes", "Account Fraud"],
  },
  {
    id: "usss",
    name: "U.S. Secret Service",
    full_name: "United States Secret Service — Financial Crimes",
    description: "Report financial cybercrime, credit card fraud, counterfeit currency, and large-scale financial network intrusions.",
    button_label: "Financial Crime Info",
    url: "https://www.secretservice.gov/investigation",
    color: "gray",
    badge: "FEDERAL",
    icon_letter: "SS",
    specialties: ["Financial Cybercrime", "Credit Card Fraud", "Network Intrusions"],
  },
];

const COLOR_MAP = {
  blue:   { border: "border-blue-500/40",   bg: "bg-blue-500/10",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/50",   btn: "bg-blue-600 hover:bg-blue-700" },
  red:    { border: "border-red-500/40",    bg: "bg-red-500/10",    text: "text-red-400",    badge: "bg-red-500/20 text-red-400 border-red-500/50",    btn: "bg-red-600 hover:bg-red-700" },
  cyan:   { border: "border-cyan-500/40",   bg: "bg-cyan-500/10",   text: "text-cyan-400",   badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",   btn: "bg-cyan-600 hover:bg-cyan-700" },
  purple: { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/20 text-purple-400 border-purple-500/50", btn: "bg-purple-600 hover:bg-purple-700" },
  gray:   { border: "border-gray-500/40",   bg: "bg-gray-500/10",   text: "text-gray-300",   badge: "bg-gray-500/20 text-gray-300 border-gray-500/50",   btn: "bg-gray-600 hover:bg-gray-500" },
};

function AgencyCard({ agency, index }) {
  const c = COLOR_MAP[agency.color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`relative p-5 bg-[#0d1117] border ${c.border} rounded-xl flex flex-col gap-3 hover:shadow-lg transition-all group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
            <span className={`font-black text-sm ${c.text}`}>{agency.icon_letter}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-bold text-lg">{agency.name}</h3>
              <Badge className={`text-[10px] px-1.5 ${c.badge} border`}>{agency.badge}</Badge>
            </div>
            <p className={`text-xs ${c.text} font-medium`}>{agency.full_name}</p>
          </div>
        </div>
      </div>

      <p className="text-gray-400 text-sm leading-relaxed">{agency.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {agency.specialties.map(s => (
          <span key={s} className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-[11px] border border-gray-700">
            {s}
          </span>
        ))}
      </div>

      <a href={agency.url} target="_blank" rel="noopener noreferrer">
        <Button className={`w-full ${c.btn} text-white font-semibold flex items-center justify-center gap-2`}>
          <ExternalLink className="w-4 h-4" />
          {agency.button_label}
        </Button>
      </a>
    </motion.div>
  );
}

export default function USCybercrimeResources() {
  const [showReport, setShowReport] = useState(false);
  const [showHacked, setShowHacked] = useState(false);
  const [showSIM, setShowSIM] = useState(false);
  const [showFreeze, setShowFreeze] = useState(false);
  const [showCyberUnit, setShowCyberUnit] = useState(false);

  const protectionTools = [
    {
      icon: ShieldAlert,
      title: "What To Do If You've Been Hacked",
      description: "Step-by-step emergency guide — act fast to limit damage.",
      color: "orange",
      action: () => setShowHacked(true),
      label: "View Guide"
    },
    {
      icon: Smartphone,
      title: "SIM Swap Emergency Steps",
      description: "Your phone number was stolen. Follow this checklist immediately.",
      color: "purple",
      action: () => setShowSIM(true),
      label: "View Checklist"
    },
    {
      icon: Lock,
      title: "Freeze Your Credit",
      description: "Block new accounts from being opened in your name. Free & reversible.",
      color: "blue",
      action: () => setShowFreeze(true),
      label: "Freeze Now"
    },
    {
      icon: MapPin,
      title: "Find Local Police Cyber Unit",
      description: "Search by state to locate your local law enforcement cybercrime unit.",
      color: "cyan",
      action: () => setShowCyberUnit(true),
      label: "Search by State"
    },
  ];

  const toolColorMap = {
    orange: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", btn: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-500/10", text: "text-purple-400", btn: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10" },
    blue:   { border: "border-blue-500/30",   bg: "bg-blue-500/10",   text: "text-blue-400",   btn: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10" },
    cyan:   { border: "border-cyan-500/30",   bg: "bg-cyan-500/10",   text: "text-cyan-400",   btn: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" },
  };

  return (
    <div className="min-h-screen bg-[#060b12] text-white p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-500/20 rounded-lg border border-red-500/40 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">U.S. Cybercrime Resources</h1>
            <p className="text-gray-400 text-sm">Official federal agencies & emergency protection tools</p>
          </div>
        </div>

        {/* REPORT A SCAM CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 p-5 bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-red-300 font-bold text-lg">Victim of a Scam?</span>
            </div>
            <p className="text-gray-300 text-sm">
              Submit a confidential report to SafeNestt. Our team reviews all submissions and may forward to U.S. authorities.
            </p>
          </div>
          <Button
            onClick={() => setShowReport(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 text-base shrink-0 shadow-lg shadow-red-900/50"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            REPORT A SCAM NOW
          </Button>
        </motion.div>
      </motion.div>

      <div className="max-w-6xl mx-auto space-y-10">

        {/* SECTION A */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-white">Section A — Federal Reporting Agencies</h2>
              <p className="text-gray-500 text-sm">Official U.S. government portals for cybercrime reporting</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {FEDERAL_AGENCIES.map((agency, i) => (
              <AgencyCard key={agency.id} agency={agency} index={i} />
            ))}
          </div>
        </section>

        {/* SECTION B */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-orange-500 rounded-full" />
            <div>
              <h2 className="text-xl font-bold text-white">Section B — Emergency & Protection Tools</h2>
              <p className="text-gray-500 text-sm">Immediate action guides and self-protection resources</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {protectionTools.map((tool, i) => {
              const c = toolColorMap[tool.color];
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`p-5 bg-[#0d1117] border ${c.border} rounded-xl flex items-start gap-4 group hover:shadow-lg transition-all`}
                >
                  <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold mb-1">{tool.title}</h3>
                    <p className="text-gray-400 text-sm mb-3">{tool.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={tool.action}
                      className={`${c.btn} border font-semibold`}
                    >
                      {tool.label}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="p-5 bg-gray-900/50 border border-gray-700/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-gray-400 text-sm leading-relaxed">
            <strong className="text-gray-300">Disclaimer:</strong> SafeNestt is not a law enforcement agency. Reports submitted through this app may be forwarded to appropriate U.S. authorities including the FBI IC3, FTC, and relevant state agencies. This page is provided for informational and reporting purposes only. In case of emergency, call <strong className="text-white">911</strong>.
          </p>
        </div>

        {/* Future expansion hint */}
        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-center">
          <Globe className="w-6 h-6 text-cyan-400/50 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">International resources coming soon — Canada, UK, EU, Australia and more.</p>
        </div>
      </div>

      {/* Modals */}
      <ScamReportModal open={showReport} onClose={() => setShowReport(false)} />
      <HackedGuideModal open={showHacked} onClose={() => setShowHacked(false)} />
      <SIMSwapModal open={showSIM} onClose={() => setShowSIM(false)} />
      <CreditFreezeModal open={showFreeze} onClose={() => setShowFreeze(false)} />
      <CyberUnitModal open={showCyberUnit} onClose={() => setShowCyberUnit(false)} />
    </div>
  );
}
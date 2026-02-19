import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert, Smartphone, Lock, MapPin, CheckCircle2, X,
  ExternalLink, Search, ChevronRight
} from "lucide-react";

const STATE_CYBER_UNITS = {
  "Alabama": "Alabama Law Enforcement Agency (ALEA) – alea.gov",
  "Alaska": "Alaska State Troopers Cyber Unit – dps.alaska.gov",
  "Arizona": "Arizona DPS – azDPS Cybercrime Unit – azdps.gov",
  "California": "California DOJ – eCrime Unit – oag.ca.gov",
  "Colorado": "Colorado Bureau of Investigation – colorado.gov/cbi",
  "Connecticut": "Connecticut State Police – ct.gov/despp",
  "Florida": "FDLE Cyber Crime Unit – fdle.state.fl.us",
  "Georgia": "GBI Cyber Crime Center – gbi.georgia.gov",
  "Illinois": "Illinois State Police Cyber Crimes Unit – isp.illinois.gov",
  "Maryland": "MD Attorney General Cyber Unit – oag.state.md.us",
  "Michigan": "Michigan State Police Cyber Section – michigan.gov/msp",
  "New York": "NYPD Cyber Bureau / NY State Police – troopers.ny.gov",
  "Ohio": "Ohio BCI Cyber Crimes Unit – ohioattorneygeneral.gov",
  "Pennsylvania": "PA State Police Cyber Unit – psp.pa.gov",
  "Texas": "Texas DPS Cyber Crimes – dps.texas.gov",
  "Virginia": "VSP Computer Crimes Unit – vsp.virginia.gov",
  "Washington": "WA State Patrol Special Investigations – wsp.wa.gov",
};

function HackedGuideModal({ open, onClose }) {
  const steps = [
    { step: 1, title: "Disconnect from the Internet", detail: "Immediately unplug ethernet or disable Wi-Fi to stop ongoing intrusion.", urgent: true },
    { step: 2, title: "Change All Passwords Immediately", detail: "Start with email, then banking, then social media. Use a different device if possible.", urgent: true },
    { step: 3, title: "Enable Multi-Factor Authentication (MFA)", detail: "Turn on 2FA on every critical account — email, bank, social media.", urgent: true },
    { step: 4, title: "Scan All Devices for Malware", detail: "Use reputable antivirus (Malwarebytes, Windows Defender, etc.) to do full scans.", urgent: false },
    { step: 5, title: "Check for Unauthorized Access", detail: "Review login history on email, bank accounts, and social media for unknown sessions.", urgent: false },
    { step: 6, title: "Alert Your Bank", detail: "Call your bank immediately to flag suspicious activity and freeze cards if needed.", urgent: true },
    { step: 7, title: "File a Report with IC3", detail: "Go to ic3.gov and file an official Internet Crime Complaint.", urgent: false },
    { step: 8, title: "Contact SafeNestt", detail: "Submit a case report for our team to assist with recovery and evidence collection.", urgent: false },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-orange-500/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-400" />
            What To Do If You've Been Hacked
          </DialogTitle>
          <p className="text-gray-400 text-sm">Follow these steps immediately in order.</p>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {steps.map(s => (
            <div key={s.step} className={`p-3 rounded-lg border flex gap-3 ${s.urgent ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-900/50 border-gray-700/50'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${s.urgent ? 'bg-red-500/30 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
                {s.step}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{s.title}
                  {s.urgent && <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/50 text-[9px]">URGENT</Badge>}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="w-full mt-4 bg-gray-800 hover:bg-gray-700">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

function SIMSwapModal({ open, onClose }) {
  const steps = [
    "Call your carrier IMMEDIATELY and report unauthorized SIM swap",
    "Ask carrier to place a SIM lock / Port Freeze on your account",
    "Change your account PIN / password with your carrier",
    "Remove phone number as 2FA from: email, bank, crypto exchanges",
    "Enable authenticator-app-based 2FA (Google Authenticator, Authy)",
    "Contact your bank — assume all accounts are compromised",
    "Change passwords on all accounts — especially email and banking",
    "Report to FTC at reportfraud.ftc.gov",
    "File IC3 complaint at ic3.gov",
    "Contact your state Attorney General's office",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-purple-500/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-purple-400" />
            SIM Swap Emergency Steps
          </DialogTitle>
          <p className="text-gray-400 text-sm">Your phone number has been stolen. Act fast.</p>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/50 border border-gray-700/40 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <p className="text-gray-200 text-sm">{step}</p>
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="w-full mt-4 bg-gray-800 hover:bg-gray-700">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

function CreditFreezeModal({ open, onClose }) {
  const bureaus = [
    { name: "Equifax", url: "https://www.equifax.com/personal/credit-report-services/credit-freeze/", color: "red", desc: "Free — instant online freeze" },
    { name: "Experian", url: "https://www.experian.com/freeze/center.html", color: "blue", desc: "Free — instant online freeze" },
    { name: "TransUnion", url: "https://www.transunion.com/credit-freeze", color: "purple", desc: "Free — instant online freeze" },
    { name: "ChexSystems", url: "https://www.chexsystems.com/security-freeze/place-freeze", color: "orange", desc: "Covers bank account applications" },
    { name: "Innovis", url: "https://www.innovis.com/personal/securityFreeze", color: "green", desc: "4th major credit bureau" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-blue-500/30 text-white max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-400" />
            Freeze Your Credit
          </DialogTitle>
          <p className="text-gray-400 text-sm">A credit freeze blocks new accounts from being opened in your name. It's free and reversible.</p>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {bureaus.map(b => (
            <a
              key={b.name}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg hover:border-blue-500/40 transition-colors group"
            >
              <div>
                <p className="text-white font-semibold">{b.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{b.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs">FREE</Badge>
                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </a>
          ))}
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-2">
          <p className="text-blue-400 text-xs">💡 Tip: Freeze all three major bureaus (Equifax, Experian, TransUnion) for full protection. You can temporarily lift the freeze when applying for credit.</p>
        </div>
        <Button onClick={onClose} className="w-full mt-4 bg-gray-800 hover:bg-gray-700">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

function CyberUnitModal({ open, onClose }) {
  const [search, setSearch] = useState("");
  const results = Object.entries(STATE_CYBER_UNITS).filter(([state]) =>
    state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0f1a] border-cyan-500/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-cyan-400" />
            Find Local Police Cyber Unit
          </DialogTitle>
          <p className="text-gray-400 text-sm">Search by state to find your local cybercrime unit.</p>
        </DialogHeader>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Type your state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-[#0f1419] border-gray-700 text-white"
          />
        </div>
        <div className="space-y-2 mt-3">
          {(search ? results : Object.entries(STATE_CYBER_UNITS)).map(([state, info]) => (
            <div key={state} className="p-3 bg-gray-900/50 border border-gray-700/40 rounded-lg">
              <p className="text-cyan-400 font-semibold text-sm">{state}</p>
              <p className="text-gray-300 text-xs mt-0.5">{info}</p>
            </div>
          ))}
          {search && results.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No results found. Try the FBI or IC3 for federal reporting.</p>
          )}
        </div>
        <Button onClick={onClose} className="w-full mt-4 bg-gray-800 hover:bg-gray-700">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

export { HackedGuideModal, SIMSwapModal, CreditFreezeModal, CyberUnitModal };
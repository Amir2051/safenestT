import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Phone, Mail, MapPin, FileText, Shield } from "lucide-react";

const agencies = [
  {
    name: "FBI - Internet Crime Complaint Center (IC3)",
    type: "Federal",
    description: "Primary reporting portal for internet-related crime including cyber fraud",
    website: "https://www.ic3.gov",
    submitUrl: "https://www.ic3.gov/Home/FileComplaint",
    phone: "1-800-225-5324",
    capabilities: ["Crypto theft", "Phishing", "Investment fraud", "Romance scams"],
    priority: "primary",
    icon: Shield
  },
  {
    name: "FBI Field Office Locator",
    type: "Federal",
    description: "Find your nearest FBI field office for in-person reporting",
    website: "https://www.fbi.gov/contact-us/field-offices",
    capabilities: ["Local investigations", "In-person reports", "Evidence submission"],
    priority: "primary",
    icon: MapPin
  },
  {
    name: "Federal Trade Commission (FTC)",
    type: "Federal",
    description: "Consumer protection agency for fraud reporting",
    website: "https://reportfraud.ftc.gov",
    submitUrl: "https://reportfraud.ftc.gov/#/",
    phone: "1-877-382-4357",
    capabilities: ["Investment scams", "Identity theft", "Business fraud"],
    priority: "primary",
    icon: Shield
  },
  {
    name: "Homeland Security Investigations (HSI)",
    type: "Federal",
    description: "DHS investigative arm handling transnational crime",
    website: "https://www.ice.gov/about-hsi",
    submitUrl: "https://www.ice.gov/webform/hsi-tip-form",
    phone: "1-866-347-2423",
    capabilities: ["International fraud", "Money laundering", "Cyber crimes"],
    priority: "secondary",
    icon: Shield
  },
  {
    name: "US Secret Service - Cyber Fraud Task Force",
    type: "Federal",
    description: "Investigates financial and electronic crimes",
    website: "https://www.secretservice.gov/investigations",
    phone: "202-406-5708",
    capabilities: ["Financial fraud", "Crypto investigations", "Network intrusions"],
    priority: "secondary",
    icon: Shield
  },
  {
    name: "CFTC - Commodity Futures Trading Commission",
    type: "Federal",
    description: "Regulates commodity futures and crypto fraud",
    website: "https://www.cftc.gov/complaint",
    submitUrl: "https://www.cftc.gov/complaint",
    capabilities: ["Crypto trading fraud", "Commodity scams", "Derivatives fraud"],
    priority: "specialized",
    icon: FileText
  },
  {
    name: "SEC - Securities and Exchange Commission",
    type: "Federal",
    description: "Securities fraud and investment scams",
    website: "https://www.sec.gov/tcr",
    submitUrl: "https://www.sec.gov/tcr",
    capabilities: ["Investment fraud", "Ponzi schemes", "ICO scams"],
    priority: "specialized",
    icon: FileText
  }
];

const stateResources = [
  { state: "All States", name: "National Association of Attorneys General", url: "https://www.naag.org/find-my-ag/" },
  { state: "California", name: "CA Attorney General", url: "https://oag.ca.gov/contact/consumer-complaint-against-business-or-company" },
  { state: "New York", name: "NY Attorney General", url: "https://ag.ny.gov/bureau/consumer-frauds-bureau" },
  { state: "Texas", name: "TX Attorney General", url: "https://www.texasattorneygeneral.gov/consumer-protection" },
  { state: "Florida", name: "FL Attorney General", url: "http://myfloridalegal.com/pages.nsf/Main/5D2710E379EAD6BC85256F03006AA2D5" }
];

export default function FederalAgencyDirectory() {
  const primaryAgencies = agencies.filter(a => a.priority === "primary");
  const secondaryAgencies = agencies.filter(a => a.priority === "secondary");
  const specializedAgencies = agencies.filter(a => a.priority === "specialized");

  const AgencyCard = ({ agency }) => {
    const Icon = agency.icon;
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">{agency.name}</CardTitle>
                <Badge className="mt-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                  {agency.type}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">{agency.description}</p>
          
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400">Handles:</p>
            <div className="flex flex-wrap gap-2">
              {agency.capabilities.map((cap, idx) => (
                <Badge key={idx} variant="outline" className="text-xs text-gray-300">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {agency.website && (
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => window.open(agency.website, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                Website
              </Button>
            )}
            {agency.submitUrl && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                onClick={() => window.open(agency.submitUrl, '_blank')}
              >
                <FileText className="w-3 h-3 mr-2" />
                File Report
              </Button>
            )}
            {agency.phone && (
              <Button
                variant="outline"
                size="sm"
                className="border-green-500/20 text-green-400 hover:bg-green-500/10"
                onClick={() => window.open(`tel:${agency.phone}`, '_self')}
              >
                <Phone className="w-3 h-3 mr-2" />
                {agency.phone}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary Agencies */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Primary Federal Agencies
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {primaryAgencies.map((agency, idx) => (
            <AgencyCard key={idx} agency={agency} />
          ))}
        </div>
      </div>

      {/* Secondary Agencies */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Secondary Federal Agencies</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {secondaryAgencies.map((agency, idx) => (
            <AgencyCard key={idx} agency={agency} />
          ))}
        </div>
      </div>

      {/* Specialized Agencies */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Specialized Agencies</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {specializedAgencies.map((agency, idx) => (
            <AgencyCard key={idx} agency={agency} />
          ))}
        </div>
      </div>

      {/* State Resources */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            State Attorney General Offices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            State AGs handle consumer protection and fraud within their jurisdiction
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stateResources.map((resource, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="justify-between border-cyan-500/20 text-white hover:bg-cyan-500/10"
                onClick={() => window.open(resource.url, '_blank')}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  {resource.state}
                </span>
                <ExternalLink className="w-3 h-3 text-cyan-400" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
        <CardContent className="p-6">
          <h4 className="text-lg font-bold text-white mb-3">📋 Quick Submission Checklist</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <p className="font-semibold text-cyan-400">Before Submitting:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Gather all transaction hashes and wallet addresses</li>
                <li>Collect screenshots and communication evidence</li>
                <li>Document timeline of events</li>
                <li>Calculate total financial loss</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-cyan-400">Recommended Order:</p>
              <ul className="list-decimal list-inside space-y-1 text-xs">
                <li>File IC3 report first (get complaint number)</li>
                <li>Submit to FTC for consumer protection</li>
                <li>Contact local FBI field office</li>
                <li>File with state AG if applicable</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
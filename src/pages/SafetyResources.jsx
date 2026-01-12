import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Mail, 
  Lock, 
  Key, 
  Users, 
  AlertTriangle,
  Eye,
  Globe,
  ExternalLink,
  BookOpen
} from "lucide-react";

export default function SafetyResources() {
  const topics = [
    {
      icon: Eye,
      title: "Recognizing Scams",
      description: "How to identify phishing emails, fraudulent calls, and suspicious links.",
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/30",
      iconColor: "text-red-400"
    },
    {
      icon: Globe,
      title: "Safe Browsing Tips",
      description: "Tools and practices to keep your devices and accounts secure.",
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-cyan-500/30",
      iconColor: "text-cyan-400"
    },
    {
      icon: Lock,
      title: "Password Management",
      description: "Creating strong passwords and using password managers effectively.",
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-500/30",
      iconColor: "text-green-400"
    },
    {
      icon: Key,
      title: "Two-Factor Authentication",
      description: "Why 2FA is essential and how to set it up.",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-400"
    },
    {
      icon: Users,
      title: "Secure Social Media Use",
      description: "Protecting your personal information while staying connected.",
      color: "from-indigo-500/20 to-blue-500/20",
      borderColor: "border-indigo-500/30",
      iconColor: "text-indigo-400"
    },
    {
      icon: AlertTriangle,
      title: "Reporting Threats",
      description: "Steps to report online scams, harassment, or cybercrime.",
      color: "from-yellow-500/20 to-amber-500/20",
      borderColor: "border-yellow-500/30",
      iconColor: "text-yellow-400"
    }
  ];

  const externalResources = [
    {
      title: "FBI IC3",
      description: "Report cybercrime to the FBI's Internet Crime Complaint Center",
      url: "https://www.ic3.gov",
      icon: Shield
    },
    {
      title: "FTC Consumer Alerts",
      description: "Latest scam alerts and consumer protection information",
      url: "https://consumer.ftc.gov/consumer-alerts",
      icon: AlertTriangle
    },
    {
      title: "StaySafeOnline",
      description: "National Cybersecurity Alliance resources and tips",
      url: "https://staysafeonline.org",
      icon: Globe
    }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-12 h-12 text-cyan-400" />
          <h1 className="text-4xl lg:text-5xl font-bold text-white">Safety Resources</h1>
        </div>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Protect Yourself Online
        </p>
        <p className="text-gray-400 max-w-2xl mx-auto">
          At SafeNestT, your safety is our priority. Learn how to protect yourself, your personal information, 
          and your digital presence with our curated online safety resources.
        </p>
      </div>

      {/* Topics Section */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Topics Covered</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <Card 
                key={index}
                className={`bg-gradient-to-br ${topic.color} border ${topic.borderColor} hover:scale-105 transition-all duration-300 cursor-pointer group`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-black/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-black/50 transition-colors`}>
                      <Icon className={`w-6 h-6 ${topic.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{topic.title}</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* External Resources */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Trusted External Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {externalResources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-white">{resource.title}</h3>
                          <ExternalLink className="w-4 h-4 text-cyan-400" />
                        </div>
                        <p className="text-gray-400 text-sm">{resource.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Get Started</h2>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Access our full library of safety guides, tutorials, and trusted external links to strengthen 
          your online security and protect yourself from digital threats.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-cyan-500/50"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <BookOpen className="w-5 h-5 mr-2" />
            View Resources
          </Button>
          <Button 
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg rounded-xl"
            onClick={() => window.open('https://www.ic3.gov', '_blank')}
          >
            <Shield className="w-5 h-5 mr-2" />
            Report to FBI IC3
          </Button>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border border-purple-500/20 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Shield className="w-6 h-6 text-purple-400" />
          Quick Safety Tips
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Never share your passwords or 2FA codes with anyone</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Verify sender email addresses before clicking links</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Use unique passwords for each online account</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Enable two-factor authentication wherever possible</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Keep your software and devices up to date</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0" />
            <p>Be cautious of unsolicited messages requesting money</p>
          </div>
        </div>
      </section>
    </div>
  );
}
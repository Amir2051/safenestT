import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, Lock, Globe, UserX } from "lucide-react";

export default function ClientProtection() {
  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-blue-400">
          <ShieldCheck className="w-8 h-8" />
          Client Protection Dashboard
        </h1>
        <p className="text-gray-400 mt-1">
            Overview of client security posture and exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#1a2332] border-gray-700">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <UserX className="w-10 h-10 text-red-400 mb-3" />
                <h3 className="text-2xl font-bold text-white">12</h3>
                <p className="text-sm text-gray-400">Exposed Identities</p>
            </CardContent>
        </Card>
         <Card className="bg-[#1a2332] border-gray-700">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <Lock className="w-10 h-10 text-yellow-400 mb-3" />
                <h3 className="text-2xl font-bold text-white">85</h3>
                <p className="text-sm text-gray-400">Leaked Passwords</p>
            </CardContent>
        </Card>
         <Card className="bg-[#1a2332] border-gray-700">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <Globe className="w-10 h-10 text-blue-400 mb-3" />
                <h3 className="text-2xl font-bold text-white">3</h3>
                <p className="text-sm text-gray-400">Malicious IPs</p>
            </CardContent>
        </Card>
         <Card className="bg-[#1a2332] border-gray-700">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <AlertCircle className="w-10 h-10 text-orange-400 mb-3" />
                <h3 className="text-2xl font-bold text-white">5</h3>
                <p className="text-sm text-gray-400">Active Alerts</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Recent Exposure Alerts</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {[1,2,3].map(i => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[#0f1419] rounded border border-gray-700">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-white">Email found in 'DarkWeb' dump</p>
                                <p className="text-xs text-gray-400">Client: John Doe • 2 hours ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="text-white">Scam Patterns Detected</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <div className="p-3 bg-[#0f1419] rounded border border-gray-700">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-white">Investment Fraud</span>
                            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">High</span>
                        </div>
                        <p className="text-xs text-gray-400">Pattern match: "Guaranteed Returns" + Crypto Transfer</p>
                    </div>
                    <div className="p-3 bg-[#0f1419] rounded border border-gray-700">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-white">Tech Support Scam</span>
                            <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">Medium</span>
                        </div>
                        <p className="text-xs text-gray-400">Pattern match: "Microsoft Alert" + AnyDesk Download</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
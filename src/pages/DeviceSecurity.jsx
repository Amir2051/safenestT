import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, ShieldAlert, Radio, Scan, CheckCircle } from "lucide-react";
import LiveClock from "@/components/shared/LiveClock";

export default function DeviceSecurity() {
  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-green-400">
          <ShieldAlert className="w-8 h-8" />
          Communication & Device Security
        </h1>
        <p className="text-gray-400 mt-1">
            Monitor devices for compromises, SIM swaps, and phishing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-[#1a2332] border-gray-700 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Scan className="w-5 h-5 text-blue-400" /> Device Integrity Monitor
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="font-semibold text-white">No Malware Detected</p>
                                <p className="text-xs text-gray-400">Last scan: <LiveClock /></p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="border-green-500/30 text-green-400">Scan Now</Button>
                    </div>
                    
                     <div className="p-4 bg-[#0f1419] border border-gray-700 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Active Checks</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Root/Jailbreak Detection</span>
                                <span className="text-green-400">Passed</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Remote Access Tools</span>
                                <span className="text-green-400">None Found</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Suspicious Profiles</span>
                                <span className="text-green-400">Clean</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
             <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-purple-400" /> SIM Swap Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                             <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">SIM Secure</h3>
                        <p className="text-sm text-gray-400 mt-1">No recent carrier changes detected.</p>
                        <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">Verify Carrier</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Radio className="w-5 h-5 text-red-400" /> Phishing Radar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400">Real-time monitoring of incoming links.</p>
                        <div className="flex items-center justify-between p-2 bg-[#0f1419] rounded border border-gray-700">
                             <span className="text-sm text-white">SMS Filter</span>
                             <span className="text-xs text-green-400 font-mono">ACTIVE</span>
                        </div>
                         <div className="flex items-center justify-between p-2 bg-[#0f1419] rounded border border-gray-700">
                             <span className="text-sm text-white">Email Scanner</span>
                             <span className="text-xs text-green-400 font-mono">ACTIVE</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
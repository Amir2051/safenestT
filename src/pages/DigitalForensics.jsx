import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Smartphone, Mail, FileSearch, Share2, Database, Loader2, Terminal, Wallet } from "lucide-react";
import WalletTracker from "../components/investigation/WalletTracker";

export default function DigitalForensics() {
  const [loading, setLoading] = useState(false);
  
  const runTool = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-cyan-400">
          <Terminal className="w-8 h-8" />
          Digital Forensics Lab
        </h1>
        <p className="text-gray-400 mt-1">
            Advanced OSINT and metadata analysis tools.
        </p>
      </div>

      {/* Wallet Tracker Section */}
      <div className="mb-8">
        <WalletTracker cases={[]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Share2 className="w-5 h-5 text-blue-400" /> Social Graph (Maltego)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Map connections between entities, emails, and domains.</p>
                <div className="flex gap-2">
                    <Input placeholder="Enter entity name or domain..." className="bg-[#0f1419] border-gray-600 text-white" />
                    <Button onClick={runTool} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Map"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Search className="w-5 h-5 text-green-400" /> Username Check (Sherlock)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Scan social media platforms for username usage.</p>
                <div className="flex gap-2">
                    <Input placeholder="Enter username..." className="bg-[#0f1419] border-gray-600 text-white" />
                    <Button onClick={runTool} disabled={loading} className="bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Mail className="w-5 h-5 text-yellow-400" /> Email Trust Score (EmailRep)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Analyze email address reputation and history.</p>
                <div className="flex gap-2">
                    <Input placeholder="Enter email..." className="bg-[#0f1419] border-gray-600 text-white" />
                    <Button onClick={runTool} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Smartphone className="w-5 h-5 text-purple-400" /> Phone Intelligence (PhoneInfoga)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Gather metadata and carrier info from phone numbers.</p>
                <div className="flex gap-2">
                    <Input placeholder="+1 555..." className="bg-[#0f1419] border-gray-600 text-white" />
                    <Button onClick={runTool} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700 md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <FileSearch className="w-5 h-5 text-red-400" /> Metadata Extractor (ExifTool)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">Extract hidden metadata from images, documents, and media files.</p>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer bg-[#0f1419]">
                    <p className="text-gray-400">Drag and drop files here or click to upload</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
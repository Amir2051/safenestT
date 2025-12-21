import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Link2, AlertCircle, FileText, User } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CrossCaseCorrelator() {
    const [searchValue, setSearchValue] = useState("");
    const [searchType, setSearchType] = useState("any");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState(null);

    const handleSearch = async () => {
        if (!searchValue.trim()) return;
        setSearching(true);
        setResults(null);
        try {
            const res = await base44.functions.invoke('advancedInvestigation', {
                action: 'correlate',
                data: { value: searchValue, type: searchType }
            });
            if (res.data.success) {
                setResults(res.data.matches);
                if (res.data.matches.length === 0) {
                    toast.info("No correlations found.");
                }
            } else {
                toast.error("Correlation search failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error performing search");
        }
        setSearching(false);
    };

    return (
        <Card className="bg-[#0f1419] border-cyan-500/20 h-full">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-cyan-400" />
                    Cross-Case Correlation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Select value={searchType} onValueChange={setSearchType}>
                        <SelectTrigger className="w-[120px] bg-[#151a23] border-cyan-500/30 text-white">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="wallet">Wallet</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input 
                        placeholder="Enter wallet, email, phone..." 
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="flex-1 bg-[#151a23] border-cyan-500/30 text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button 
                        onClick={handleSearch}
                        disabled={searching}
                        className="bg-cyan-600 hover:bg-cyan-700"
                    >
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                </div>

                <div className="space-y-2 min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {results && results.length > 0 ? (
                        results.map((match, idx) => (
                            <div key={idx} className="p-3 bg-[#151a23] rounded border border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        {match.entity === 'MyCase' ? <FileText className="w-4 h-4 text-blue-400" /> : 
                                         match.entity === 'ScamDatabase' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                                         <User className="w-4 h-4 text-purple-400" />}
                                        <div>
                                            <p className="text-white text-sm font-semibold">{match.title}</p>
                                            <p className="text-xs text-gray-500">{match.entity} • ID: {match.id.slice(0,8)}...</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                                        Matched: {match.match_type}
                                    </Badge>
                                </div>
                                {/* Context snippet if available */}
                                {match.data?.description && (
                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                                        {match.data.description}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : results !== null ? (
                        <div className="text-center py-8 text-gray-500">
                            No correlations found across the database.
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Search to find links between cases and known scams.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
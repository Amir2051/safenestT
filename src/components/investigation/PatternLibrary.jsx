import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, BookOpen, Trash2, Search, Save } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PatternLibrary() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const queryClient = useQueryClient();

    const { data: patterns = [], isLoading } = useQuery({
        queryKey: ['scam-patterns'],
        queryFn: async () => {
            const res = await base44.functions.invoke('advancedInvestigation', {
                action: 'search_patterns',
                data: { query: searchQuery }
            });
            return res.data.patterns || [];
        }
    });

    const [newPattern, setNewPattern] = useState({
        name: "",
        description: "",
        type: "wallet_pattern",
        risk_level: "medium",
        indicators: "" // text input comma separated
    });

    const createPatternMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('advancedInvestigation', {
                action: 'save_pattern',
                data: {
                    ...data,
                    indicators: data.indicators.split(',').map(s => s.trim()).filter(Boolean)
                }
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scam-patterns'] });
            setIsAdding(false);
            setNewPattern({ name: "", description: "", type: "wallet_pattern", risk_level: "medium", indicators: "" });
            toast.success("Pattern added to library");
        }
    });

    return (
        <Card className="bg-[#0f1419] border-purple-500/20 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    Scam Pattern Library
                </CardTitle>
                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Pattern
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a2332] border-purple-500/20 text-white">
                        <DialogHeader>
                            <DialogTitle>Add New Scam Pattern</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-gray-300">Pattern Name</Label>
                                <Input 
                                    value={newPattern.name}
                                    onChange={(e) => setNewPattern({...newPattern, name: e.target.value})}
                                    className="bg-[#0f1419] border-purple-500/30 text-white mt-1"
                                    placeholder="e.g. Pig Butchering Variant A"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-gray-300">Type</Label>
                                    <Select 
                                        value={newPattern.type} 
                                        onValueChange={(v) => setNewPattern({...newPattern, type: v})}
                                    >
                                        <SelectTrigger className="bg-[#0f1419] border-purple-500/30 text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wallet_pattern">Wallet Pattern</SelectItem>
                                            <SelectItem value="email_pattern">Email Pattern</SelectItem>
                                            <SelectItem value="phrase">Phrase</SelectItem>
                                            <SelectItem value="behavior">Behavior</SelectItem>
                                            <SelectItem value="technical_tactic">Technical Tactic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-gray-300">Risk Level</Label>
                                    <Select 
                                        value={newPattern.risk_level} 
                                        onValueChange={(v) => setNewPattern({...newPattern, risk_level: v})}
                                    >
                                        <SelectTrigger className="bg-[#0f1419] border-purple-500/30 text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-gray-300">Description</Label>
                                <Textarea 
                                    value={newPattern.description}
                                    onChange={(e) => setNewPattern({...newPattern, description: e.target.value})}
                                    className="bg-[#0f1419] border-purple-500/30 text-white mt-1"
                                    placeholder="Describe how this scam operates..."
                                />
                            </div>
                            <div>
                                <Label className="text-gray-300">Indicators (comma separated)</Label>
                                <Input 
                                    value={newPattern.indicators}
                                    onChange={(e) => setNewPattern({...newPattern, indicators: e.target.value})}
                                    className="bg-[#0f1419] border-purple-500/30 text-white mt-1"
                                    placeholder="Keywords, domains, regex..."
                                />
                            </div>
                            <Button 
                                onClick={() => createPatternMutation.mutate(newPattern)}
                                disabled={createPatternMutation.isPending}
                                className="w-full bg-purple-600 hover:bg-purple-700 mt-2"
                            >
                                {createPatternMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Pattern"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                        placeholder="Search patterns..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-[#151a23] border-purple-500/20 text-white h-9"
                    />
                </div>

                <div className="space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                        </div>
                    ) : patterns.length === 0 ? (
                        <p className="text-gray-500 text-center py-8 text-sm">No patterns found.</p>
                    ) : (
                        patterns.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((pattern) => (
                            <div key={pattern.id} className="p-3 bg-[#151a23] rounded border border-purple-500/10 hover:border-purple-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-white font-medium text-sm">{pattern.name}</h4>
                                    <Badge className={`text-[10px] ${
                                        pattern.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                                        pattern.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                        {pattern.risk_level}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2 mb-2">{pattern.description}</p>
                                <div className="flex flex-wrap gap-1">
                                    {pattern.indicators?.slice(0, 3).map((ind, i) => (
                                        <Badge key={i} variant="outline" className="text-[10px] border-gray-700 text-gray-400">
                                            {ind}
                                        </Badge>
                                    ))}
                                    {pattern.indicators?.length > 3 && (
                                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400">+{pattern.indicators.length - 3}</Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Phone, MessageSquare, Clock, User, AlertTriangle, CheckCircle, 
    Plus, Search, Filter, Mic, ChevronDown, ChevronUp, Brain, FileText
} from "lucide-react";
import LogEntryForm from "./LogEntryForm";
import LogTimeline from "./LogTimeline";

export default function CommunicationLog({ caseId, user }) {
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['communication-logs', caseId],
        queryFn: async () => {
            return base44.entities.CommunicationLog.filter({ case_id: caseId }, '-created_date', 100);
        },
        enabled: !!caseId
    });

    const filteredLogs = logs.filter(log => {
        const matchesType = filterType === "all" || log.communication_type.toLowerCase().includes(filterType.toLowerCase());
        const matchesSearch = !searchQuery || 
            log.summary?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            log.raw_notes?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a2332] p-4 rounded-lg border border-cyan-500/20">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Phone className="w-5 h-5 text-cyan-400" />
                        Communication Log
                    </h3>
                    <p className="text-gray-400 text-sm">Track calls, notes, and client interactions</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                     <Button 
                        onClick={() => setIsAddingLog(!isAddingLog)}
                        className={`${isAddingLog ? 'bg-gray-700' : 'bg-gradient-to-r from-cyan-600 to-blue-600'} hover:opacity-90 transition-all`}
                    >
                        {isAddingLog ? 'Cancel Entry' : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Log New Interaction
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {isAddingLog && (
                <Card className="bg-[#0f1419] border-cyan-500/30 animate-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-white text-base">New Communication Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LogEntryForm 
                            caseId={caseId} 
                            user={user} 
                            onSuccess={() => setIsAddingLog(false)} 
                            onCancel={() => setIsAddingLog(false)}
                        />
                    </CardContent>
                </Card>
            )}

            <div className="flex-1 min-h-[400px] flex flex-col">
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input 
                            placeholder="Search logs..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-[#0f1419] border-gray-700 text-sm"
                        />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-700">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Communications</SelectItem>
                            <SelectItem value="intake">Intake Calls</SelectItem>
                            <SelectItem value="follow-up">Follow-Ups</SelectItem>
                            <SelectItem value="evidence">Evidence Reviews</SelectItem>
                            <SelectItem value="escalation">Escalations</SelectItem>
                            <SelectItem value="internal">Internal Notes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <LogTimeline logs={filteredLogs} isLoading={isLoading} />
            </div>
        </div>
    );
}
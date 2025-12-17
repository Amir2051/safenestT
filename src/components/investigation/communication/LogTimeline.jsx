import React, { useState } from "react";
import { format } from "date-fns";
import { 
    Phone, Mail, Mic, MessageSquare, AlertTriangle, Shield, CheckCircle2, 
    ArrowUpRight, ArrowDownLeft, Clock, User, ChevronDown, ChevronUp, FileText 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function LogTimeline({ logs, isLoading }) {
    const [expandedLogs, setExpandedLogs] = useState({});

    const toggleExpand = (id) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-lg">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p>No communication logs found for this case.</p>
                <p className="text-sm">Start by logging an intake call or interaction.</p>
            </div>
        );
    }

    const getTypeIcon = (type) => {
        switch(type) {
            case 'Intake Call': return Phone;
            case 'Email': return Mail;
            case 'Voice Note': return Mic;
            case 'Escalation': return AlertTriangle;
            case 'Evidence Review': return Shield;
            default: return MessageSquare;
        }
    };

    const getRiskColor = (risk) => {
        switch(risk) {
            case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/50';
            case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/50';
            case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50';
            default: return 'text-green-500 bg-green-500/10 border-green-500/50';
        }
    };

    return (
        <div className="space-y-4">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-800 hidden md:block" />
            
            {logs.map((log) => {
                const Icon = getTypeIcon(log.communication_type);
                const isExpanded = expandedLogs[log.id];
                const riskLevel = log.structured_data?.risk_assessment?.risk_level || "Low";

                return (
                    <div key={log.id} className="relative pl-0 md:pl-12 group">
                        {/* Timeline Connector */}
                        <div className="absolute left-[31px] top-8 w-px h-full bg-gray-800 group-last:hidden hidden md:block" />
                        <div className="absolute left-[20px] top-6 w-6 h-6 rounded-full bg-[#0f1419] border-2 border-cyan-900 z-10 hidden md:flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        </div>

                        <Card className={`border transition-all duration-200 hover:border-cyan-500/30 ${isExpanded ? 'bg-[#1a2332] border-cyan-500/30' : 'bg-[#0f1419] border-gray-800'}`}>
                            <div 
                                className="p-4 cursor-pointer"
                                onClick={() => toggleExpand(log.id)}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className={`p-2 rounded-lg ${log.direction === 'Inbound' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className="text-white font-semibold text-sm">
                                                    {log.communication_type}
                                                </h4>
                                                <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700">
                                                    {log.direction}
                                                </Badge>
                                                {log.duration_minutes > 0 && (
                                                    <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-700 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {log.duration_minutes}m
                                                    </Badge>
                                                )}
                                                {log.structured_data?.risk_assessment?.risk_level && (
                                                     <Badge className={`text-[10px] border ${getRiskColor(riskLevel)}`}>
                                                        {riskLevel} Risk
                                                     </Badge>
                                                )}
                                            </div>
                                            <p className="text-gray-300 text-sm line-clamp-2">
                                                {log.summary}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-mono mb-1">
                                            {format(new Date(log.created_date), "MMM d, HH:mm")}
                                        </p>
                                        <div className="flex items-center justify-end gap-1 text-xs text-gray-600">
                                            <User className="w-3 h-3" />
                                            {log.logged_by_name?.split(' ')[0]}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-2 flex justify-center">
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-600" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-800 p-4 bg-[#0a0e14]/50 animate-in slide-in-from-top-2 duration-200">
                                    {/* Structured Data Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        {/* Left Col */}
                                        <div className="space-y-4">
                                            {log.raw_notes && (
                                                <div>
                                                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Raw Notes</h5>
                                                    <div className="p-3 bg-[#151b26] rounded border border-gray-800 text-sm text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                                                        {log.raw_notes}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Evidence Status */}
                                            {log.structured_data?.evidence_checklist && (
                                                <div>
                                                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Evidence Status</h5>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(log.structured_data.evidence_checklist).map(([key, val]) => (
                                                            val && typeof val === 'boolean' && (
                                                                <div key={key} className="flex items-center gap-2 text-xs text-green-400">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    {key.replace(/_/g, ' ')}
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Col */}
                                        <div className="space-y-4">
                                            {/* Next Steps */}
                                            {log.structured_data?.next_steps && (
                                                <div className="bg-blue-950/20 p-3 rounded border border-blue-500/20">
                                                    <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Next Steps</h5>
                                                    <p className="text-sm text-gray-200 mb-2">
                                                        {log.structured_data.next_steps.task_description || "No specific task defined."}
                                                    </p>
                                                    <div className="flex gap-4 text-xs text-gray-400">
                                                        <span>Assigned: {log.structured_data.next_steps.assigned_to || "Unassigned"}</span>
                                                        <span>Deadline: {log.structured_data.next_steps.deadline || "None"}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions Taken */}
                                            {log.structured_data?.actions_taken && (
                                                <div>
                                                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions</h5>
                                                    <p className="text-sm text-gray-300 mb-1">
                                                        {log.structured_data.actions_taken.actions_explained}
                                                    </p>
                                                    {log.structured_data.actions_taken.disclaimers_acknowledged && (
                                                        <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">
                                                            Disclaimers Acknowledged
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {log.tags && log.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {log.tags.map((tag, idx) => (
                                                        <Badge key={idx} variant="secondary" className="bg-gray-800 text-gray-300">
                                                            #{tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                );
            })}
        </div>
    );
}
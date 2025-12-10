import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle, FileText, CheckCircle, Activity, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TimelineFeed({ caseId, initialTimeline }) {
    const { data: events = [] } = useQuery({
        queryKey: ['timeline-events', caseId],
        queryFn: async () => {
            // Fetch system events
            const systemEvents = await base44.entities.CaseTimelineEvent.filter({ case_id: caseId }, '-created_at');
            return systemEvents;
        },
        refetchInterval: 10000
    });

    // Merge legacy timeline (from JSON) and new system events
    const allEvents = [
        ...(initialTimeline || []).map(e => ({
            id: `legacy-${e.date}`,
            type: 'legacy',
            description: e.details || e.event,
            timestamp: e.date,
            icon: Clock,
            color: 'text-gray-400',
            bg: 'bg-gray-500/10'
        })),
        ...events.map(e => ({
            id: e.id,
            type: e.event_type,
            description: e.description,
            timestamp: e.created_at,
            icon: getIconForType(e.event_type),
            color: getColorForType(e.event_type),
            bg: getBgForType(e.event_type)
        }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allEvents.length === 0) {
        return (
            <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No activity recorded yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {allEvents.map((event) => {
                const Icon = event.icon;
                return (
                    <div key={event.id} className={`p-4 rounded-lg border flex gap-4 ${event.bg} border-${event.color.split('-')[1]}/20`}>
                        <div className={`mt-1 p-2 rounded-full bg-${event.color.split('-')[1]}/20`}>
                            <Icon className={`w-4 h-4 ${event.color}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-semibold text-sm ${event.color} capitalize`}>
                                    {event.type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(event.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getIconForType(type) {
    switch (type) {
        case 'system_alert': return AlertTriangle;
        case 'evidence_processed': return FileText;
        case 'status_change': return Activity;
        case 'connection_found': return Link2;
        default: return CheckCircle;
    }
}

function getColorForType(type) {
    switch (type) {
        case 'system_alert': return 'text-red-400';
        case 'evidence_processed': return 'text-cyan-400';
        case 'status_change': return 'text-purple-400';
        case 'connection_found': return 'text-orange-400';
        default: return 'text-blue-400';
    }
}

function getBgForType(type) {
    switch (type) {
        case 'system_alert': return 'bg-red-500/5';
        case 'evidence_processed': return 'bg-cyan-500/5';
        case 'status_change': return 'bg-purple-500/5';
        default: return 'bg-[#0f1419]';
    }
}
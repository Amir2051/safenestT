import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function SensitiveField({ 
    field, 
    value, 
    icon: Icon, 
    label, 
    caseData, 
    onUpdate, 
    isAdmin 
}) {
    const redactedFields = caseData.redacted_fields || [];
    const isRedacted = redactedFields.includes(field);
    const showValue = isAdmin || !isRedacted ? value : '[REDACTED]';

    const toggleRedaction = async (e) => {
        e.stopPropagation();
        try {
            const res = await base44.functions.invoke('caseManagement', {
                action: 'toggle_redaction',
                data: {
                    caseId: caseData.id,
                    field: field,
                    isRedacted: !isRedacted
                }
            });
            if (res.data.success) {
                if (onUpdate) onUpdate();
                toast.success(`Field ${!isRedacted ? 'Redacted' : 'Unredacted'}`);
            } else {
                toast.error(res.data.error || "Failed to update redaction");
            }
        } catch (err) {
            toast.error("Error updating redaction");
        }
    };

    return (
        <div className={`group relative p-2 rounded border transition-all ${isRedacted ? 'bg-red-500/5 border-red-500/20' : 'border-transparent hover:bg-white/5'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {label && <p className="text-xs text-gray-400 mb-0.5">{label}</p>}
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className={`w-4 h-4 shrink-0 ${isRedacted ? 'text-red-400' : 'text-cyan-400'}`} />}
                        <span className={`text-sm truncate ${isRedacted ? 'text-red-300 font-mono tracking-wider' : 'text-white'}`}>
                            {showValue || 'N/A'}
                        </span>
                    </div>
                </div>
                {isAdmin && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 shrink-0 transition-colors ${isRedacted ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
                        onClick={toggleRedaction}
                        title={isRedacted ? "Unredact Field" : "Redact Field"}
                    >
                        {isRedacted ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                        <span className="text-[10px] font-bold tracking-wide">{isRedacted ? 'HIDDEN' : 'VISIBLE'}</span>
                    </Button>
                )}
            </div>
            {isRedacted && isAdmin && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>}
        </div>
    );
}
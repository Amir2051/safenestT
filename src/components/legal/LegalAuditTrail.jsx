import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Clock, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { format } from "date-fns";

export default function LegalAuditTrail({ actions, properties, selectedProperty }) {
  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'title_lock_enabled':
        return <Lock className="w-5 h-5 text-green-400" />;
      case 'attorney_consulted':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'document_sent':
        return <FileText className="w-5 h-5 text-cyan-400" />;
      case 'court_filed':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'resolution_achieved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'escalated':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyan-400" />
          Legal Action Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-cyan-300 text-sm">
            <strong>🔒 Complete Audit Log:</strong> Every legal action is recorded with timestamps, 
            user details, and full context. This audit trail can be used as evidence in legal proceedings.
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">No Legal Actions Yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Legal actions will appear here as you take steps to protect your property
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action, idx) => {
              const property = properties.find(p => p.id === action.property_id);
              
              return (
                <div
                  key={action.id}
                  className="bg-[#0f1419] rounded-lg p-5 border border-cyan-500/10 relative"
                >
                  {/* Timeline connector */}
                  {idx < actions.length - 1 && (
                    <div className="absolute left-[29px] top-[60px] w-0.5 h-[calc(100%+16px)] bg-cyan-500/20" />
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a2332] border-2 border-cyan-500/30 flex items-center justify-center flex-shrink-0 relative z-10">
                      {getActionIcon(action.action_type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-white font-bold">
                            {action.action_type.replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {property?.address || 'Unknown Property'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge className={`${getStatusColor(action.status)} border text-xs`}>
                            {action.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(action.priority)} border text-xs`}>
                            {action.priority}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-3">{action.description}</p>

                      {action.attorney_info && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-3">
                          <p className="text-purple-400 font-bold text-xs mb-1">Attorney:</p>
                          <p className="text-white text-sm">{action.attorney_info.attorney_name}</p>
                          <p className="text-gray-400 text-xs">{action.attorney_info.firm_name}</p>
                        </div>
                      )}

                      {action.next_steps && action.next_steps.length > 0 && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg mb-3">
                          <p className="text-cyan-400 font-bold text-xs mb-2">Next Steps:</p>
                          <ul className="text-gray-300 text-xs space-y-1">
                            {action.next_steps.map((step, idx) => (
                              <li key={idx}>• {step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {action.outcome && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                          <p className="text-green-400 font-bold text-xs mb-1">Outcome:</p>
                          <p className="text-gray-300 text-sm">{action.outcome}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(action.action_date), 'MMM dd, yyyy HH:mm')}
                        </div>
                        {action.deadline && (
                          <div className="flex items-center gap-1 text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            Deadline: {format(new Date(action.deadline), 'MMM dd, yyyy')}
                          </div>
                        )}
                        {action.cost_estimate && (
                          <div>Estimated Cost: ${action.cost_estimate.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
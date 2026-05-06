import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Circle, Clock, ChevronDown, ChevronUp,
  FileSearch, Shield, Gavel, Handshake, ClipboardList,
  AlertTriangle, Lock
} from "lucide-react";

// ── Phase definitions ─────────────────────────────────────────────────────────
const PHASES = [
  {
    id: "intake",
    label: "Intake",
    icon: ClipboardList,
    color: "cyan",
    description: "Case received and initial information collected.",
    estimateDays: "1–2 days",
    tasks: [
      { id: "t1", label: "Case submission received" },
      { id: "t2", label: "Contact information verified" },
      { id: "t3", label: "Case number assigned" },
      { id: "t4", label: "Initial review scheduled" },
    ],
  },
  {
    id: "review",
    label: "Review",
    icon: FileSearch,
    color: "blue",
    description: "Analysts examine submitted evidence and details.",
    estimateDays: "3–7 days",
    tasks: [
      { id: "t5", label: "Evidence documents reviewed" },
      { id: "t6", label: "Preliminary risk assessment completed" },
      { id: "t7", label: "Incident classification confirmed" },
      { id: "t8", label: "Investigator assigned" },
    ],
  },
  {
    id: "investigation",
    label: "Investigation",
    icon: Shield,
    color: "purple",
    description: "Active investigation — tracing actors and collecting intelligence.",
    estimateDays: "1–4 weeks",
    tasks: [
      { id: "t9",  label: "Suspect profile compiled" },
      { id: "t10", label: "Blockchain / financial trail traced" },
      { id: "t11", label: "Agencies and exchanges notified" },
      { id: "t12", label: "Law enforcement report filed" },
    ],
  },
  {
    id: "action",
    label: "Legal Action",
    icon: Gavel,
    color: "orange",
    description: "Coordination with law enforcement and legal teams.",
    estimateDays: "2–8 weeks",
    tasks: [
      { id: "t13", label: "IC3 / federal complaint submitted" },
      { id: "t14", label: "Attorney or agency referral made" },
      { id: "t15", label: "Recovery efforts initiated" },
      { id: "t16", label: "Updates communicated to client" },
    ],
  },
  {
    id: "resolution",
    label: "Resolution",
    icon: Handshake,
    color: "green",
    description: "Case outcome documented and closed.",
    estimateDays: "Varies",
    tasks: [
      { id: "t17", label: "Final case report generated" },
      { id: "t18", label: "Recovery status documented" },
      { id: "t19", label: "Client notified of outcome" },
      { id: "t20", label: "Case officially closed" },
    ],
  },
];

// Map case statuses → active phase index
function getPhaseIndex(status) {
  const s = (status || "").toLowerCase().replace(/_/g, " ");
  if (["resolved", "recovered", "closed", "completed"].some(x => s.includes(x))) return 4;
  if (["law enforcement", "recovering", "legal", "action"].some(x => s.includes(x))) return 3;
  if (["investigating", "in progress", "traced", "documenting"].some(x => s.includes(x))) return 2;
  if (["in review", "review", "called", "contacted"].some(x => s.includes(x))) return 1;
  return 0; // intake / pending / new / reported
}

// How many tasks to mark complete per phase
function completedTaskCount(phaseIndex, activePhase) {
  if (phaseIndex < activePhase) return 4;      // past phase → all done
  if (phaseIndex === activePhase) return 2;    // current → half done
  return 0;                                    // future → none
}

const colorMap = {
  cyan:   { ring: "border-cyan-500",   dot: "bg-cyan-500",   text: "text-cyan-400",   badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",   glow: "shadow-cyan-500/40" },
  blue:   { ring: "border-blue-500",   dot: "bg-blue-500",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",   glow: "shadow-blue-500/40" },
  purple: { ring: "border-purple-500", dot: "bg-purple-500", text: "text-purple-400", badge: "bg-purple-500/20 text-purple-400 border-purple-500/40", glow: "shadow-purple-500/40" },
  orange: { ring: "border-orange-500", dot: "bg-orange-500", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/40", glow: "shadow-orange-500/40" },
  green:  { ring: "border-green-500",  dot: "bg-green-500",  text: "text-green-400",  badge: "bg-green-500/20 text-green-400 border-green-500/40",  glow: "shadow-green-500/40" },
};

function PhaseCard({ phase, index, activePhase, isExpanded, onToggle }) {
  const c = colorMap[phase.color];
  const isPast    = index < activePhase;
  const isCurrent = index === activePhase;
  const isFuture  = index > activePhase;
  const doneCount = completedTaskCount(index, activePhase);
  const totalCount = phase.tasks.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  const PhaseIcon = phase.icon;

  return (
    <div className="flex gap-4">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10
            ${isPast ? `${c.ring} ${c.dot}` : isCurrent ? `${c.ring} bg-transparent` : "border-gray-700 bg-transparent"}
            ${isCurrent ? `shadow-lg ${c.glow}` : ""}
          `}
        >
          {isPast ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : isCurrent ? (
            <PhaseIcon className={`w-5 h-5 ${c.text} animate-pulse`} />
          ) : (
            <Lock className="w-4 h-4 text-gray-600" />
          )}
        </motion.div>
        {index < PHASES.length - 1 && (
          <div className={`w-0.5 flex-1 mt-1 ${isPast ? c.dot : "bg-gray-800"}`} style={{ minHeight: 40 }} />
        )}
      </div>

      {/* Card */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.05 }}
        className={`flex-1 mb-6 rounded-xl border transition-colors cursor-pointer
          ${isFuture
            ? "border-gray-800 bg-gray-900/30 opacity-50"
            : isCurrent
              ? `border-${phase.color}-500/40 bg-gradient-to-br from-[#1a2332] to-[#0f1419]`
              : "border-gray-700/50 bg-[#0f1419]/60"
          }
        `}
        onClick={onToggle}
      >
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                ${isPast ? `${c.dot}/20` : isCurrent ? `${c.dot}/10` : "bg-gray-800/40"}
              `}>
                <PhaseIcon className={`w-4 h-4 ${isFuture ? "text-gray-600" : c.text}`} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-sm ${isFuture ? "text-gray-500" : "text-white"}`}>
                    {phase.label}
                  </span>
                  {isPast && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/40 border text-[10px] px-1.5">
                      ✓ Complete
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className={`${c.badge} border text-[10px] px-1.5 animate-pulse`}>
                      ◉ Active
                    </Badge>
                  )}
                  {isFuture && (
                    <Badge className="bg-gray-800 text-gray-500 border-gray-700 border text-[10px] px-1.5">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${isFuture ? "text-gray-600" : "text-gray-400"}`}>
                  {phase.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {!isFuture && (
                <div className="text-right hidden sm:block">
                  <p className={`text-xs font-mono ${c.text}`}>{doneCount}/{totalCount} tasks</p>
                  <p className="text-[10px] text-gray-500">~{phase.estimateDays}</p>
                </div>
              )}
              {isFuture ? (
                <Lock className="w-4 h-4 text-gray-700" />
              ) : isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!isFuture && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className={`h-full rounded-full ${c.dot}`}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{pct}% complete</p>
            </div>
          )}
        </div>

        {/* Expanded task list */}
        <AnimatePresence>
          {isExpanded && !isFuture && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-800/60 pt-3 space-y-2">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Task Breakdown</p>
                {phase.tasks.map((task, ti) => {
                  const done = ti < doneCount;
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${c.text}`} />
                      ) : (
                        <Circle className="w-4 h-4 flex-shrink-0 text-gray-600" />
                      )}
                      <span className={`text-sm ${done ? "text-gray-300" : "text-gray-500 line-through decoration-gray-700"}`}>
                        {task.label}
                      </span>
                      {done && (
                        <Badge className="ml-auto bg-green-500/10 text-green-500 border-green-500/20 border text-[10px] px-1">
                          Done
                        </Badge>
                      )}
                      {!done && isCurrent && ti === doneCount && (
                        <Badge className="ml-auto bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border text-[10px] px-1 animate-pulse">
                          In Progress
                        </Badge>
                      )}
                      {!done && (isFuture || ti > doneCount) && (
                        <Badge className="ml-auto bg-gray-800 text-gray-600 border-gray-700 border text-[10px] px-1">
                          Pending
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Estimate */}
              <div className="mx-4 mb-4 px-3 py-2 bg-black/30 rounded-lg border border-gray-800 flex items-center gap-2">
                <Clock className={`w-4 h-4 ${c.text} flex-shrink-0`} />
                <span className="text-xs text-gray-400">
                  Estimated duration: <span className={`font-semibold ${c.text}`}>{phase.estimateDays}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CaseInvestigationTimeline({ caseData }) {
  const status = caseData?.status || "Pending";
  const activePhase = getPhaseIndex(status);
  const [expandedIndex, setExpandedIndex] = useState(activePhase);

  const totalDone = PHASES.slice(0, activePhase).reduce((s, p) => s + p.tasks.length, 0) + 2;
  const grandTotal = PHASES.reduce((s, p) => s + p.tasks.length, 0);
  const overallPct = Math.round((totalDone / grandTotal) * 100);

  return (
    <div className="space-y-4">
      {/* Overall progress header */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl border border-cyan-500/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-base">Investigation Progress</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              Phase {activePhase + 1} of {PHASES.length} — <span className="text-cyan-400 font-medium">{PHASES[activePhase].label}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-400">{overallPct}%</p>
            <p className="text-[10px] text-gray-500">Overall</p>
          </div>
        </div>

        {/* Overall bar */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          />
        </div>

        {/* Phase labels */}
        <div className="flex justify-between mt-2">
          {PHASES.map((p, i) => (
            <span
              key={p.id}
              className={`text-[9px] font-mono uppercase tracking-wider ${
                i < activePhase ? "text-green-400" : i === activePhase ? "text-cyan-400" : "text-gray-700"
              }`}
            >
              {p.label}
            </span>
          ))}
        </div>

        {/* Status badge + alert */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/40 border text-xs">
            Current Status: {status}
          </Badge>
          {activePhase < 4 && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Active case — updates sent to your email</span>
            </div>
          )}
          {activePhase === 4 && (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Case resolved</span>
            </div>
          )}
        </div>
      </div>

      {/* Phase cards */}
      <div>
        {PHASES.map((phase, index) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={index}
            activePhase={activePhase}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </div>
    </div>
  );
}
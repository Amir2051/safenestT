import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, THEMES } from "@/lib/ThemeContext";
import { Moon, Sun, Zap, Check } from "lucide-react";

const THEME_OPTIONS = [
  {
    id: "dark",
    label: "Dark",
    subtitle: "Deep black · Electric accents",
    Icon: Moon,
    preview: {
      bg: "bg-gray-950",
      card: "bg-gray-800",
      accent: "bg-cyan-400",
      accent2: "bg-purple-500",
      text: "bg-gray-100",
      textMuted: "bg-gray-500",
    }
  },
  {
    id: "light",
    label: "Futuristic Light",
    subtitle: "Crystal white · Sky blue",
    Icon: Sun,
    preview: {
      bg: "bg-[#f8faff]",
      card: "bg-white",
      accent: "bg-sky-500",
      accent2: "bg-violet-500",
      text: "bg-slate-900",
      textMuted: "bg-slate-500",
    }
  },
  {
    id: "auto",
    label: "Auto",
    subtitle: "Follows device system theme",
    Icon: Zap,
    preview: {
      bg: "bg-gradient-to-br from-slate-900 to-[#f8faff]",
      card: "bg-gradient-to-br from-slate-700 to-white",
      accent: "bg-sky-400",
      accent2: "bg-violet-500",
      text: "bg-slate-600",
      textMuted: "bg-slate-400",
    }
  }
];

function ThemePreview({ preview, active }) {
  return (
    <div className={`w-full h-16 rounded-lg overflow-hidden relative border-2 transition-all duration-300 ${active ? "border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]" : "border-gray-600/40"} ${preview.bg}`}>
      {/* Mini card */}
      <div className={`absolute top-2 left-2 w-10 h-7 rounded ${preview.card} border border-white/10`}>
        <div className={`mt-1 mx-1 h-1 rounded ${preview.text} opacity-80`} />
        <div className={`mt-0.5 mx-1 w-6 h-1 rounded ${preview.textMuted} opacity-60`} />
      </div>
      {/* Accent dots */}
      <div className={`absolute bottom-2 right-3 w-3 h-3 rounded-full ${preview.accent} shadow-sm`} />
      <div className={`absolute bottom-2 right-7 w-2 h-2 rounded-full ${preview.accent2} opacity-80`} />
      {/* Active checkmark */}
      {active && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-black" />
        </div>
      )}
    </div>
  );
}

export default function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [switching, setSwitching] = useState(false);
  const [switched, setSwitched] = useState(null);

  const handleSwitch = (id) => {
    if (id === theme) return;
    setSwitching(true);
    setSwitched(id);
    setTimeout(() => {
      setTheme(id);
      setSwitching(false);
    }, 200);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Appearance</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Active: <span className="text-cyan-400 font-mono">{THEMES[resolvedTheme]?.label || "Dark"}</span>
          </p>
        </div>
        {/* Live indicator */}
        <AnimatePresence>
          {switching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 rounded-full border border-cyan-500/30"
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
              />
              <span className="text-cyan-400 text-xs font-mono">Applying…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Theme Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.id;
          const { Icon } = opt;

          return (
            <motion.button
              key={opt.id}
              onClick={() => handleSwitch(opt.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`relative p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer focus:outline-none ${
                isActive
                  ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  : "border-gray-700/50 bg-[#0f1419] hover:border-gray-500/60 hover:bg-gray-800/40"
              }`}
            >
              {/* Preview thumbnail */}
              <ThemePreview preview={opt.preview} active={isActive} />

              {/* Label row */}
              <div className="mt-2.5 flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-gray-500"}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? "text-cyan-300" : "text-gray-300"}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{opt.subtitle}</p>
                </div>
              </div>

              {/* Glow pulse on active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-xl border border-cyan-400/40 pointer-events-none"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-600 italic">
        Your preference is saved locally and persists across sessions.
      </p>
    </div>
  );
}
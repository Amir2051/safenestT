import React from "react";
import { Moon, Check } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export default function ThemeSwitcher() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Moon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Dark</p>
          <p className="text-gray-400 text-xs mt-0.5">
            SafeNestT uses one consistent dark security theme.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <Check className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-300 text-xs font-medium">
            {resolvedTheme === "dark" ? "Active" : "Active"}
          </span>
        </div>
      </div>
    </div>
  );
}

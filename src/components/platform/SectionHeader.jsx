import React from "react";
import { cn } from "@/lib/utils";

/**
 * Consistent section header for the investigation platform.
 */
export default function SectionHeader({ title, description, icon: Icon, actions, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-md border border-cyan-500/20 bg-cyan-500/[0.04] flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
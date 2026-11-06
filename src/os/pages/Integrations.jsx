import React from "react";
import { Plug, Settings2, ShieldQuestion } from "lucide-react";
import { Panel, StatusPill, Pill, KV } from "@/os/ui/kit";
import { INTEGRATIONS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const GROUPED = INTEGRATIONS.reduce((acc, i) => {
  acc[i.category] = acc[i.category] || [];
  acc[i.category].push(i);
  return acc;
}, {});

export default function Integrations() {
  const demoAction = useDemoToast();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-os-text">
            <Plug className="h-4 w-4 text-os-cyan" /> Integrations
          </h1>
          <p className="max-w-2xl text-[11.5px] leading-relaxed text-os-muted">
            Nothing on this page is connected. Providers are listed to demonstrate the management surface; no credentials, keys or
            endpoints are configured by the prototype.
          </p>
        </div>
        <Pill tone="warn"><ShieldQuestion className="h-3 w-3" /> 0 live connections</Pill>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(GROUPED).map(([category, items]) => (
          <Panel key={category} title={category} subtitle={`${items.length} provider${items.length > 1 ? "s" : ""}`}>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.name} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-os-text">{i.name}</p>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-os-muted">{i.note}</p>
                    </div>
                    <StatusPill value={i.status} />
                  </div>
                  <button
                    onClick={() => demoAction(`Configuring ${i.name}`)}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded border border-os-line bg-os-panel py-1 text-[10.5px] text-os-cyan hover:border-os-cobalt/40"
                  >
                    <Settings2 className="h-3 w-3" /> {i.status === "not_connected" ? "Request connection" : "View demo config"}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel title="Connection policy" subtitle="How integrations are handled in production">
        <div className="grid gap-3 sm:grid-cols-3">
          <KV label="Credential storage" value="Server-side secrets only" />
          <KV label="Prototype behaviour" value="No credentials requested" />
          <KV label="Outbound traffic" value="None from this prototype" />
        </div>
        <p className="mt-2 border-t border-os-line pt-2 text-[10.5px] leading-relaxed text-os-muted">
          When this prototype is promoted, connections should be created through the platform connector flow rather than embedded keys.
          The prototype deliberately avoids any credential entry fields.
        </p>
      </Panel>
    </div>
  );
}
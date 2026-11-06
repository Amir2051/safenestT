import React, { useState } from "react";
import { Settings as SettingsIcon, Database, Bell, Sliders, ShieldAlert } from "lucide-react";
import { Panel, Pill, KV } from "@/os/ui/kit";
import { Switch } from "@/components/ui/switch";
import { DEMO_USER, WORKSPACES } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const INPUT = "h-8 w-full rounded border border-os-line bg-os-bg px-2 text-[11.5px] text-os-text focus:border-os-cobalt focus:outline-none";

export default function Settings() {
  const demoAction = useDemoToast();
  const [name, setName] = useState(WORKSPACES[0].name);
  const [tz, setTz] = useState("America/New_York");
  const [prefs, setPrefs] = useState({
    dense: true,
    showDemoBanner: true,
    notifyRuns: true,
    notifyApprovals: true,
    notifyCustody: true,
    weeklyDigest: false,
  });

  const toggle = (key) => (v) => {
    setPrefs((p) => ({ ...p, [key]: v }));
    demoAction("Updating preferences");
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-os-text">
          <SettingsIcon className="h-4 w-4 text-os-cyan" /> Settings
        </h1>
        <p className="text-[11.5px] text-os-muted">Workspace, display and notification preferences for the prototype</p>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel title="Workspace profile" subtitle="Demonstration fields — nothing is persisted">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.1em] text-os-muted">Workspace name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.1em] text-os-muted">Default timezone</span>
              <select value={tz} onChange={(e) => setTz(e.target.value)} className={`${INPUT} mt-1`}>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.1em] text-os-muted">Primary contact</span>
              <input value={DEMO_USER.email} readOnly className={`${INPUT} mt-1 text-os-muted`} />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-os-line pt-2.5">
            <span className="text-[10.5px] text-os-muted">Changes are discarded when you leave the prototype.</span>
            <button onClick={() => demoAction("Saving workspace settings")} className="rounded bg-os-cobalt px-2.5 py-1 text-[11px] font-medium text-white hover:bg-os-cobalt2">
              Save (demo)
            </button>
          </div>
        </Panel>

        <Panel title="Display" subtitle="Interface preferences">
          <ul className="divide-y divide-os-line">
            {[
              ["dense", "Compact density", "Tighter rows for long investigative sessions"],
              ["showDemoBanner", "Demo status banner", "Keep the synthetic-data notice visible at all times"],
            ].map(([key, label, desc]) => (
              <li key={key} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-os-text">{label}</p>
                  <p className="text-[10.5px] text-os-muted">{desc}</p>
                </div>
                <Switch checked={prefs[key]} onCheckedChange={toggle(key)} />
              </li>
            ))}
          </ul>
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-os-line pt-2.5">
            <KV label="Accent" value={<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-os-cobalt" /> Cobalt</span>} />
            <KV label="Theme" value="Graphite dark" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-os-muted">
            <Sliders className="h-3 w-3" /> Light mode is intentionally not part of this prototype.
          </p>
        </Panel>

        <Panel title="Notifications" subtitle="What this workspace alerts on">
          <ul className="divide-y divide-os-line">
            {[
              ["notifyRuns", "Investigation run failures"],
              ["notifyApprovals", "Reports awaiting approval"],
              ["notifyCustody", "Evidence custody gaps"],
              ["weeklyDigest", "Weekly operations digest"],
            ].map(([key, label]) => (
              <li key={key} className="flex items-center gap-3 py-1.5">
                <Bell className="h-3.5 w-3.5 text-os-muted" />
                <span className="flex-1 text-[12px] text-os-text">{label}</span>
                <Switch checked={prefs[key]} onCheckedChange={toggle(key)} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Demo data" subtitle="Synthetic dataset controls" actions={<Pill tone="warn"><Database className="h-3 w-3" /> local only</Pill>}>
          <p className="text-[11.5px] leading-relaxed text-os-muted">
            The prototype dataset lives in the browser. Resetting it reloads the sample cases, evidence, findings, runs and reports —
            no production record is touched by any of these actions.
          </p>
          <div className="mt-2.5 grid gap-3 border-t border-os-line pt-2.5 sm:grid-cols-2">
            <KV label="Records in demo set" value={<span className="font-mono">10 cases · 40 evidence · 40 findings</span>} />
            <KV label="Storage" value="In-memory (browser)" />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button onClick={() => demoAction("Reloading the synthetic dataset")} className="rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2">
              Reload demo dataset
            </button>
            <button onClick={() => demoAction("Exporting the demo dataset")} className="rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2">
              Export sample JSON
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Danger zone" subtitle="Deliberately disabled in the prototype" bodyClassName="p-3">
        <div className="flex flex-wrap items-center gap-3 rounded border border-os-red/25 bg-os-red/5 px-3 py-2">
          <ShieldAlert className="h-4 w-4 text-os-red" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-os-text">Delete workspace / purge case data</p>
            <p className="text-[10.5px] text-os-muted">Unavailable — this prototype cannot delete anything.</p>
          </div>
          <button disabled className="cursor-not-allowed rounded border border-os-line2 px-2.5 py-1 text-[11px] text-os-muted opacity-60">
            Unavailable
          </button>
        </div>
      </Panel>
    </div>
  );
}
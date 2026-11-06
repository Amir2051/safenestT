import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const unwrap = (response) => response?.data ?? response;
const payloadOf = (body) => body?.data ?? body;
const getStatus = (body) => {
  const data = payloadOf(body);
  return String(data?.status || data?.investigation?.status || data?.state || "").toLowerCase();
};
const isTerminal = (status) => [
  "completed", "completed_with_errors", "partial_success", "done", "complete",
  "success", "succeeded", "finished", "failed", "error", "errored",
  "aborted", "cancelled", "canceled",
].includes(status);
const getId = (body) => {
  const data = payloadOf(body);
  return data?.investigation_id || data?.id || data?.investigation?.investigation_id || data?.investigation?.id || null;
};
const invoke = async (action, extra = {}) => {
  const response = await base44.functions.invoke("hermesProxy", { action, ...extra });
  const body = unwrap(response);
  if (!body || body.ok !== true) {
    throw new Error(body?.error || body?.status || `Hermes ${action} failed`);
  }
  return body;
};
const countItems = (body, names) => {
  const data = payloadOf(body);
  for (const name of names) {
    if (Array.isArray(data?.[name])) return data[name].length;
  }
  if (Array.isArray(data)) return data.length;
  return data ? Object.keys(data).length : 0;
};

export default function HermesSyntheticTest() {
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const log = (step, detail) => setEvents((current) => [...current, { step, detail, at: new Date().toLocaleTimeString() }]);

  const runTest = async () => {
    if (running || finished) return;
    setRunning(true);
    setError("");
    setEvents([]);
    try {
      log("Connection", "Checking Hermes reachability and API-key authentication");
      const health = await invoke("health");
      if (health.auth_verified !== true) throw new Error("Hermes responded, but the proxy did not confirm API-key authentication.");
      log("Connection", "Engine reachable; API key verified");

      log("Create", "Creating one synthetic narrative-only investigation; no case_id or external target");
      const created = await invoke("create_investigation", {
        body: {
          target: {
            type: "narrative",
            value: "Synthetic SafeNestT Hermes lifecycle smoke test — no real subject or external target",
          },
          investigation_type: "other",
          case_id: null,
        },
      });
      const investigationId = getId(created);
      if (!investigationId) throw new Error("Hermes accepted the create request but returned no investigation ID.");
      log("Create", `Created synthetic investigation ${investigationId}`);

      log("Start", "Starting the isolated engine run");
      const started = await invoke("start_investigation", { investigation_id: investigationId });
      log("Start", `Start accepted; engine status: ${getStatus(started) || "accepted"}`);

      let latest = started;
      let terminalStatus = getStatus(started);
      for (let attempt = 1; attempt <= 90 && !isTerminal(terminalStatus); attempt++) {
        await sleep(5000);
        latest = await invoke("get_investigation", { investigation_id: investigationId });
        terminalStatus = getStatus(latest);
        if (attempt === 1 || attempt % 3 === 0 || isTerminal(terminalStatus)) {
          log("Poll", `Poll ${attempt}: ${terminalStatus || "status not supplied"}`);
        }
      }
      if (!isTerminal(terminalStatus)) {
        log("Poll", "Polling limit reached after 7.5 minutes; collecting whatever results are available");
      } else {
        log("Poll", `Engine reached terminal status: ${terminalStatus}`);
      }

      log("Results", "Retrieving evidence, findings, and report from Hermes");
      const [evidence, findings, report] = await Promise.all([
        invoke("get_investigation_evidence", { investigation_id: investigationId }),
        invoke("get_investigation_findings", { investigation_id: investigationId }),
        invoke("get_investigation_report", { investigation_id: investigationId }),
      ]);
      const summary = {
        investigation_id: investigationId,
        final_status: terminalStatus || "timed_out",
        evidence_count: countItems(evidence, ["evidence", "items", "results"]),
        findings_count: countItems(findings, ["findings", "items", "results"]),
        report_returned: !!payloadOf(report),
        evidence,
        findings,
        report,
        latest_status: latest,
      };
      setResult(summary);
      log("Persistence", "Re-fetched the investigation and result endpoints using the same ID; record remained addressable");
      log("Complete", "Synthetic engine lifecycle test finished. No SafeNestT case or database record was created.");
      setFinished(true);
    } catch (err) {
      const message = String(err?.message || err);
      setError(message);
      log("Failed", message);
      setFinished(true);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 text-slate-900">
      <header>
        <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">SafeNestT · Internal validation</div>
        <h1 className="mt-2 text-2xl font-bold">Hermes synthetic lifecycle test</h1>
        <p className="mt-2 text-sm text-slate-600">
          Runs exactly one clearly labeled narrative-only test against the isolated Hermes engine.
          It uses no real target, sends no SafeNestT case ID, and does not create or modify SafeNestT database records.
        </p>
      </header>
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Test boundary:</strong> This creates one synthetic investigation record inside the isolated Hermes engine.
        It does not touch live SafeNestT cases or the production database. Do not press Run more than once.
      </section>
      <button
        type="button"
        onClick={runTest}
        disabled={running || finished}
        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Running synthetic test…" : finished ? "Test finished — one run only" : "Run one synthetic Hermes test"}
      </button>
      {events.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Lifecycle trace</h2>
          <ol className="space-y-3">
            {events.map((event, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs text-slate-400">{event.at}</span>
                <span className="w-24 shrink-0 font-semibold text-slate-700">{event.step}</span>
                <span className="break-words text-slate-600">{event.detail}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {error && <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><strong>Test stopped:</strong> {error}</section>}
      {result && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Test results</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><dt className="text-slate-500">Engine status</dt><dd className="font-semibold">{result.final_status}</dd></div>
            <div><dt className="text-slate-500">Evidence items</dt><dd className="font-semibold">{result.evidence_count}</dd></div>
            <div><dt className="text-slate-500">Findings</dt><dd className="font-semibold">{result.findings_count}</dd></div>
            <div><dt className="text-slate-500">Report endpoint</dt><dd className="font-semibold">{result.report_returned ? "Returned" : "Empty"}</dd></div>
          </dl>
          <p className="mt-3 break-all text-xs text-slate-500">Synthetic investigation ID: {result.investigation_id}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold">Raw engine responses</summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </section>
      )}
    </main>
  );
}

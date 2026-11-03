import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const PROMPT = "Reply with exactly: OPENROUTER_LIVE_OK";

export default function OpenRouterSmokeTest() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const isAdmin = user?.role === "admin" || user?.tenant_role === "admin" ||
    user?.tenant_role === "owner" || user?.platform_role === "admin";

  const runOnce = async () => {
    if (running || result || !isAdmin) return;
    setRunning(true);
    setError("");
    try {
      const response = await base44.functions.invoke("openrouterProxy", {
        model: MODEL,
        prompt: PROMPT,
        temperature: 0,
        max_tokens: 20,
      });
      const body = response?.data ?? response;
      if (!body || body.ok !== true) {
        throw new Error(body?.error || "Proxy returned an unsuccessful response");
      }
      setResult({ model: body.model || MODEL, text: body.data });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setRunning(false);
    }
  };

  if (loadingUser) return <main className="p-8">Checking admin access…</main>;
  if (!isAdmin) return <main className="p-8">Admin access required.</main>;

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-8">
      <p className="text-xs font-semibold uppercase tracking-widest">Temporary internal smoke test</p>
      <h1 className="text-2xl font-bold">OpenRouter live response</h1>
      <p>This makes one provider call with only a synthetic prompt. It creates no case and writes no SafeNestT records.</p>
      <pre className="rounded bg-slate-100 p-3 text-sm">{PROMPT}</pre>
      <button
        type="button"
        onClick={runOnce}
        disabled={running || !!result}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {running ? "Calling OpenRouter…" : result ? "Smoke test completed" : "Run one OpenRouter smoke test"}
      </button>
      {error && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{error}</p>}
      {result && (
        <section className="rounded border border-green-300 bg-green-50 p-4">
          <h2 className="font-semibold">Live response received</h2>
          <p>Model: {result.model}</p>
          <pre className="mt-2 whitespace-pre-wrap">{String(result.text ?? "")}</pre>
        </section>
      )}
    </main>
  );
}

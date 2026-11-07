/**
 * Shared Etherscan V2 client for MIA (Ethereum mainnet, chainid=1).
 *
 * Why this exists: MIA used to fire several Etherscan calls at once and the
 * loss matcher swallowed every error, so a rate-limited request looked like a
 * wallet with "No transactions". This client
 *   - spaces calls out (the free tier only allows a few requests per second),
 *   - retries rate-limit / transient failures with backoff,
 *   - THROWS on real API errors, so a failed lookup can never be mistaken for
 *     an empty wallet. "No transactions found" is the only benign empty case.
 *
 * Tunables (env, optional): ES_THROTTLE_MS (default 350), ES_BACKOFF_MS (default 1200).
 */
const V2 = "https://api.etherscan.io/v2/api";
let nextSlot = 0;

function envNum(name: string, d: number): number {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw === null || raw === "") return d;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : d;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRateLimit = (b: any) =>
  /rate limit|max calls per sec/i.test(`${b?.message || ""} ${typeof b?.result === "string" ? b.result : ""}`);

export async function esCall(params: Record<string, string>, key: string): Promise<any> {
  const spacing = envNum("ES_THROTTLE_MS", 350);
  const backoff = envNum("ES_BACKOFF_MS", 1200);
  const maxTry = 4;
  let lastErr = "unknown error";

  for (let attempt = 1; attempt <= maxTry; attempt++) {
    // Reserve a time slot synchronously so parallel callers cannot fire together.
    const now = Date.now();
    const slot = Math.max(now, nextSlot);
    nextSlot = slot + spacing;
    if (slot > now) await sleep(slot - now);

    let res: Response;
    try {
      res = await fetch(`${V2}?${new URLSearchParams({ chainid: "1", ...params, apikey: key })}`);
    } catch (e: any) {
      lastErr = `network error: ${e?.message || e}`;
      if (attempt < maxTry) { await sleep(backoff * attempt); continue; }
      break;
    }

    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }

    if (body && isRateLimit(body)) {
      lastErr = "Etherscan rate limit";
      if (attempt < maxTry) { await sleep(backoff * attempt); continue; }
      break;
    }
    if (!res.ok || !body) {
      lastErr = `HTTP ${res.status}${body ? "" : " (non-JSON response)"}`;
      if ((res.status === 429 || res.status >= 500 || !body) && attempt < maxTry) { await sleep(backoff * attempt); continue; }
      break;
    }
    // status "0" with a string result is an error, except the benign empty-result messages.
    if (body.status === "0" && typeof body.result === "string" && !/no transactions found|no records found/i.test(`${body.message} ${body.result}`)) {
      throw new Error(`Etherscan error: ${body.result || body.message}`);
    }
    return body;
  }
  throw new Error(`Etherscan request failed after ${maxTry} attempts: ${lastErr}`);
}

// Behavioral tests for the MIA evidence fixes (on-chain totals, rate-limit handling,
// domain/Dehashed error reporting). They run the real modules against a stubbed fetch.
import test from "node:test";
import assert from "node:assert/strict";

const env = { ETHERSCAN_API_KEY: "test", ES_THROTTLE_MS: "0", ES_BACKOFF_MS: "0", DOMAIN_RETRY_MS: "0", Dehashed_api_key: "test" };
globalThis.Deno = { env: { get: (k) => env[k] } };

const W = "0x56810093085da36d91e49ed0de77bf71110320db";
const OTHER = "0x1111111111111111111111111111111111111111";
const wei = (eth) => String(BigInt(Math.round(eth * 1e6)) * 10n ** 12n);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function withFetch(handler, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => handler(new URL(String(url)), init);
  return Promise.resolve(fn()).finally(() => { globalThis.fetch = real; });
}

const { lookupWallet } = await import("../base44/shared/onchain.ts");
const { matchLoss } = await import("../base44/shared/lossMatch.ts");
const { runDomainEvidence } = await import("../base44/shared/domainIntel.ts");
const { runIdentityEvidence } = await import("../base44/shared/identityIntel.ts");

const ok = (result) => json({ status: "1", message: "OK", result });

test("on-chain totals include internal inbound ETH and exclude failed transactions", async () => {
  const handler = (u) => {
    const a = u.searchParams.get("action");
    if (a === "balance") return ok("0");
    if (a === "txlist") return ok([
      { hash: "0xa", timeStamp: "1700000300", from: W, to: OTHER, value: wei(3), isError: "0" },
      { hash: "0xb", timeStamp: "1700000200", from: W, to: OTHER, value: wei(5), isError: "1" }, // failed: moves no ETH
      { hash: "0xc", timeStamp: "1700000100", from: OTHER, to: W, value: wei(1), isError: "0" },
    ]);
    if (a === "txlistinternal") return ok([{ hash: "0xd", timeStamp: "1700000150", from: OTHER, to: W, value: wei(2), isError: "0" }]);
    if (a === "tokentx") return json({ status: "0", message: "No transactions found", result: [] });
    return json({ status: "0", message: "NOTOK", result: "unexpected" });
  };
  const r = await withFetch(handler, () => lookupWallet(W));
  assert.equal(r.state, "data");
  assert.equal(r.data.eth_in, 3, "1 ETH normal + 2 ETH internal");
  assert.equal(r.data.eth_out, 3, "failed 5 ETH tx must not count");
  assert.equal(r.data.eth_in_internal, 2);
  assert.equal(r.data.failed_tx_count, 1);
  assert.equal(r.data.internal_tx_count, 1);
  assert.match(r.summary, /internal/);
});

test("a rate-limited Etherscan response is an error, never an empty wallet", async () => {
  const limited = () => json({ status: "0", message: "NOTOK", result: "Max rate limit reached, please use API Key for higher rate limit" });
  const lw = await withFetch(limited, () => lookupWallet(W));
  assert.equal(lw.state, "error");
  const lm = await withFetch(limited, () => matchLoss(W, 48000));
  assert.equal(lm.state, "error");
  assert.match(lm.summary, /rate limit/i);
});

test("a genuinely empty wallet is still reported as empty", async () => {
  const empty = () => json({ status: "0", message: "No transactions found", result: [] });
  const lm = await withFetch(empty, () => matchLoss(W, 48000));
  assert.equal(lm.state, "empty");
});

test("domain lookups keep the HTTP status when a source returns an HTML block page", async () => {
  const created = [];
  const base44 = { entities: { EvidenceItem: { create: async (r) => { created.push(r); return r; } } } };
  const html = () => new Response("<!DOCTYPE html><html>blocked</html>", { status: 200, headers: { "content-type": "text/html" } });
  await withFetch(html, () => runDomainEvidence(base44, { id: "c1", tenant_id: "t1", scammer_info: { website: "example-scam.com" } }, [], null));
  const rdap = created.find((r) => r.tool_result.capability === "rdap.whois");
  assert.ok(rdap, "rdap evidence recorded");
  assert.equal(rdap.tool_result.state, "error");
  assert.match(rdap.tool_result.summary, /HTTP 200.*text\/html.*not JSON/);
  assert.doesNotMatch(rdap.tool_result.summary, /Unexpected token/);
});

test("Dehashed 401 and 403 are reported distinctly and accurately", async () => {
  const run = async (status, error) => {
    const created = [];
    const base44 = { entities: { EvidenceItem: { create: async (r) => { created.push(r); return r; } } } };
    await withFetch(() => json({ error }, status), () => runIdentityEvidence(base44, { id: "c1", tenant_id: "t1", scammer_info: { email: "x@evil-corp.com" } }, [], null));
    return created[0].tool_result.summary;
  };
  assert.match(await run(401, "No Authorization header present"), /401.*no Authorization header/i);
  assert.match(await run(403, "Issue with API Key"), /403.*rejected/i);
});

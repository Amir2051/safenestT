# MIA evidence fixes (branch fix/mia-evidence-onchain-domain-dehashed)

Found while reviewing the Craig Lee case run (SN-2026-00030, 2026-11-07).

| Problem | Root cause | Fix |
|---|---|---|
| On-chain totals wrong (16.5 ETH in / 60.0 out) | `lookupWallet` only called `txlist`; 10 inbound internal transfers (43.5 ETH) were never fetched; failed txs were counted | Fetch `txlistinternal`, include internal in/out, exclude `isError=1`, flag truncation at 1000 |
| Loss match said "No transactions" | `matchLoss` swallowed every Etherscan error (likely rate limit: 5 calls in ~0.3s) | New `etherscanClient.ts`: throttled, retries rate limits, throws on real errors; `matchLoss` returns `error` not `empty` |
| Domain lookups failed with "Unexpected token '<'" | `j()` parsed JSON inside try and lost the HTTP status; no retry | Safe parse, keep status + content type, one retry on 429/5xx/non-JSON; Shodan 403 explained |
| Dehashed "rejected the key (401)" | Mislabelled. Live API: 401 = no auth header seen, 403 = bad key | Distinct, accurate messages; key trimmed. Underlying 401 cause still needs one live call to confirm |

Not changed: the finding "evidence gate" still only checks that a cited item exists and has data.

Tests: `tests/mia-evidence-fixes.test.mjs` (behavioral, stubbed fetch).

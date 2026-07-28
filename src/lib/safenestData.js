// SafeNestT — local real-shaped data layer.
// The production app reads from Base44 entities (base44.entities.*). Without a
// connected Base44 backend those calls return nothing, so the UI looks empty.
// This module provides a believable, well-shaped dataset (cases, wallets,
// threats, KPIs, intelligence feeds) that mirrors the InvestigationCase /
// CryptoWallet / Alert entity shapes. Components that need offline/populated
// data import from here; the Base44 SDK path is untouched for production.
//
// NOTE: sample/inferred data for demonstration + local development only.
// No real PII, no real victim records.

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
const hrsAgo = (h) => new Date(now - h * 3600000).toISOString();

export const cases = [
  {
    id: "case-1001",
    case_number: "SNT-2026-1001",
    case_title: "Pig Butchering Crypto Drain — USDC/ETH",
    victim_name: "J. Alvarez",
    fraud_type: "pig_butchering",
    status: "investigating",
    priority: "critical",
    amount_stolen_usd: 482500,
    cryptocurrency: "ETH",
    blockchain: "ethereum",
    incident_date: daysAgo(12),
    investigation_progress: 64,
    assigned_investigator: "mia_security_advisor",
    scammer_info: { name: "Wei C.", wallet_addresses: ["0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3"] },
    suspect_details: { wallet_addresses: ["0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3", "0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1"] },
    monitored_wallets: ["0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3", "0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1"],
    transaction_hashes: ["0xaa11...", "0xbb22...", "0xcc33..."],
    last_activity: hrsAgo(3),
    agencies_contacted: ["FBI IC3", "Chainalysis"],
    linked_case_ids: ["case-1002", "case-1004"],
    timeline: [
      { date: daysAgo(12), event: "First contact via dating app", details: "Subject established romance narrative" },
      { date: daysAgo(9), event: "Initial deposit to fake exchange", details: "$120k USDC" },
      { date: daysAgo(4), event: "Withdrawal blocked, funds drained", details: "Full balance moved to mixer" },
    ],
  },
  {
    id: "case-1002",
    case_number: "SNT-2026-1002",
    case_title: "Fake Exchange Rug Pull — BNB Chain",
    victim_name: "M. Okafor",
    fraud_type: "rug_pull",
    status: "submitted",
    priority: "high",
    amount_stolen_usd: 127300,
    cryptocurrency: "BNB",
    blockchain: "bsc",
    incident_date: daysAgo(21),
    investigation_progress: 81,
    assigned_investigator: "mia_security_advisor",
    scammer_info: { name: "NovaSwap Team", wallet_addresses: ["0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1"] },
    suspect_details: { wallet_addresses: ["0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1"] },
    monitored_wallets: ["0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1"],
    transaction_hashes: ["0xdd44..."],
    last_activity: daysAgo(2),
    agencies_contacted: ["IC3"],
    linked_case_ids: ["case-1001"],
  },
  {
    id: "case-1003",
    case_number: "SNT-2026-1003",
    case_title: "Phishing Seed Leak — Solana",
    victim_name: "R. Tanaka",
    fraud_type: "phishing",
    status: "recovering",
    priority: "medium",
    amount_stolen_usd: 18900,
    cryptocurrency: "SOL",
    blockchain: "solana",
    incident_date: daysAgo(5),
    investigation_progress: 45,
    assigned_investigator: "mia_security_advisor",
    scammer_info: { name: "WalletCare Support", wallet_addresses: ["7xKQ9mP2vN4bR8sT1uW3yZ5aC6dE7fG8hJ9kL0"] },
    suspect_details: { wallet_addresses: ["7xKQ9mP2vN4bR8sT1uW3yZ5aC6dE7fG8hJ9kL0"] },
    monitored_wallets: ["7xKQ9mP2vN4bR8sT1uW3yZ5aC6dE7fG8hJ9kL0"],
    transaction_hashes: ["0xee55..."],
    last_activity: hrsAgo(20),
    recovery_amount: 4200,
    agencies_contacted: [],
  },
  {
    id: "case-1004",
    case_number: "SNT-2026-1004",
    case_title: "Investment Scam — Multi-chain",
    victim_name: "D. Schmidt",
    fraud_type: "investment_scam",
    status: "law_enforcement",
    priority: "high",
    amount_stolen_usd: 905000,
    cryptocurrency: "BTC",
    blockchain: "bitcoin",
    incident_date: daysAgo(34),
    investigation_progress: 92,
    assigned_investigator: "mia_security_advisor",
    scammer_info: { name: "Apex Yield Group", wallet_addresses: ["bc1q9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1"] },
    suspect_details: { wallet_addresses: ["bc1q9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1", "0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3"] },
    monitored_wallets: ["bc1q9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1", "0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3"],
    transaction_hashes: ["0xff66..."],
    last_activity: daysAgo(1),
    linked_case_ids: ["case-1001"],
    agencies_contacted: ["FBI", "Europol"],
  },
];

export const wallets = [
  { address: "0x9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1e3", label: "Primary suspect", risk: "critical", chains: ["ethereum"], first_seen: daysAgo(12), last_seen: hrsAgo(3), tx_count: 412, total_usd: 1840000 },
  { address: "0x3a7b1c9e2d4f6a8b0c1d3e5f7a9b2c4d6e8f0a1", label: "Mixer / hop", risk: "high", chains: ["ethereum", "bsc"], first_seen: daysAgo(30), last_seen: hrsAgo(9), tx_count: 1023, total_usd: 4200000 },
  { address: "7xKQ9mP2vN4bR8sT1uW3yZ5aC6dE7fG8hJ9kL0", label: "Phishing drainer", risk: "critical", chains: ["solana"], first_seen: daysAgo(6), last_seen: hrsAgo(20), tx_count: 88, total_usd: 64000 },
  { address: "bc1q9f1c4b7d2a8e6c0b3d5f7a1e9c2b4d6f8a0c1", label: "Apex Yield cold", risk: "high", chains: ["bitcoin"], first_seen: daysAgo(40), last_seen: daysAgo(1), tx_count: 56, total_usd: 2100000 },
];

export const threats = [
  { id: "th-1", type: "malware", severity: "high", title: "Spyware signature detected on endpoint", source: "device-scan", created_at: hrsAgo(2), status: "active" },
  { id: "th-2", type: "phishing", severity: "critical", title: "Credential phishing domain flagged", source: "web-check", created_at: hrsAgo(6), status: "active" },
  { id: "th-3", type: "breach", severity: "medium", title: "Email found in historical breach corpus", source: "hibp", created_at: daysAgo(1), status: "resolved" },
  { id: "th-4", type: "anomaly", severity: "low", title: "New login from unrecognized device", source: "auth", created_at: hrsAgo(28), status: "active" },
];

export const intelligence = [
  { id: "int-1", category: "crypto", title: "NovaSwap deployer wallet linked to 3 additional rugs", confidence: 0.91, created_at: hrsAgo(5) },
  { id: "int-2", category: "pattern", title: "Pig-butchering template matches 14 open cases this quarter", confidence: 0.86, created_at: daysAgo(1) },
  { id: "int-3", category: "threat-actor", title: "Cluster 'Apex Yield' active across 6 jurisdictions", confidence: 0.78, created_at: daysAgo(2) },
];

// Aggregate KPIs derived from the above (so the dashboard shows live-feel numbers).
export const kpis = (() => {
  const open = cases.filter((c) => !["recovered", "closed"].includes(c.status));
  const totalLoss = cases.reduce((s, c) => s + (c.amount_stolen_usd || 0), 0);
  const recovered = cases.reduce((s, c) => s + (c.recovery_amount || 0), 0);
  const avgProgress = Math.round(cases.reduce((s, c) => s + (c.investigation_progress || 0), 0) / cases.length);
  return {
    activeCases: open.length,
    totalCases: cases.length,
    totalLossUsd: totalLoss,
    recoveredUsd: recovered,
    avgProgress,
    criticalThreats: threats.filter((t) => t.severity === "critical" && t.status === "active").length,
    monitoredWallets: wallets.length,
    linkedConnections: cases.reduce((s, c) => s + (c.linked_case_ids?.length || 0), 0),
    intelligenceSignals: intelligence.length,
  };
})();

// Simulated on-device AI analysis of a wallet (deterministic, no external call).
export function analyzeWallet(address) {
  const w = wallets.find((x) => x.address.toLowerCase() === String(address).toLowerCase());
  if (!w) {
    return { found: false, address, risk: "unknown", signals: [], recommendation: "No known exposure in monitored set. Continue monitoring." };
  }
  const signals = [
    w.risk === "critical" ? "Associated with active drainer/romance-scam cluster" : null,
    w.tx_count > 500 ? "High-velocity forwarding consistent with laundering hop" : null,
    w.total_usd > 1000000 ? "Aggregated value exceeds $1M — likely consolidation wallet" : null,
  ].filter(Boolean);
  return {
    found: true,
    address: w.address,
    risk: w.risk,
    chains: w.chains,
    txCount: w.tx_count,
    totalUsd: w.total_usd,
    signals,
    recommendation: w.risk === "critical"
      ? "Escalate to law enforcement; preserve chain-of-custody. Do NOT engage subject."
      : "Monitor; add to cross-case correlator for pattern matching.",
  };
}

export default { cases, wallets, threats, intelligence, kpis, analyzeWallet };
export const data = { cases, wallets, threats, intelligence, kpis, analyzeWallet };

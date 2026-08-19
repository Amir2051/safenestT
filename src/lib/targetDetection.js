/**
 * Target Detection — scans text for investigation-relevant patterns.
 *
 * This is FRONTEND pattern matching only. It does NOT analyze targets —
 * it simply detects possible values (wallet addresses, emails, IPs, etc.)
 * in imported data so the investigator can review them before adding as
 * targets. All actual analysis is performed by Hermes.
 */

const PATTERNS = [
  { type: "wallet_address", label: "Wallet Address", regex: /\b0x[a-fA-F0-9]{40}\b/g },
  { type: "transaction_hash", label: "Transaction Hash", regex: /\b0x[a-fA-F0-9]{64}\b/g },
  { type: "email", label: "Email", regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  { type: "ip_address", label: "IP Address", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
  { type: "url", label: "URL", regex: /\bhttps?:\/\/[^\s<>"']+/gi },
  { type: "domain", label: "Domain", regex: /\b(?!(?:https?:\/\/|www\.))[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?){1,}\.(?:com|net|org|io|co|xyz|me|info|biz|us|uk|de|fr|nl|ru|cn|au|ca|app|dev|tech|wallet|exchange|trade|coin|crypto|eth|btc)\b/gi },
  { type: "phone", label: "Phone Number", regex: /\b\+?[\d\s\-()]{10,}\b/g },
];

/**
 * Scans text for investigation-relevant patterns.
 * Returns an array of { type, value } objects.
 */
export function detectTargets(text) {
  if (!text || typeof text !== "string") return [];
  const results = [];
  const seen = new Set();

  for (const { type, regex } of PATTERNS) {
    const matches = text.match(regex) || [];
    for (const match of matches) {
      const value = match.trim();
      const key = `${type}:${value.toLowerCase()}`;
      if (!seen.has(key) && value.length > 4) {
        seen.add(key);
        results.push({ type, value });
      }
    }
  }
  return results;
}

/**
 * Scans a parsed record (object) for targets across all field values.
 */
export function detectTargetsInRecord(record) {
  if (!record || typeof record !== "object") return [];
  const allText = Object.values(record)
    .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
    .join(" ");
  return detectTargets(allText);
}

/**
 * Scans an array of parsed records for targets.
 * Returns deduplicated results.
 */
export function detectTargetsInRecords(records) {
  if (!Array.isArray(records)) return [];
  const allTargets = [];
  const seen = new Set();

  for (const record of records) {
    const targets = detectTargetsInRecord(record);
    for (const t of targets) {
      const key = `${t.type}:${t.value.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        allTargets.push(t);
      }
    }
  }
  return allTargets;
}
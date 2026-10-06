/**
 * UME — Unified Metadata Enrichment (SafeNestT OS data module)
 *
 * Central data + provenance + matching module for SafeNestT OS.
 *
 * This module is the single source of truth for:
 *  - data catalogs / sources (VARA, Dubai Pulse, Dateno)
 *  - record provenance (source_url, source_name, retrieved_at, source_record_id, ...)
 *  - entity matching / filter helpers (VASP registry, UAE sources, global public data)
 *
 * It deliberately does NOT perform live API calls. Live retrieval is done
 * server-side through the Base44 function layer (datenoEnrichProxy,
 * osintProxy, uae-intel-sync). This module keeps the *data contract* and
 * *matching logic* importable, testable, and free of side effects.
 *
 * Design rules:
 *  - All matched records carry provenance alongside data.
 *  - No record is treated as proof of fraud by itself.
 *  - Matching (name / domain / email / phone / country / wallet / transaction)
 *    is deterministic and auditable.
 */

// ── Provenance constants ────────────────────────────────────────────────────

/** Well-known source identifiers (stable keys for joins). */
export const SOURCES = {
  VARA_PUBLIC_REGISTER: "vara_public_register",
  DUBAI_PULSE: "dubai_pulse",
  DATENO: "dateno",
};

/** Record-level provenance fields that every imported/matched record must carry. */
export const PROVENANCE_FIELDS = [
  "source_url",
  "source_name",
  "retrieved_at",
  "source_record_id",
  "source_record_order",
];

// ── VASP / Licence / Activity (Dateno enrichment context) ───────────────────

/** VASP registry record provenance (VARA or Dateno-sourced). */
export function VaspRecord(overrides = {}) {
  return {
    // Identity
    id: null,
    name: null,
    reference: null,
    vara_reference: null,
    // Licence
    licence_type: null,
    licence_date: null,
    status: "Active",
    cma_registration: null,
    // Licenced activities
    licensed_activities: [],
    // Domains / identifiers linked to the VASP
    domains: [],
    websites: [],
    wallet_addresses: [],
    // Provenance
    source_url: null,
    source_name: null,
    retrieved_at: null,
    source_record_id: null,
    source_record_order: null,
    jurisdiction: null,
    dataset_id: null,
    dataset_title: null,
    dataset_url: null,
    dataset_description: null,
    ...overrides,
  };
}

// A controlled set of fields that the VASP record controller treats as load-bearing.
export const VASPRECORD_FIELD_MAP = {
  // identity
  "VASP Name": "name",
  "Reference": "reference",
  "Licence Type": "licence_type",
  "Licensed Activities": "licensed_activities",
  "Licence Issued": "licence_date",
  "Status": "status",
  "CMA Registration Number": "cma_registration",
};

/** Normalise a raw cell value (strip HTML, collapse whitespace, etc.). */
export function normaliseCell(raw) {
  if (raw === null || raw === undefined) return null;
  let text = String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  // Drop a leading @ footnote marker (Dateno/VARA convention).
  if (text.startsWith("@")) text = text.slice(1).trim();
  return text || null;
}

/** Build the full provenance envelope for an imported record. */
export function buildProvenance(record, retrievedAt, sourceUrl, sourceName, sourceRecordId = "", sourceRecordOrder = "") {
  const base = { ...record };
  return {
    ...base,
    source_url: sourceUrl,
    source_name: sourceName,
    retrieved_at: retrievedAt,
    source_record_id: sourceRecordId,
    source_record_order: sourceRecordOrder,
  };
}

// ── Source field mapping: key -> SafeNestT entity field(s) ──────────────────

/** Map a Dateno hit's provenace fields onto SafeNestT entity fields. */
export function mapDatenoHitToEntity(hit) {
  const src = hit?._source;
  const dataset = src?.dataset || {};
  const source = src?.source || {};

  return {
    // Generic enrichment notes (kept for the front end to display).
    source_name: source?.name || null,
    source_url: source?.url || null,
    owner_name: source?.owner_name || null,
    owner_type: source?.owner_type || null,
    catalog_type: source?.catalog_type || null,
    dataset_id: dataset?.id || null,
    dataset_int_id: dataset?.int_id || null,
    dataset_title: dataset?.title || null,
    dataset_url: dataset?.url || null,
    dataset_description: dataset?.description || null,
    dataset_date_created: dataset?.date_created || null,
    dataset_date_changed: dataset?.date_changed || null,
    dataset_license_id: dataset?.license_id || null,
    dataset_datatypes: dataset?.datatypes || [],
    dataset_formats: dataset?.formats || [],
    dataset_tags: dataset?.tags || [],
    dataset_topics: dataset?.topics || [],
    dataset_topics_original: dataset?.topics_original || [],
    dataset_num_resources: dataset?.num_resources ?? null,
    dataset_has_archive: dataset?.has_archive ?? false,
    source_uid: source?.uid || null,
    source_countries: source?.countries || [],
    source_macroregions: source?.macroregions || [],
    source_software: source?.software || null,
    hit_id: hit?._id || null,
    hit_score: hit?._score ?? null,
  };
}

/** Normalise a raw Dateno hit into a SafeNestT provenance record (re-export). */
export function normaliseDatenoHit(hit) {
  return mapDatenoHitToEntity(hit);
}

// ── Masking / redaction helpers (for UI / logs) ─────────────────────────────

/** Mask a string value for display in logs or non-moderated UI (e.g. emails). */
export function maskValue(value, maskLength = 4) {
  if (!value) return value;
  const n = Math.max(0, Math.min(maskLength, value.length));
  if (n <= 1) return value;
  return value.slice(0, n) + "•".repeat(value.length - n) + value.slice(-n);
}

/** Redact a JSON-safe string; objects pass through (caller must mask values). */
export function redactJson(value, maxLen = 8) {
  if (typeof value !== "string") return JSON.stringify(value);
  if (value.length <= maxLen * 2) return value;
  const head = value.slice(0, maxLen / 2);
  const tail = value.slice(-maxLen / 2);
  return `${head}…${tail}`;
}

export const DATA_BROKERS = [
  "Spokeo", "WhitePages", "BeenVerified", "Intelius", "PeopleFinder",
  "PeopleSmart", "PeopleLooker", "Radaris", "Pipl", "ZabaSearch",
  "TruthFinder", "Instant Checkmate", "US Search", "PublicRecords360",
  "AnyWho", "MyLife", "FastPeopleSearch", "ClustrMaps", "FamilyTreeNow",
  "Acxiom", "LexisNexis", "Epsilon", "Experian", "Oracle Data Cloud",
  "Nielson", "Datalogix", "BlueKai", "TargetSmart", "Catalist", "i360",
  "L2", "Aristotle", "Ancestry", "PeekYou", "Addresses.com",
  "YellowPages", "Classmates", "TransUnion", "Equifax", "Voila Norbert",
];

export const MEGA_BREACHES = [
  { name: "RockYou2024", date: "2024-07-04", records: "10B", severity: "CRITICAL" },
  { name: "LinkedIn 2021", date: "2021-06-22", records: "700M", severity: "HIGH" },
  { name: "Facebook 2021", date: "2021-04-03", records: "533M", severity: "HIGH" },
  { name: "Equifax 2017", date: "2017-09-07", records: "147M", severity: "CRITICAL" },
  { name: "Yahoo 2013", date: "2013-08-01", records: "3B", severity: "CRITICAL" },
  { name: "Adobe 2013", date: "2013-10-04", records: "153M", severity: "MEDIUM" },
  { name: "Dropbox 2012", date: "2012-07-01", records: "68M", severity: "MEDIUM" },
  { name: "MySpace 2016", date: "2016-05-31", records: "360M", severity: "HIGH" },
  { name: "Twitter 2022", date: "2022-07-01", records: "5.4M", severity: "MEDIUM" },
  { name: "T-Mobile 2023", date: "2023-01-19", records: "37M", severity: "HIGH" },
];

export const MAJOR_SERVICES = [
  { name: "Google", category: "Search & Ads", sharing: true },
  { name: "Meta", category: "Social Media", sharing: true },
  { name: "Amazon", category: "E-Commerce", sharing: true },
  { name: "Apple", category: "Device", sharing: false },
  { name: "Microsoft", category: "Productivity", sharing: true },
  { name: "Twitter/X", category: "Social Media", sharing: false },
  { name: "TikTok", category: "Social Media", sharing: true },
  { name: "Spotify", category: "Entertainment", sharing: false },
  { name: "Netflix", category: "Entertainment", sharing: false },
  { name: "Uber", category: "Transportation", sharing: true },
  { name: "LinkedIn", category: "Professional", sharing: false },
  { name: "PayPal", category: "Finance", sharing: true },
];

export function calcPrivacyScore(hub, guardState) {
  let score = 0;

  // Privacy Guard: up to 15 pts
  const blocked = (guardState?.blocked_domains || []).length;
  score += Math.min(blocked * 0.5, 15);

  // Broker removals: up to 30 pts
  const requests = hub?.broker_requests || [];
  const confirmed = requests.filter(r => r.status === "confirmed").length;
  const submitted = requests.filter(r => r.status === "submitted" || r.status === "sent").length;
  score += Math.min(confirmed * 2 + submitted * 0.5, 30);

  // Exposure scan: up to 5 pts
  if ((hub?.exposure_scans || []).length > 0) score += 5;

  // Dark web monitoring: up to 20 pts
  const emails = (hub?.dark_web_emails || []).length;
  const actionedBreaches = (hub?.dark_web_breaches || []).filter(b => b.actioned);
  score += Math.min(emails * 3 + actionedBreaches.reduce((a, b) => a + (b.severity === "CRITICAL" ? 5 : 3), 0), 20);

  // Footprint map: up to 15 pts
  const svcs = hub?.footprint_services || [];
  score += Math.min(svcs.filter(s => s.downloaded).length + svcs.filter(s => s.deleted).length * 3 + svcs.filter(s => s.opted_out).length * 2, 15);

  // Cookie settings: up to 10 pts
  const cs = hub?.cookie_settings || {};
  score += (cs.gpc ? 5 : 0) + (cs.block_third_party ? 5 : 0);

  // Vault usage: up to 5 pts (bonus)
  if ((hub?.vault_documents || []).length > 0) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getScoreBand(score) {
  if (score >= 80) return { label: "Well Protected", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/40" };
  if (score >= 60) return { label: "Moderate Risk", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/40" };
  if (score >= 40) return { label: "Elevated Risk", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/40" };
  return { label: "High Risk", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40" };
}
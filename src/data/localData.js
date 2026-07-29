export const KPI = {
  openCases: 24,
  criticalAlerts: 7,
  walletsTraced: 128,
  recoverability: 0.64,
  responseTime: '4m 12s',
  evidencePackages: 35,
  federalSubmissions: 4,
  activeAgents: 6,
};

export const RECENT_CASES = [
  {
    id: 'SNT-2026-701',
    case_number: 'SNT-2026-701',
    title: 'Manhattan forged deed - 245 W 42nd St',
    status: 'open',
    priority: 'critical',
    loss_usd: 184200,
    assigned_to: 'owner@safenestt.test',
    client: 'alice.tan@example.com',
    issue_type: 'Deed Fraud',
    tags: ['forged-deed','manhattan','elder-risk'],
    ai_analysis: {
      correlation_score: 82,
      recovery_score: 58,
      laundering_stage: 'layering',
      recommended_action: 'escalate_to_agency',
      confidence: 0.83,
      patterns: ['Shared notary infra across 3 cases','Peeling-chain wallet flow'],
      summary: 'Strong infrastructure reuse with partial wallet clustering. Recommend recorder notice + IC3 package.'
    },
    scammer_info: {
      email: 'clerk4hire@proton.me',
      phones: ['+1-212-555-0148'],
      wallets: ['0x4a3f2b1c1987c0d5e3f8b6a2d5f9c1e4b7a0d8f3'],
    },
    created_date: '2026-07-19T04:12:00Z'
  },
  {
    id: 'SNT-2026-702',
    case_number: 'SNT-2026-702',
    title: 'Brooklyn forged transfer - 1123 Atlantic Ave',
    status: 'open',
    priority: 'high',
    loss_usd: 98000,
    assigned_to: 'owner@safenestt.test',
    client: 'ben.ortiz@example.com',
    issue_type: 'Title Fraud',
    tags: ['title-fraud','brooklyn','notary-link'],
    ai_analysis: {
      correlation_score: 64,
      recovery_score: 71,
      laundering_stage: 'initial_deposit',
      recommended_action: 'freeze_recommended',
      confidence: 0.77,
      patterns: ['Notary reuse with SNT-2026-701','Exchange deposit clustering'],
      summary: 'Related to SNT-2026-701 through notary metadata and shared escrow contact.'
    },
    scammer_info: {
      email: 'docprep88@fastmail.com',
      phones: ['+1-347-555-0199'],
      wallets: ['0x8b1c9d4e5a6f7c8b9d0e1a2f3b4c5d6e7f8a9b0c'],
    },
    created_date: '2026-07-20T20:45:00Z'
  },
  {
    id: 'SNT-2026-703',
    case_number: 'SNT-2026-703',
    title: 'Queens suspicious ownership change',
    status: 'open',
    priority: 'medium',
    loss_usd: 152500,
    assigned_to: 'owner@safenestt.test',
    client: 'carmen.lee@example.com',
    issue_type: 'Deed Fraud',
    tags: ['deed-fraud','queens','shell-company'],
    ai_analysis: {
      correlation_score: 47,
      recovery_score: 46,
      laundering_stage: 'unknown',
      recommended_action: 'flag_for_review',
      confidence: 0.62,
      patterns: ['Shell company reuse across Queens filings','Weak witness chain'],
      summary: 'Possible shell network. Needs county search across 3 parcels and UCC search.'
    },
    scammer_info: {
      email: 'titleworks204@gmail.com',
      phones: ['+1-718-555-0177'],
      wallets: ['0x2c4d6e8f0a2b4c6d8e0f2a4c6e8d0f2a4b6c8d0e'],
    },
    created_date: '2026-07-22T11:20:00Z'
  },
  {
    id: 'SNT-2026-704',
    case_number: 'SNT-2026-704',
    title: 'Bronx elder exploitation - 890 Grand Concourse',
    status: 'open',
    priority: 'critical',
    loss_usd: 326000,
    assigned_to: 'owner@safenestt.test',
    client: 'david.park@example.com',
    issue_type: 'Elder Exploitation',
    tags: ['elder-risk','power-of-attorney','financial-abuse'],
    ai_analysis: {
      correlation_score: 91,
      recovery_score: 34,
      laundering_stage: 'integration',
      recommended_action: 'escalate_to_agency',
      confidence: 0.91,
      patterns: ['Shared notary + agent link','POA + quitclaim combo','Repeated underprice conveyance'],
      summary: 'Highest-loss case with strong elder-exploitation indicators. Immediate protective filing + forensic accounting.'
    },
    scammer_info: {
      email: 'fiduciary_now@yahoo.com',
      phones: ['+1-917-555-0133', '+1-917-555-0144'],
      wallets: ['0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e','0x11223344556677889900aabbccddeeff00112233'],
    },
    created_date: '2026-07-23T18:05:00Z'
  },
  {
    id: 'SNT-2026-705',
    case_number: 'SNT-2026-705',
    title: 'Staten Island closed-title fraud - 55 Bay St',
    status: 'open',
    priority: 'high',
    loss_usd: 121000,
    assigned_to: 'owner@safenestt.test',
    client: 'eva.moore@example.com',
    issue_type: 'Title Fraud',
    tags: ['closed-title','staten-island','mortgage-fraud'],
    ai_analysis: {
      correlation_score: 39,
      recovery_score: 55,
      laundering_stage: 'layering',
      recommended_action: 'monitor',
      confidence: 0.59,
      patterns: ['Closer-of-record reuse','Title insurer outlier pattern'],
      summary: 'Further title-search and recorder-chain verification required; no strong cross-case hit yet.'
    },
    scammer_info: {
      email: 'notarypro@outlook.com',
      phones: ['+1-718-555-0166'],
      wallets: ['0xabcdef1234567890abcdef1234567890abcdef12'],
    },
    created_date: '2026-07-25T09:30:00Z'
  }
];

export const RELATED_CONNECTIONS = (caseId) => {
  const edges = [
    ['SNT-2026-701','SNT-2026-702','Notary + notarizing agent linkage','high',60],
    ['SNT-2026-701','SNT-2026-704','Shared metadata and agent identity signals','high',89],
    ['SNT-2026-702','SNT-2026-703','Shared escrow contact + title co. pattern','medium',42],
    ['SNT-2026-704','SNT-2026-702','Elder-exploitation signature overlap','high',67]
  ];
  return edges.filter(e => e.includes(caseId) && e[0] === caseId)
    .map(e => ({target:e[1],label:e[2],confidence:e[3],score:e[4]}));
};

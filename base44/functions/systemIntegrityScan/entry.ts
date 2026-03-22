import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        // Security check - although for a scan tool, we might want to allow it to run
        // But strictly should be admin.
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
             return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const report = {
            timestamp: new Date().toISOString(),
            modules: {
                case_flow: { status: 'PASS', details: [] },
                evidence: { status: 'PASS', details: [] },
                crypto_intel: { status: 'PASS', details: [] },
                reports: { status: 'PASS', details: [] },
                admin: { status: 'PASS', details: [] }
            },
            summary: "System Integrity Scan Initiated"
        };

        // 1. SCAN CASE FLOW & WALLET VALIDATION
        const cases = await base44.asServiceRole.entities.MyCase.list('-created_date', 100);
        let caseWarnings = 0;
        
        for (const c of cases) {
            // Check Wallet Validation Enforcement
            if (!c.victim_wallet && !c.scammer_wallet) {
                report.modules.case_flow.details.push(`Case ${c.case_number} missing BOTH wallets.`);
                caseWarnings++;
            } else {
                // Check format if present
                const validEth = /^0x[a-fA-F0-9]{40}$/;
                const validBtc = /^(1|3)[a-zA-Z0-9]{25,34}$|^bc1[a-zA-Z0-9]{39,59}$/;
                const validTron = /^T[a-zA-Z0-9]{33}$/;
                
                [c.victim_wallet, c.scammer_wallet].forEach(w => {
                    if (w && !(validEth.test(w) || validBtc.test(w) || validTron.test(w))) {
                         // Soft fail/Warning for non-standard or Solana addresses if not supported yet
                         // But we flag it to check logic
                         // Actually, we'll mark as warning only if completely weird
                         if (w.length < 20) {
                             report.modules.case_flow.details.push(`Case ${c.case_number} has potentially invalid wallet format: ${w}`);
                             caseWarnings++;
                         }
                    }
                });
            }

            // Check Required Fields
            if (!c.amount_lost && c.amount_lost !== 0) {
                 report.modules.case_flow.details.push(`Case ${c.case_number} missing amount_lost.`);
                 caseWarnings++;
            }
        }

        if (caseWarnings > 0) report.modules.case_flow.status = 'WARNING';


        // 2. SCAN EVIDENCE & PARSING
        const evidenceFiles = await base44.asServiceRole.entities.CaseEvidenceFile.list('-uploaded_at', 50);
        let evidenceIssues = 0;
        
        for (const f of evidenceFiles) {
            if (f.parse_status === 'FAILED') {
                report.modules.evidence.details.push(`File ${f.filename} (Case ${f.case_id}) failed parsing: ${f.parse_errors}`);
                evidenceIssues++;
            }
            if (f.parse_status === 'PENDING') {
                const uploadTime = new Date(f.uploaded_at).getTime();
                const now = new Date().getTime();
                if ((now - uploadTime) > 3600000) { // 1 hour
                    report.modules.evidence.details.push(`File ${f.filename} stuck in PENDING for > 1hr.`);
                    evidenceIssues++;
                }
            }
        }
        
        if (evidenceIssues > 0) report.modules.evidence.status = 'WARNING';


        // 3. SCAN CRYPTO INTEL & LINKING
        const monitors = await base44.asServiceRole.entities.WalletMonitor.list(null, 50);
        let intelIssues = 0;

        for (const m of monitors) {
            if (!m.fraud_case_id) {
                report.modules.crypto_intel.details.push(`Monitor for ${m.wallet_address} is orphaned (no case linked).`);
                intelIssues++;
            }
        }
        
        // Check auto-population in cases
        const casesWithWallets = cases.filter(c => c.scammer_wallet);
        for (const c of casesWithWallets) {
            if (!c.wallet_analysis && !c.scammer_info) {
                 // Should have populated if logic worked
                 report.modules.crypto_intel.details.push(`Case ${c.case_number} has wallet but missing auto-populated intelligence.`);
                 intelIssues++;
            }
        }

        if (intelIssues > 0) report.modules.crypto_intel.status = 'WARNING';


        // 4. SCAN ADMIN OVERRIDES & LOGS
        const auditLogs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 20);
        if (auditLogs.length === 0) {
             report.modules.admin.details.push("No audit logs found recently. Logging might be silent.");
             report.modules.admin.status = 'WARNING';
        } else {
             report.modules.admin.details.push(`Audit logging active. ${auditLogs.length} recent entries found.`);
        }


        // 5. REPORT GENERATION CHECK (Logic Check)
        // We can't easily check if a PDF generation failed unless we logged it.
        // We'll check if cases have 'redacted_fields' set, ensuring the redact logic is persisting
        const redactedCases = cases.filter(c => c.redacted_fields && c.redacted_fields.length > 0);
        if (redactedCases.length > 0) {
            report.modules.reports.details.push(`Redaction logic active. ${redactedCases.length} cases have redacted fields.`);
        } else {
            report.modules.reports.details.push("No cases have redacted fields currently.");
        }


        return Response.json({ success: true, report });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
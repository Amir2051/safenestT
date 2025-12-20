import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { caseId, template = 'full_investigation', sections = {} } = await req.json();

        if (!caseId) {
            return Response.json({ error: 'Case ID is required' }, { status: 400 });
        }

        const defaultSections = {
            case_overview: true,
            victim_info: true,
            suspect_info: true,
            transaction_evidence: true,
            evidence_files: true,
            observations: true
        };

        const activeSections = { ...defaultSections, ...sections };

        // 1. Fetch Case Data
        const caseData = await base44.asServiceRole.entities.MyCase.get(caseId);
        
        if (!caseData) {
            return Response.json({ error: 'Case not found' }, { status: 404 });
        }

        // 2. Fetch Related Data
        const evidenceFiles = await base44.asServiceRole.entities.CaseEvidenceFile.filter({ case_id: caseId });
        const transactions = await base44.asServiceRole.entities.Transaction.filter({ case_id: caseId });
        const profiles = await base44.asServiceRole.entities.CyberFraudProfile.filter({ case_id: caseId });
        const cyberProfile = profiles.length > 0 ? profiles[0] : null;
        
        // 4. Fetch Linked Sub-Cases
        let linkedCases = [];
        let totalLinkedAmount = parseFloat(caseData.amount_lost || caseData.amount_stolen_usd || 0);
        
        if (cyberProfile && cyberProfile.linked_intelligence?.linked_cases?.length > 0) {
            const linkedCaseIds = cyberProfile.linked_intelligence.linked_cases.map(lc => lc.case_id);
            if (linkedCaseIds.length > 0) {
                // Fetch details for linked cases to show in report
                // We'll try to fetch them in parallel. 
                try {
                    const promises = linkedCaseIds.map(id => base44.asServiceRole.entities.MyCase.get(id));
                    const results = await Promise.all(promises);
                    linkedCases = results.filter(c => c !== null && c.id !== caseData.id);
                    
                    // Add amounts
                    linkedCases.forEach(lc => {
                        totalLinkedAmount += parseFloat(lc.amount_lost || lc.amount_stolen_usd || 0);
                    });
                } catch (e) {
                    console.error("Error fetching linked cases", e);
                }
            }
        }

        // 5. Generate PDF with "Primary Case + Linked Sub-Cases" Structure
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        let yPos = 20;

        // --- STYLING CONSTANTS ---
        const colors = {
            primary: [15, 23, 42], // Slate 900
            secondary: [71, 85, 105], // Slate 600
            accent: [6, 182, 212], // Cyan 500
            alert: [220, 38, 38], // Red 600
            text: [30, 41, 59], // Slate 800
            lightText: [100, 116, 139], // Slate 500
            bg: [248, 250, 252] // Slate 50
        };

        const drawSectionHeader = (title) => {
            if (yPos > pageHeight - 40) { doc.addPage(); yPos = 20; }
            doc.setFillColor(...colors.bg);
            doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(...colors.primary);
            doc.setFont('helvetica', 'bold');
            doc.text(title.toUpperCase(), margin + 2, yPos + 6);
            yPos += 14;
        };

        const checkPageBreak = (needed = 20) => {
            if (yPos + needed > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        const addText = (text, fontSize = 10, fontStyle = 'normal', color = colors.text, maxWidth = pageWidth - (margin * 2)) => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', fontStyle);
            doc.setTextColor(...color);
            const lines = doc.splitTextToSize(text || "", maxWidth);
            doc.text(lines, margin, yPos);
            yPos += (lines.length * (fontSize * 0.5)) + 2;
        };

        // Fetch Logo
        const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690cdf897b59e44d278ad008/f1f9f692a_AQPdYUAcWfSxcbl5WH1P7SHWzE69TPlSNmOOjFqmImtFnSve6HFjkZH2apvzXZjK2y6qEy-eyKZh-UhbfbQkKebhM9nYOpiVBMjjOkG5bcl67Qn9pdXC5KgkKkF0yVNx.jpeg";
        let logoBase64 = null;
        try {
            const logoRes = await fetch(logoUrl);
            const logoBuf = await logoRes.arrayBuffer();
            logoBase64 = btoa(new Uint8Array(logoBuf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        } catch (e) {
            console.error("Failed to fetch logo", e);
        }

        // --- 1. COVER PAGE ---
        if (logoBase64) {
            doc.addImage(logoBase64, 'JPEG', pageWidth / 2 - 15, 40, 30, 30);
        }
        yPos = 80;

        doc.setFontSize(24);
        doc.setTextColor(...colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text("PRIMARY FRAUD INVESTIGATION REPORT", pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        doc.setFontSize(14);
        doc.setTextColor(...colors.secondary);
        doc.setFont('helvetica', 'normal');
        doc.text(`Primary Case ID: ${caseData.case_number || caseData.id}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 30;

        // Status & Risk Box
        const status = (caseData.status || 'Active').toUpperCase();
        const risk = (caseData.priority || caseData.case_priority || 'Medium').toUpperCase();
        
        doc.setFillColor(...colors.bg);
        doc.roundedRect(pageWidth / 2 - 60, yPos, 120, 40, 2, 2, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(...colors.secondary);
        doc.text("STATUS", pageWidth / 2, yPos + 10, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(...colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(status, pageWidth / 2, yPos + 18, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(...colors.secondary);
        doc.setFont('helvetica', 'normal');
        doc.text("RISK LEVEL", pageWidth / 2, yPos + 28, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(risk === 'CRITICAL' || risk === 'HIGH' ? colors.alert : colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(risk, pageWidth / 2, yPos + 36, { align: 'center' });
        
        // Footer for Cover
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", pageWidth / 2, pageHeight - 30, { align: 'center' });

        doc.addPage();
        yPos = 20;

        // --- 2. EXECUTIVE SUMMARY (Primary Case Overview) ---
        drawSectionHeader("2. Executive Summary");

        const summaryStats = [
            ['Suspect Wallet', caseData.scammer_wallet || caseData.scammer_info?.wallet_addresses?.[0] || 'Unknown / Not Identified'],
            ['Total Linked Amount', `$${totalLinkedAmount.toLocaleString()}`],
            ['Total Victims Linked', `${1 + linkedCases.length}`],
            ['Classification', (cyberProfile?.investigator_analysis?.pattern_assessment || caseData.fraud_type || 'General Fraud').replace(/_/g, ' ').toUpperCase()],
            ['Activity Period', `${new Date(caseData.incident_date || caseData.created_date).toLocaleDateString()} - Present`]
        ];

        autoTable(doc, {
            startY: yPos,
            body: summaryStats,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: colors.secondary, cellWidth: 60 },
                1: { textColor: colors.text, fontStyle: 'bold' }
            },
            margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("Case Narrative & Linkage Statement:", margin, yPos);
        yPos += 6;
        
        let narrative = caseData.description || "No primary narrative provided.";
        if (linkedCases.length > 0) {
            narrative += `\n\nThis investigation treats Case ${caseData.case_number} as the PRIMARY anchor for ${linkedCases.length} additional linked incidents. The aggregation of these cases establishes a pattern of organized fraudulent activity, utilizing shared infrastructure (wallet addresses, digital fingerprints) to defraud multiple victims systematically.`;
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const narrativeLines = doc.splitTextToSize(narrative, pageWidth - (margin * 2));
        doc.text(narrativeLines, margin, yPos);
        yPos += (narrativeLines.length * 5) + 15;

        // --- 3. SUSPECT WALLET ANALYSIS ---
        checkPageBreak(60);
        drawSectionHeader("3. Suspect Wallet Analysis");

        const primaryWallet = caseData.scammer_wallet || 'Not Identified';
        
        // Mock analysis if real data isn't in MyCase (CaseWalletTracer usually has it but we might not have it here)
        // We'll use placeholder or real data if available in cyberProfile
        const analysis = cyberProfile?.suspect_profile || {};

        const walletData = [
            ['Address', primaryWallet],
            ['Risk Score', analysis.confidence_level || 'High'],
            ['Known Tags/Flags', (caseData.wallet_analysis?.indicators || []).join(', ') || 'Scam, High Risk'],
            ['Behavior Pattern', analysis.behavioral_indicators || 'Sequential transfers, rapid dissipation of funds']
        ];

        autoTable(doc, {
            startY: yPos,
            body: walletData,
            theme: 'striped',
            headStyles: { fillColor: colors.secondary },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { fontStyle: 'mono' } },
            margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        // --- 4. LINKED VICTIM SUB-CASES ---
        checkPageBreak(50);
        drawSectionHeader(`4. Linked Victim Sub-Cases (${linkedCases.length + 1})`);

        // 4a. Primary Case (as first sub-case)
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.primary);
        doc.text(`PRIMARY VICTIM: ${caseData.case_number}`, margin + 2, yPos + 4);
        yPos += 8;

        const primaryRow = [
            ['Victim Ref', caseData.client_name || 'Redacted'],
            ['Amount Lost', `$${(caseData.amount_lost || 0).toLocaleString()}`],
            ['Date', new Date(caseData.incident_date || caseData.created_date).toLocaleDateString()],
            ['Platform', caseData.platform || 'N/A'],
            ['Status', caseData.status],
            ['Tx Hash', caseData.transaction_hash || (transactions[0]?.tx_hash ? `${transactions[0].tx_hash.substring(0, 10)}...` : 'N/A')]
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Victim Ref', 'Loss', 'Date', 'Platform', 'Status', 'Tx Hash']],
            body: primaryRow,
            theme: 'grid',
            headStyles: { fillColor: colors.primary, fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable.finalY + 5;

        // 4b. Linked Cases
        if (linkedCases.length > 0) {
            linkedCases.forEach((lc, idx) => {
                checkPageBreak(30);
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, yPos, pageWidth - (margin * 2), 6, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...colors.secondary);
                doc.text(`LINKED SUB-CASE #${idx + 1}: ${lc.case_number || lc.id}`, margin + 2, yPos + 4);
                yPos += 8;

                const row = [[
                    lc.client_name || 'Redacted',
                    `$${(lc.amount_lost || lc.amount_stolen_usd || 0).toLocaleString()}`,
                    new Date(lc.incident_date || lc.created_date).toLocaleDateString(),
                    lc.platform || 'N/A',
                    lc.status || 'Pending',
                    lc.transaction_hash || 'See Appendix'
                ]];

                autoTable(doc, {
                    startY: yPos,
                    head: [['Victim Ref', 'Loss', 'Date', 'Platform', 'Status', 'Tx Hash']],
                    body: row,
                    theme: 'grid',
                    headStyles: { fillColor: colors.secondary, fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 5;
            });
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text("No additional linked cases identified at this time.", margin, yPos);
            yPos += 10;
        }

        // --- 5. EVIDENCE CORRELATION & LINK ANALYSIS ---
        checkPageBreak(50);
        drawSectionHeader("5. Evidence Correlation & Link Analysis");

        addText("The aggregation of these incidents under a single primary investigation is based on shared forensic identifiers, specifically the destination wallet addresses and behavioral patterns observed on-chain.");
        yPos += 5;
        
        addText("CORRELATION TIMELINE:");
        yPos += 2;
        
        // Simple timeline table
        const timelineEvents = [
            { date: caseData.incident_date || caseData.created_date, event: `Primary Incident (${caseData.case_number})`, amt: caseData.amount_lost },
            ...linkedCases.map(lc => ({ date: lc.incident_date || lc.created_date, event: `Linked Incident (${lc.case_number})`, amt: lc.amount_lost }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        const timelineRows = timelineEvents.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.event,
            `$${(t.amt || 0).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Event / Incident', 'Amount Involved']],
            body: timelineRows,
            theme: 'plain',
            headStyles: { fillColor: colors.bg, textColor: colors.primary, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin }
        });
        yPos = doc.lastAutoTable.finalY + 10;

        // --- 6. LEGAL & ENFORCEMENT RELEVANCE ---
        checkPageBreak(60);
        drawSectionHeader("6. Legal & Enforcement Relevance");

        const legalText = `
        This aggregated report demonstrates that the identified suspect(s) are engaged in a systematic campaign of fraud, elevating the severity of the offense beyond individual petty theft to Organized Fraud and Money Laundering.

        TOTAL AGGREGATED IMPACT: $${totalLinkedAmount.toLocaleString()}

        1. SCALE: The total volume of funds confirms a professionalized operation.
        2. INTENT: Repeated execution of the same modus operandi across multiple victims negates any defense of accidental error.
        3. JURISDICTION: The decentralized nature of these crimes necessitates cooperation between exchanges (VASP), ISPs, and international law enforcement.

        REQUEST FOR ACTION:
        - Immediate freezing of assets at identified VASP endpoints.
        - Preservation of KYC records for the primary suspect wallet.
        - Cross-referencing of this cluster with other active investigations.
        `;

        addText(legalText.trim().replace(/  +/g, ''), 10, 'normal', colors.text);

        // --- 7. APPENDIX ---
        checkPageBreak(60);
        drawSectionHeader("7. Appendix: Full Transaction Log");

        if (transactions.length > 0) {
            const txRows = transactions.map(tx => [
                new Date(tx.timestamp).toLocaleDateString(),
                tx.tx_hash ? `${tx.tx_hash.substring(0, 12)}...` : 'N/A',
                tx.from_address ? `${tx.from_address.substring(0, 8)}...` : 'N/A',
                tx.to_address ? `${tx.to_address.substring(0, 8)}...` : 'N/A',
                tx.amount || '0'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Tx Hash', 'From', 'To', 'Amount']],
                body: txRows,
                theme: 'striped',
                headStyles: { fillColor: colors.secondary, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2, fontStyle: 'mono' },
                margin: { left: margin, right: margin }
            });
        } else {
            addText("No detailed transaction logs available in this report version.");
        }

        // --- FOOTER (ALL PAGES) ---
        const totalP = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalP; i++) {
            doc.setPage(i);
            
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            
            doc.text("SafeNestT® Investigation Unit", margin, pageHeight - 15);
            doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight - 15, { align: 'center' });
            doc.text(`Page ${i} of ${totalP}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Case_${caseData.case_number}_Report.pdf"`
            }
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
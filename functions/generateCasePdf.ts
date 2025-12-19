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
        
        // 3. Generate PDF
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

        // --- 1. HEADER SECTION ---
        if (logoBase64) {
            doc.addImage(logoBase64, 'JPEG', margin, 10, 15, 15);
        }

        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("SafeNestT®", margin + 20, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text("OFFICIAL INVESTIGATION REPORT", margin + 20, 25);
        
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", pageWidth - margin, 20, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`Date: ${new Date().toLocaleString()}`, pageWidth - margin, 26, { align: 'right' });
        doc.text(`Case ID: ${caseData.case_number || caseData.id}`, pageWidth - margin, 32, { align: 'right' });

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, 38, pageWidth - margin, 38);

        yPos = 50;

        // --- 2. CASE OVERVIEW ---
        if (activeSections.case_overview) {
            drawSectionHeader("2. Case Overview");
            
            const overviewData = [
                ['Case ID', caseData.case_number || caseData.id],
                ['Case Type', (caseData.issue_type || caseData.fraud_type || 'Unknown').replace(/_/g, ' ').toUpperCase()],
                ['Date Reported', new Date(caseData.created_date).toLocaleDateString()],
                ['Date of Incident', caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'N/A'],
                ['Current Status', (caseData.status || 'Pending').toUpperCase()],
                ['Priority Level', (caseData.priority || caseData.case_priority || 'Medium').toUpperCase()],
                ['Total Reported Loss', `$${(caseData.amount_lost || caseData.amount_stolen_usd || 0).toLocaleString()}`]
            ];

            autoTable(doc, {
                startY: yPos,
                body: overviewData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: colors.secondary, cellWidth: 50 },
                    1: { textColor: colors.text }
                },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // --- 3. VICTIM-SUBMITTED INFORMATION ---
        if (activeSections.victim_info) {
            drawSectionHeader("3. Victim-Submitted Information");

            const victimData = [
                ['Victim Name', caseData.client_name || caseData.victim_name || 'Redacted'],
                ['Contact Email', caseData.client_email || caseData.victim_email || 'Redacted'],
                ['Platform Used', caseData.platform || caseData.scam_source || 'N/A']
            ];

            autoTable(doc, {
                startY: yPos,
                body: victimData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: colors.secondary, cellWidth: 50 },
                    1: { textColor: colors.text }
                },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 5;

            // Description / Narrative
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.secondary);
            doc.text("Incident Description:", margin, yPos);
            yPos += 5;
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.text);
            const description = caseData.description || "No detailed narrative provided by the victim.";
            const descLines = doc.splitTextToSize(description, pageWidth - (margin * 2));
            doc.text(descLines, margin, yPos);
            yPos += (descLines.length * 5) + 10;
        }

        // --- 4. SUSPECT INFORMATION ---
        if (activeSections.suspect_info) {
            checkPageBreak(50);
            drawSectionHeader("4. Suspect Information");

            const suspectRows = [];
            
            // Scammer Wallet
            if (caseData.scammer_wallet) {
                suspectRows.push([
                    caseData.scammer_wallet,
                    caseData.blockchain || 'Unknown',
                    'Primary Suspect Address'
                ]);
            }
            
            // Monitored Wallets (if interpreted as suspects/hops)
            if (caseData.monitored_wallets && caseData.monitored_wallets.length > 0) {
                caseData.monitored_wallets.forEach(w => {
                    if (w !== caseData.scammer_wallet && w !== caseData.victim_wallet) {
                        suspectRows.push([
                            w,
                            caseData.blockchain || 'Unknown',
                            'Associated / Destination Address'
                        ]);
                    }
                });
            }

            if (suspectRows.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    head: [['Suspect Wallet Address', 'Network', 'Role in Flow']],
                    body: suspectRows,
                    theme: 'striped',
                    headStyles: { fillColor: colors.secondary, textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
                    columnStyles: { 0: { cellWidth: 90, fontStyle: 'mono' } }, // Monospace for addresses
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 5;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text("No specific suspect wallet addresses identified.", margin, yPos);
                yPos += 8;
            }

            // Mandatory Statement
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...colors.lightText);
            doc.text("Suspected involvement based on victim-submitted data and publicly verifiable blockchain transactions.", margin, yPos);
            yPos += 12;
        }

        // --- 5. TRANSACTION EVIDENCE ---
        if (activeSections.transaction_evidence) {
            checkPageBreak(50);
            drawSectionHeader("5. Transaction Evidence");

            if (transactions.length > 0) {
                const txRows = transactions.map(tx => [
                    tx.tx_hash ? `${tx.tx_hash.substring(0, 16)}...` : 'N/A',
                    new Date(tx.timestamp).toLocaleDateString() + ' ' + new Date(tx.timestamp).toLocaleTimeString(),
                    tx.from_address ? `${tx.from_address.substring(0, 10)}...` : 'N/A',
                    tx.to_address ? `${tx.to_address.substring(0, 10)}...` : 'N/A',
                    tx.asset || 'N/A',
                    tx.amount || '0',
                    tx.blockchain || caseData.blockchain || 'Unknown',
                    (tx.status || 'Confirmed').toUpperCase()
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Tx Hash', 'Date & Time', 'From', 'To', 'Token', 'Amt', 'Net', 'Status']],
                    body: txRows,
                    theme: 'striped',
                    headStyles: { fillColor: colors.primary, textColor: 255, fontSize: 8 },
                    styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
                    columnStyles: { 0: { fontStyle: 'mono' }, 2: { fontStyle: 'mono' }, 3: { fontStyle: 'mono' } },
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text("No transaction evidence currently linked to this case.", margin, yPos);
                yPos += 10;
            }
        }

        // --- 6. EVIDENCE SUMMARY ---
        if (activeSections.evidence_files) {
            checkPageBreak(40);
            drawSectionHeader("6. Evidence Summary");

            if (evidenceFiles.length > 0) {
                const fileRows = evidenceFiles.map(f => [
                    f.filename,
                    f.mime_type || 'Unknown',
                    f.description || f.summary?.analysis_text?.substring(0, 100) || "Supporting evidence uploaded to case."
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Filename', 'File Type', 'Supports / Description']],
                    body: fileRows,
                    theme: 'plain',
                    headStyles: { fillColor: colors.bg, textColor: colors.secondary, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3 },
                    columnStyles: { 2: { cellWidth: 90 } },
                    margin: { left: margin, right: margin }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text("No evidence files uploaded.", margin, yPos);
                yPos += 10;
            }
        }

        // --- 7. INVESTIGATOR & CORRELATION ANALYSIS (FROM CYBER PROFILE) ---
        if (cyberProfile && activeSections.observations) {
            checkPageBreak(40);
            drawSectionHeader("7. Investigator & Correlation Analysis");
            
            const ia = cyberProfile.investigator_analysis || {};
            const li = cyberProfile.linked_intelligence || {};
            
            // Investigator Analysis
            doc.setFont('helvetica', 'bold');
            doc.text("Pattern Assessment:", margin, yPos + 5);
            doc.setFont('helvetica', 'normal');
            const patternLines = doc.splitTextToSize(ia.pattern_assessment || "N/A", pageWidth - margin - 60);
            doc.text(patternLines, margin + 50, yPos + 5);
            yPos += (patternLines.length * 5) + 5;

            // Linked Cases
            if (li.summary) {
                checkPageBreak(30);
                doc.setFont('helvetica', 'bold');
                doc.text("Linked Intelligence:", margin, yPos + 5);
                doc.setFont('helvetica', 'normal');
                const linkText = `Total Linked Cases: ${li.summary.total_linked || 0} | Total Linked Loss: $${(li.summary.total_loss || 0).toLocaleString()} | Assessment: ${li.summary.campaign_assessment || 'N/A'}`;
                const linkLines = doc.splitTextToSize(linkText, pageWidth - margin - 50);
                doc.text(linkLines, margin + 50, yPos + 5);
                yPos += (linkLines.length * 5) + 5;
            }
        } else if (activeSections.observations) {
            checkPageBreak(40);
            drawSectionHeader("7. Observations");

            // Use AI analysis or default text
            const analysis = caseData.ai_analysis || caseData.pattern_analysis || "";
            const walletIndicators = caseData.wallet_analysis?.indicators?.join(", ") || "";
            
            let observationsText = "";
            if (analysis) observationsText += analysis + "\n\n";
            if (walletIndicators) observationsText += `Detected Patterns: ${walletIndicators}\n`;
            
            if (!observationsText) observationsText = "No specific patterns or automated observations recorded at this time.";

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...colors.text);
            
            const obsLines = doc.splitTextToSize(observationsText, pageWidth - (margin * 2));
            doc.text(obsLines, margin, yPos);
            yPos += (obsLines.length * 5) + 10;
        }

        // --- 8. DISCLAIMER & FOOTER ---
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            
            // Footer Separator
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            
            const discl1 = "This document is generated by SafeNestT® for intelligence and documentation purposes only.";
            const discl2 = "SafeNestT® is not a law enforcement agency and does not guarantee recovery.";
            const discl3 = "CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE.";
            
            const footerY = pageHeight - 25;
            
            doc.text(discl1, pageWidth / 2, footerY, { align: 'center' });
            doc.text(discl2, pageWidth / 2, footerY + 4, { align: 'center' });
            
            doc.setTextColor(200, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(discl3, pageWidth / 2, footerY + 8, { align: 'center' });
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text("SafeNestT®", margin, footerY + 8);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, footerY + 8, { align: 'right' });
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
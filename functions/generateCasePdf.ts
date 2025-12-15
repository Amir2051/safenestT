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

        const { caseId } = await req.json();

        if (!caseId) {
            return Response.json({ error: 'Case ID is required' }, { status: 400 });
        }

        // 1. Fetch Case Data
        const caseData = await base44.asServiceRole.entities.MyCase.get(caseId);
        
        if (!caseData) {
            return Response.json({ error: 'Case not found' }, { status: 404 });
        }

        // 2. Fetch Related Data
        const evidenceFiles = await base44.asServiceRole.entities.CaseEvidenceFile.filter({ case_id: caseId });
        const transactions = await base44.asServiceRole.entities.Transaction.filter({ case_id: caseId });
        
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

        // --- 1. COVER SECTION ---
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // SafeNestt Name & Logo (Text representation)
        doc.setTextColor(...colors.accent);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("SafeNestt", margin, 20);

        // Report Title
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("Case Investigation Report", pageWidth - margin, 20, { align: 'right' });
        
        // Meta Info
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 28, { align: 'right' });
        doc.text(`Case ID: ${caseData.case_number || caseData.id}`, pageWidth - margin, 34, { align: 'right' });

        yPos = 55;

        // --- 2. CASE OVERVIEW ---
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

        // --- 3. VICTIM-SUBMITTED INFORMATION ---
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

        // --- 4. SUSPECT INFORMATION ---
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

        // --- 5. TRANSACTION EVIDENCE ---
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

        // --- 6. EVIDENCE SUMMARY ---
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

        // --- 7. OBSERVATIONS ---
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

        // --- 8. DISCLAIMER ---
        // Footer section
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = pageHeight - 40; }
        else { yPos = Math.max(yPos + 10, pageHeight - 30); }

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        doc.setFontSize(8);
        doc.setTextColor(...colors.lightText);
        doc.setFont('helvetica', 'italic');
        
        const disclaimer = "DISCLAIMER: This report is based on victim-submitted data and publicly available blockchain information. SafeNestt does not guarantee the recovery of assets. This document is intended for documentation and escalation purposes only.";
        const discLines = doc.splitTextToSize(disclaimer, pageWidth - (margin * 2));
        doc.text(discLines, margin, yPos, { align: 'center' });

        // Page Numbering
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...colors.lightText);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
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
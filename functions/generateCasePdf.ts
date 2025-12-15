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

        // --- COVER SECTION ---
        // Header Background
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Logo / Brand
        doc.setTextColor(...colors.accent);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("SafeNestt", margin, 20);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("INTELLIGENCE UNIT", margin, 28);

        // Report Info
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("INVESTIGATIVE CASE REPORT", pageWidth - margin, 20, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin, 28, { align: 'right' });
        doc.text(`Case Ref: ${caseData.case_number || caseData.id}`, pageWidth - margin, 34, { align: 'right' });

        yPos = 55;

        // --- 1. CASE OVERVIEW ---
        drawSectionHeader("1. Case Overview");
        
        const overviewData = [
            ['Case ID', caseData.case_number || caseData.id],
            ['Status', (caseData.status || 'Pending').toUpperCase()],
            ['Date of Incident', caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'N/A'],
            ['Priority Level', (caseData.priority || caseData.case_priority || 'Medium').toUpperCase()],
            ['Total Reported Loss', `$${(caseData.amount_lost || caseData.amount_stolen_usd || 0).toLocaleString()}`],
            ['Type', (caseData.issue_type || caseData.fraud_type || 'Unknown').replace(/_/g, ' ').toUpperCase()]
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

        // --- 2. VICTIM INFORMATION ---
        drawSectionHeader("2. Victim Information");

        const victimData = [
            ['Name', caseData.client_name || caseData.victim_name || 'Redacted'],
            ['Contact Email', caseData.client_email || caseData.victim_email || 'Redacted'],
            ['Phone', caseData.phone_number || caseData.victim_phone || 'N/A'],
            ['Authorization', caseData.law_enforcement_authorization?.authorized ? 
                `Authorized by ${caseData.law_enforcement_authorization.full_name || 'Client'} on ${new Date(caseData.law_enforcement_authorization.authorized_date).toLocaleDateString()}` : 
                'Pending Authorization']
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
        yPos = doc.lastAutoTable.finalY + 10;

        // --- 3. INCIDENT SUMMARY ---
        drawSectionHeader("3. Incident Summary");
        
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        doc.setFont('helvetica', 'normal');
        
        const description = caseData.description || "No detailed narrative provided.";
        const descLines = doc.splitTextToSize(description, pageWidth - (margin * 2));
        doc.text(descLines, margin, yPos);
        yPos += (descLines.length * 5) + 10;

        if (caseData.issue_type || caseData.scam_type) {
            doc.setFont('helvetica', 'bold');
            doc.text("Method/Platform:", margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(`${(caseData.issue_type || 'Unknown').replace(/_/g, ' ')} / ${caseData.platform || 'N/A'}`, margin + 35, yPos);
            yPos += 10;
        }

        // --- 4. SUSPECT INFORMATION ---
        drawSectionHeader("4. Suspect Information");

        const suspectRows = [];
        
        // Scammer Wallet
        if (caseData.scammer_wallet) {
            suspectRows.push(['Primary Wallet', caseData.scammer_wallet, caseData.blockchain || 'Unknown']);
        }
        
        // Monitored Wallets
        if (caseData.monitored_wallets && caseData.monitored_wallets.length > 0) {
            caseData.monitored_wallets.forEach(w => {
                if (w !== caseData.scammer_wallet) {
                    suspectRows.push(['Associated Wallet', w, 'Linked via Analysis']);
                }
            });
        }

        // Scammer Contact Info
        if (caseData.scammer_info) {
            if (caseData.scammer_info.name) suspectRows.push(['Suspect Name', caseData.scammer_info.name, 'Reported']);
            if (caseData.scammer_info.email) suspectRows.push(['Suspect Email', caseData.scammer_info.email, 'Reported']);
            if (caseData.scammer_info.phone) suspectRows.push(['Suspect Phone', caseData.scammer_info.phone, 'Reported']);
            if (caseData.scammer_info.website) suspectRows.push(['Website/Domain', caseData.scammer_info.website, 'Phishing Source']);
        }

        if (suspectRows.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Type', 'Identifier', 'Notes']],
                body: suspectRows,
                theme: 'striped',
                headStyles: { fillColor: colors.secondary, textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No specific suspect identifiers recorded.", margin, yPos);
            yPos += 10;
        }

        // --- 5. TRANSACTION EVIDENCE ---
        drawSectionHeader("5. Transaction Evidence");

        if (transactions.length > 0) {
            const txRows = transactions.map(tx => [
                tx.tx_hash ? `${tx.tx_hash.substring(0, 16)}...` : 'N/A',
                new Date(tx.timestamp).toLocaleString(),
                tx.from_address === caseData.victim_wallet ? 'Victim' : 'External',
                tx.to_address === caseData.scammer_wallet ? 'Suspect' : 'External',
                `${tx.amount} ${tx.asset || ''}`,
                tx.status || 'Confirmed'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Tx Hash', 'Date/Time', 'From', 'To', 'Amount', 'Status']],
                body: txRows,
                theme: 'striped',
                headStyles: { fillColor: colors.secondary, textColor: 255 },
                styles: { fontSize: 8, cellPadding: 2 },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No blockchain transactions extracted.", margin, yPos);
            yPos += 10;
        }

        // --- 6. EVIDENCE SUMMARY ---
        drawSectionHeader("6. Evidence Files");

        if (evidenceFiles.length > 0) {
            const fileRows = evidenceFiles.map(f => [
                f.filename,
                new Date(f.uploaded_at).toLocaleDateString(),
                f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : 'N/A',
                f.summary?.analysis_text ? 'Analyzed' : 'Raw File'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Filename', 'Upload Date', 'Size', 'Status']],
                body: fileRows,
                theme: 'plain',
                headStyles: { fillColor: colors.bg, textColor: colors.secondary, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No evidence files uploaded.", margin, yPos);
            yPos += 10;
        }

        // --- 7. OBSERVATIONS & FINDINGS ---
        drawSectionHeader("7. Observations & Findings");

        const findings = caseData.ai_analysis || caseData.pattern_analysis || "Pending comprehensive analysis.";
        const findingsLines = doc.splitTextToSize(findings, pageWidth - (margin * 2));
        doc.setFont('helvetica', 'normal');
        doc.text(findingsLines, margin, yPos);
        yPos += (findingsLines.length * 5) + 10;

        if (caseData.wallet_analysis) {
            checkPageBreak(40);
            doc.setFont('helvetica', 'bold');
            doc.text("Automated Wallet Intelligence:", margin, yPos);
            yPos += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            
            const risk = caseData.wallet_analysis.risk_score ? `Risk Score: ${caseData.wallet_analysis.risk_score}/100` : '';
            const indicators = caseData.wallet_analysis.indicators ? `Indicators: ${caseData.wallet_analysis.indicators.join(', ')}` : '';
            
            doc.text(risk, margin, yPos);
            yPos += 5;
            if (indicators) {
                const indLines = doc.splitTextToSize(indicators, pageWidth - (margin * 2));
                doc.text(indLines, margin, yPos);
                yPos += (indLines.length * 5) + 5;
            }
        }

        // --- DISCLAIMER (Footer) ---
        // Push to bottom of page or next page if no space
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = pageHeight - 40; }
        else { yPos = Math.max(yPos + 10, pageHeight - 40); }

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        doc.setFontSize(7);
        doc.setTextColor(...colors.lightText);
        doc.setFont('helvetica', 'normal');
        
        const disclaimer = "DISCLAIMER: This report is generated by SafeNestt based on user-submitted data and publicly available blockchain information. It is intended for informational and investigative purposes only. SafeNestt does not guarantee the recovery of assets. This document may contain confidential information intended for law enforcement or authorized legal counsel.";
        const discLines = doc.splitTextToSize(disclaimer, pageWidth - (margin * 2));
        doc.text(discLines, margin, yPos, { align: 'justify' });

        // Page Numbering
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
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
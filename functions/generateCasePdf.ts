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

        // 2. Validate Mandatory Fields
        const missingFields = [];
        if (!caseData.client_name && !caseData.victim_name) missingFields.push('Victim Name');
        if (!caseData.victim_wallet && !caseData.scammer_wallet) missingFields.push('Wallet Address (Victim or Scammer)');
        if (!caseData.description) missingFields.push('Incident Description');
        // Date is often auto-filled but check incident date
        if (!caseData.incident_date && !caseData.incident_timestamp) missingFields.push('Incident Date');

        if (missingFields.length > 0) {
            return Response.json({ 
                error: `Cannot generate report. Missing mandatory fields: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        // 3. Fetch Related Data
        const evidenceFiles = await base44.asServiceRole.entities.CaseEvidenceFile.filter({ case_id: caseId });
        const evidenceItems = await base44.asServiceRole.entities.CaseEvidenceItem.filter({ case_id: caseId });
        const transactions = await base44.asServiceRole.entities.Transaction.filter({ case_id: caseId });
        
        // Fetch Linked Cases Summary
        let linkedCases = [];
        if (caseData.linked_case_ids && caseData.linked_case_ids.length > 0) {
            // Fetch individually or use a specialized fetch if available. 
            // For simplicity/performance in this function, we'll just show IDs or basic info if we can bulk fetch.
            // Loop is okay for small numbers.
            for (const id of caseData.linked_case_ids) {
                try {
                    const lc = await base44.asServiceRole.entities.MyCase.get(id);
                    linkedCases.push(lc);
                } catch(e) {}
            }
        }

        // 4. Generate PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Branding / Header
        doc.setFillColor(10, 10, 30); // Dark background
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(6, 182, 212); // Cyan
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("SafeNestt", 20, 20);
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("Confidential Case Investigation Report", 20, 30);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, 20, { align: 'right' });
        doc.text(`Case ID: ${caseData.case_number || caseData.id}`, pageWidth - 20, 30, { align: 'right' });

        let yPos = 50;

        // SECTION 1: Case Overview
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("1. Case Overview", 20, yPos);
        yPos += 10;

        autoTable(doc, {
            startY: yPos,
            head: [['Field', 'Details']],
            body: [
                ['Victim Name', caseData.client_name || caseData.victim_name || 'N/A'],
                ['Contact Email', caseData.client_email || caseData.victim_email || 'N/A'],
                ['Phone', caseData.phone_number || caseData.victim_phone || 'N/A'],
                ['Incident Type', (caseData.issue_type || caseData.fraud_type || 'Unknown').replace('_', ' ').toUpperCase()],
                ['Incident Date', new Date(caseData.incident_date || caseData.incident_timestamp || caseData.created_date).toLocaleDateString()],
                ['Amount Lost', `$${(caseData.amount_lost || caseData.amount_stolen_usd || 0).toLocaleString()}`],
                ['Status', caseData.status || 'Pending']
            ],
            theme: 'striped',
            headStyles: { fillColor: [26, 35, 50] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // SECTION 2: Incident Narrative
        doc.setFontSize(14);
        doc.text("2. Incident Narrative", 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(caseData.description || "No description provided.", pageWidth - 40);
        doc.text(descLines, 20, yPos);
        yPos += (descLines.length * 5) + 10;

        // Check page break
        if (yPos > 250) { doc.addPage(); yPos = 20; }

        // SECTION 3: Wallets & Technical Identifiers
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("3. Target Wallets & Identifiers", 20, yPos);
        yPos += 10;

        const walletData = [];
        if (caseData.victim_wallet) walletData.push(['Victim Wallet', caseData.victim_wallet, caseData.blockchain || 'Unknown']);
        if (caseData.scammer_wallet) walletData.push(['Scammer Wallet', caseData.scammer_wallet, caseData.blockchain || 'Unknown']);
        if (caseData.monitored_wallets && caseData.monitored_wallets.length > 0) {
            caseData.monitored_wallets.forEach(w => {
                if (w !== caseData.scammer_wallet && w !== caseData.victim_wallet) {
                    walletData.push(['Monitored / Associated', w, '']);
                }
            });
        }

        if (walletData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Role', 'Address', 'Network']],
                body: walletData,
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38] }, // Red for alerts
            });
            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No wallet addresses recorded.", 20, yPos);
            yPos += 10;
        }

        // SECTION 4: Transaction Evidence (Table)
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("4. Transaction Evidence", 20, yPos);
        yPos += 10;

        if (transactions.length > 0) {
            const txBody = transactions.map(tx => [
                new Date(tx.timestamp).toLocaleString(),
                tx.tx_hash ? `${tx.tx_hash.substring(0, 12)}...` : 'N/A',
                tx.direction?.toUpperCase(),
                `${tx.amount} ${tx.asset || ''}`,
                tx.to_address ? `${tx.to_address.substring(0, 10)}...` : 'N/A'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Date', 'Hash', 'Type', 'Amount', 'Counterparty']],
                body: txBody,
                theme: 'striped',
                headStyles: { fillColor: [26, 35, 50] }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No transaction data extracted yet.", 20, yPos);
            yPos += 10;
        }

        // SECTION 5: AI Intelligence & Linked Cases
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("5. Intelligence & Cross-Reference", 20, yPos);
        yPos += 10;

        // AI Findings
        if (evidenceItems.length > 0) {
            doc.setFontSize(11);
            doc.text("AI Extracted Findings:", 20, yPos);
            yPos += 6;
            evidenceItems.forEach(item => {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const confLabel = item.confidence ? `[${item.confidence.toUpperCase()}]` : '';
                const line = `• ${confLabel} ${item.category}: ${item.analyst_note || JSON.stringify(item.data)}`;
                const splitLine = doc.splitTextToSize(line, pageWidth - 40);
                doc.text(splitLine, 25, yPos);
                yPos += (splitLine.length * 5) + 2;
            });
            yPos += 5;
        }

        // Linked Cases
        if (linkedCases.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text("Linked Investigations:", 20, yPos);
            yPos += 6;
            
            const linkedBody = linkedCases.map(lc => [
                lc.case_number,
                lc.status,
                `$${(lc.amount_lost || 0).toLocaleString()}`,
                lc.scammer_wallet ? 'Wallet Match' : 'Pattern Match'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Case ID', 'Status', 'Loss', 'Link Reason']],
                body: linkedBody,
                theme: 'plain',
                headStyles: { fillColor: [100, 100, 100] }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.text("• No linked cases found at this time.", 25, yPos);
            yPos += 10;
        }

        // SECTION 6: Investigator Notes
        if (yPos > 230) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("6. Investigator Notes & Recommendations", 20, yPos);
        yPos += 10;

        const notes = caseData.case_notes || [];
        if (notes.length > 0) {
            notes.forEach(note => {
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(`${new Date(note.timestamp).toLocaleString()} - ${note.author}:`, 20, yPos);
                yPos += 5;
                doc.setTextColor(0);
                doc.setFontSize(10);
                const noteText = doc.splitTextToSize(note.note, pageWidth - 40);
                doc.text(noteText, 25, yPos);
                yPos += (noteText.length * 5) + 5;
                
                if (yPos > 270) { doc.addPage(); yPos = 20; }
            });
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text("No manual notes added.", 20, yPos);
        }

        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`SafeNestt Confidential - Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
        }

        const pdfOutput = doc.output('arraybuffer');

        return new Response(pdfOutput, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Case_${caseData.case_number}_Report.pdf"`
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
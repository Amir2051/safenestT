import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { profile, caseData } = await req.json();

        if (!profile || !caseData) {
             return Response.json({ error: 'Missing data' }, { status: 400 });
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // --- HEADER ---
        doc.setFillColor(10, 20, 40); // Dark Blue/Black
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("SafeNestT® INTELLIGENCE PROFILE", pageWidth / 2, 25, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", pageWidth / 2, 35, { align: 'center' });

        y = 50;
        doc.setTextColor(0, 0, 0);

        // Helper for sections
        const addSectionTitle = (title) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
            doc.text(title.toUpperCase(), margin + 2, y);
            y += 15;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
        };

        const addField = (label, value) => {
             if (y > 275) { doc.addPage(); y = 20; }
             doc.setFont(undefined, 'bold');
             doc.text(`${label}:`, margin, y);
             doc.setFont(undefined, 'normal');
             
             // Simple text wrap
             const textLines = doc.splitTextToSize(value || "N/A", pageWidth - margin - 60);
             doc.text(textLines, margin + 50, y);
             y += (textLines.length * 5) + 2;
        };

        const addTextBlock = (text) => {
             if (y > 275) { doc.addPage(); y = 20; }
             const textLines = doc.splitTextToSize(text || "N/A", pageWidth - (margin * 2));
             doc.text(textLines, margin, y);
             y += (textLines.length * 5) + 5;
        };

        // --- A. CASE IDENTIFICATION ---
        addSectionTitle("A. Case Identification");
        addField("Case ID", caseData.case_number);
        addField("Case Type", caseData.issue_type);
        addField("Date Opened", new Date(caseData.created_date).toLocaleDateString());
        addField("Status", caseData.status);
        addField("Investigation Unit", "SafeNestT Cyber Fraud Division");

        // --- B. VICTIM PROFILE ---
        y += 5;
        addSectionTitle("B. Victim Profile");
        const vp = profile.victim_profile || {};
        addField("Identifier", vp.identifier);
        addField("Contact Method", vp.contact_method);
        addField("Platforms", vp.platforms);
        addField("Reported Loss", `${(vp.loss_amount || 0).toLocaleString()} ${vp.currency || 'USD'}`);
        addField("Date Range", vp.date_range);
        
        if (y > 260) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text("Victim Statement:", margin, y);
        y += 6;
        doc.setFont(undefined, 'italic');
        addTextBlock(vp.statement || "No statement provided.");
        doc.setFont(undefined, 'normal');

        // --- C. SUSPECT PROFILE ---
        y += 5;
        addSectionTitle("C. Suspect Profile");
        const sp = profile.suspect_profile || {};
        addField("Alias(es)", sp.aliases);
        addField("Reported Location", sp.location);
        addField("Social Media", sp.social_media);
        addField("Comm. Methods", sp.communication_methods);
        addField("Behavioral Indicators", sp.behavioral_indicators);
        addField("Suspected Scam Type", sp.scam_type);
        addField("Confidence Level", sp.confidence_level);
        
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text("Associated Wallets / Identifiers:", margin, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.setFont("courier");
        addTextBlock(sp.wallets || "No wallets identified.");
        doc.setFont("helvetica");

        // --- D. MODUS OPERANDI ---
        y += 5;
        addSectionTitle("D. Modus Operandi");
        const mo = profile.modus_operandi || {};
        addField("Initial Contact", mo.initial_contact);
        addField("Escalation", mo.escalation);
        addField("Manipulation", mo.manipulation);
        addField("Financial Extraction", mo.financial_extraction);
        
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text("Timeline Summary:", margin, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        addTextBlock(mo.timeline_summary || "N/A");

        // --- LINKED INTELLIGENCE ---
        y += 5;
        addSectionTitle("Linked Intelligence & Campaign Correlation");
        
        const li = profile.linked_intelligence || {};
        const lis = li.summary || {};
        
        // Summary Box
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y, pageWidth - (margin * 2), 25, 'F');
        doc.setFont(undefined, 'bold');
        doc.text(`Total Linked Cases: ${lis.total_linked || 0}`, margin + 5, y + 8);
        doc.text(`Combined Reported Loss: $${(lis.total_loss || 0).toLocaleString()}`, margin + 5, y + 16);
        doc.text(`Campaign Assessment: ${lis.campaign_assessment || "N/A"}`, margin + 70, y + 8);
        doc.setFont(undefined, 'normal');
        y += 35;

        // Linked Cases Table Header
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text("CASE ID", margin, y);
        doc.text("LOSS", margin + 40, y);
        doc.text("SHARED INDICATOR", margin + 70, y);
        doc.text("CONFIDENCE", margin + 140, y);
        y += 4;
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
        
        // Rows
        const linked = li.linked_cases || [];
        if (linked.length > 0) {
            linked.slice(0, 10).forEach(c => { // Limit to 10 for PDF brevity
                if (y > 275) { doc.addPage(); y = 20; }
                doc.text(c.case_number || "N/A", margin, y);
                doc.text(`$${(c.loss_amount || 0).toLocaleString()}`, margin + 40, y);
                
                // Truncate indicator
                const indicator = `${c.match_type}: ${c.match_value}`.substring(0, 35) + "...";
                doc.text(indicator, margin + 70, y);
                
                doc.text(c.confidence || "Low", margin + 140, y);
                y += 8;
            });
            if (linked.length > 10) {
                doc.setFont(undefined, 'italic');
                doc.text(`...and ${linked.length - 10} more cases.`, margin, y);
                doc.setFont(undefined, 'normal');
                y += 8;
            }
        } else {
            doc.text("No linked cases identified at this time.", margin, y);
            y += 10;
        }

        // --- E. EVIDENCE SUMMARY ---
        y += 5;
        addSectionTitle("E. Evidence Summary");
        addTextBlock(profile.evidence_summary || "No summary provided.");

        // --- F. INVESTIGATOR ANALYSIS ---
        y += 5;
        addSectionTitle("F. Investigator Analysis");
        const ia = profile.investigator_analysis || {};
        addField("Pattern Assessment", ia.pattern_assessment);
        addField("Organized Fraud Ind.", ia.organized_fraud_indicators);
        addField("Cross-Case Links", ia.similarities);
        addField("Repeat Risk", ia.repeat_risk);
        
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text("Attribution Notes:", margin, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        addTextBlock(ia.attribution_notes || "N/A");

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            
            const disclaimerLines = [
                "This report is generated by SafeNestT® for intelligence and documentation purposes only.",
                "SafeNestT® is not a law enforcement agency and does not guarantee recovery.",
                "CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE."
            ];
            
            let footerY = 280;
            disclaimerLines.forEach((line, idx) => {
                const textWidth = doc.getStringUnitWidth(line) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const x = (pageWidth - textWidth) / 2;
                if (idx === 2) doc.setFont(undefined, 'bold');
                doc.text(line, x, footerY + (idx * 4));
                if (idx === 2) doc.setFont(undefined, 'normal');
            });

            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 15, 290);
        }

        const pdfBytes = doc.output('arraybuffer');
        const pdfBase64 = btoa(
            new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        return Response.json({ success: true, pdfBase64 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
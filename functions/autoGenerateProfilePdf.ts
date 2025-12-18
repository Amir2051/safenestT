import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { masterCaseId, profileData, caseData } = await req.json();

        if (!masterCaseId || !profileData) {
            return Response.json({ error: 'Missing required data' }, { status: 400 });
        }

        // 1. GENERATE PDF using pdf-lib (More robust for backend)
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        let y = height - 50;
        const margin = 50;

        const drawText = (text, options = {}) => {
            const size = options.size || 10;
            const currentFont = options.font || font;
            
            // Simple line wrapping
            const maxWidth = width - (margin * 2);
            const words = text.split(' ');
            let line = '';
            
            for (const word of words) {
                const testLine = line + word + ' ';
                const textWidth = currentFont.widthOfTextAtSize(testLine, size);
                if (textWidth > maxWidth) {
                    page.drawText(line, { x: margin, y, size, font: currentFont, color: options.color || rgb(0, 0, 0) });
                    y -= (size + 5);
                    line = word + ' ';
                } else {
                    line = testLine;
                }
            }
            page.drawText(line, { x: margin, y, size, font: currentFont, color: options.color || rgb(0, 0, 0) });
            y -= (size + 10);

            if (y < 50) {
                page = pdfDoc.addPage();
                y = height - 50;
            }
        };

        // Header
        page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.05, 0.1, 0.2) });
        page.drawText("CYBER FRAUD INTELLIGENCE PROFILE", { x: margin, y: height - 50, size: 18, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText("CONFIDENTIAL - MASTER PROFILE", { x: margin, y: height - 70, size: 10, font: font, color: rgb(0.8, 0.8, 0.8) });
        
        y = height - 100;

        const addSection = (title, content) => {
            if (y < 100) { page = pdfDoc.addPage(); y = height - 50; }
            
            // Section Header
            page.drawRectangle({ x: margin, y: y - 5, width: width - (margin * 2), height: 20, color: rgb(0.95, 0.95, 0.95) });
            page.drawText(title.toUpperCase(), { x: margin + 10, y: y + 2, size: 12, font: boldFont, color: rgb(0, 0, 0) });
            y -= 30;

            if (content) {
                drawText(content, { size: 10, font: font });
            }
            y -= 10;
        };

        addSection("Case Information", `Case Number: ${caseData.case_number}\nDate: ${new Date(caseData.created_date).toLocaleDateString()}\nType: ${caseData.issue_type}\nStatus: ${caseData.status}`);
        
        const vp = profileData.victim_profile || {};
        addSection("Victim Profile", `ID: ${vp.identifier}\nContact: ${vp.contact_method}\nLoss: $${(vp.loss_amount || 0).toLocaleString()}\nPlatforms: ${vp.platforms}\nStatement: ${vp.statement}`);

        const sp = profileData.suspect_profile || {};
        addSection("Suspect Intelligence", `Scam Type: ${sp.scam_type}\nIdentified Wallets: ${sp.wallets}`);

        const li = profileData.linked_intelligence || {};
        addSection("Linked Cases Analysis", `Total Linked Cases: ${li.summary?.total_linked}\nTotal Aggregated Loss: $${(li.summary?.total_loss || 0).toLocaleString()}\nAssessment: ${li.summary?.campaign_assessment}`);

        // Save
        const pdfBytes = await pdfDoc.save();
        
        // 2. UPLOAD FILE
        // Create a File object
        const file = new File([pdfBytes], `MasterProfile_${caseData.case_number}.pdf`, { type: 'application/pdf' });
        
        // Use service role for upload
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        if (!uploadRes || !uploadRes.file_url) {
            throw new Error("Upload returned no URL");
        }

        // 3. UPDATE MASTER CASE
        await base44.asServiceRole.entities.MasterCase.update(masterCaseId, {
            pdf_url: uploadRes.file_url,
            status: 'finalized',
            updated_date: new Date().toISOString()
        });

        return Response.json({ success: true, url: uploadRes.file_url });

    } catch (error) {
        console.error("AutoPDF Error:", error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});
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

        // Fetch Logo
        const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690cdf897b59e44d278ad008/f1f9f692a_AQPdYUAcWfSxcbl5WH1P7SHWzE69TPlSNmOOjFqmImtFnSve6HFjkZH2apvzXZjK2y6qEy-eyKZh-UhbfbQkKebhM9nYOpiVBMjjOkG5bcl67Qn9pdXC5KgkKkF0yVNx.jpeg";
        let logoImage = null;
        try {
            const logoRes = await fetch(logoUrl);
            const logoBuf = await logoRes.arrayBuffer();
            logoImage = await pdfDoc.embedJpg(logoBuf);
        } catch (e) {
            console.error("Failed to fetch logo", e);
        }

        // Header
        if (logoImage) {
            page.drawImage(logoImage, { x: margin, y: height - 60, width: 30, height: 30 });
        }
        
        page.drawText("SafeNestT®", { x: margin + 40, y: height - 40, size: 18, font: boldFont, color: rgb(0, 0, 0) });
        page.drawText("CYBER INTELLIGENCE PROFILE", { x: margin + 40, y: height - 55, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", { x: width - margin - 220, y: height - 40, size: 9, font: boldFont, color: rgb(0.8, 0, 0) });
        
        // Separator
        page.drawLine({
            start: { x: margin, y: height - 70 },
            end: { x: width - margin, y: height - 70 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        y = height - 90;

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

        // Add Footer to all pages
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const { width } = p.getSize();
            
            // Separator
            p.drawLine({
                start: { x: margin, y: 40 },
                end: { x: width - margin, y: 40 },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8),
            });

            p.drawText("SafeNestT®", { x: margin, y: 30, size: 9, font: boldFont, color: rgb(0, 0, 0) });
            p.drawText(`Page ${i + 1} of ${pages.length}`, { x: width - margin - 50, y: 30, size: 9, font });
            p.drawText(`Generated: ${new Date().toLocaleString()}`, { x: width - margin - 150, y: 30, size: 9, font });
            
            // Disclaimer
            const discl1 = "This document is generated by SafeNestT® for intelligence and documentation purposes only.";
            const discl2 = "SafeNestT® is not a law enforcement agency and does not guarantee recovery.";
            const discl3 = "CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE.";
            
            p.drawText(discl1, { x: margin, y: 20, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
            p.drawText(discl2, { x: margin, y: 12, size: 7, font, color: rgb(0.4, 0.4, 0.4) });
            p.drawText(discl3, { x: width - margin - 180, y: 15, size: 8, font: boldFont, color: rgb(0.8, 0, 0) });
        }

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
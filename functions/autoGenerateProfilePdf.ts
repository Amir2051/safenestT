import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Service role context usually, or validate user
        // We accept calls from other functions (service role) or admin users
        
        const { masterCaseId, profileData, caseData } = await req.json();

        if (!masterCaseId || !profileData) {
            return Response.json({ error: 'Missing required data' }, { status: 400 });
        }

        // 1. GENERATE PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 20;

        // Header
        doc.setFillColor(10, 20, 40);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("CYBER FRAUD INTELLIGENCE PROFILE", pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text("CONFIDENTIAL - MASTER PROFILE", pageWidth / 2, 35, { align: 'center' });

        y = 50;
        doc.setTextColor(0, 0, 0);

        const addSection = (title, content) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
            doc.text(title.toUpperCase(), margin + 2, y);
            y += 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            
            if (content) {
                const lines = doc.splitTextToSize(content, pageWidth - (margin * 2));
                doc.text(lines, margin, y);
                y += (lines.length * 5) + 10;
            }
        };

        addSection("Case Information", `Case Number: ${caseData.case_number}\nDate: ${new Date(caseData.created_date).toLocaleDateString()}\nType: ${caseData.issue_type}\nStatus: ${caseData.status}`);
        
        const vp = profileData.victim_profile || {};
        addSection("Victim Profile", `ID: ${vp.identifier}\nContact: ${vp.contact_method}\nLoss: $${(vp.loss_amount || 0).toLocaleString()}\nPlatforms: ${vp.platforms}\nStatement: ${vp.statement}`);

        const sp = profileData.suspect_profile || {};
        addSection("Suspect Intelligence", `Scam Type: ${sp.scam_type}\nIdentified Wallets:\n${sp.wallets}`);

        const li = profileData.linked_intelligence || {};
        addSection("Linked Cases Analysis", `Total Linked Cases: ${li.summary?.total_linked}\nTotal Aggregated Loss: $${(li.summary?.total_loss || 0).toLocaleString()}\nAssessment: ${li.summary?.campaign_assessment}`);

        // Output as Blob/File
        const pdfBytes = doc.output('arraybuffer');
        
        // 2. UPLOAD FILE
        // Create a File object from the buffer
        // Note: Deno's File implementation might differ slightly but standard File(bits, name, options) is supported
        const file = new File([new Uint8Array(pdfBytes)], `MasterProfile_${caseData.case_number}.pdf`, { type: 'application/pdf' });
        
        // Use service role for upload to ensure permissions
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        if (!uploadRes || !uploadRes.file_url) {
            throw new Error("Upload failed");
        }

        // 3. UPDATE MASTER CASE
        await base44.asServiceRole.entities.MasterCase.update(masterCaseId, {
            pdf_url: uploadRes.file_url,
            status: 'finalized', // Mark as ready
            updated_date: new Date().toISOString()
        });

        return Response.json({ success: true, url: uploadRes.file_url });

    } catch (error) {
        console.error("AutoPDF Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
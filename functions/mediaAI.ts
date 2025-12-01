import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, ...params } = await req.json();
        const apiKey = Deno.env.get("OPENAI_API_KEY");

        if (!apiKey) {
             return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        if (endpoint === 'chat') {
            const { message, history = [] } = params;
            
            const systemPrompt = `You are an expert Media Director AI Assistant for SafeNestt. 
            Your role is to assist Souleymane (Media Director) with:
            1. Analyzing meetings and extracting action items.
            2. Drafting press releases, scripts, and social media content.
            3. Suggesting media partnerships and strategies.
            4. Managing crisis communications.
            
            Be professional, strategic, and concise.`;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ];

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
            });

            return Response.json({ 
                reply: completion.choices[0].message.content 
            });
        }

        if (endpoint === 'analyze_meeting') {
            const { meeting_id, notes, title } = params;
            
            const prompt = `Analyze the following meeting notes for "${title}":
            
            ${notes}
            
            Please provide:
            1. A brief executive summary.
            2. A list of key action items (bullet points).
            3. Sentiment analysis (Positive/Neutral/Negative).`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
            });

            const analysis = completion.choices[0].message.content;

            // Update the meeting log with the analysis
            if (meeting_id) {
                await base44.entities.MeetingLog.update(meeting_id, {
                    ai_summary: analysis
                });
            }

            return Response.json({ analysis });
        }

        if (endpoint === 'generate_script') {
            const { title, type, topic, tone } = params;
            
            const prompt = `Write a ${type} script for SafeNestt.
            Title: ${title}
            Topic: ${topic}
            Tone: ${tone || 'Professional'}
            
            Format it clearly for reading/speaking.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
            });

            const content = completion.choices[0].message.content;

            // Save to Scripts entity
            const script = await base44.entities.Script.create({
                title,
                content,
                type: type || 'press_release',
                status: 'draft',
                generated_by: user.email
            });

            return Response.json({ script });
        }

        if (endpoint === 'media_suggestions') {
            const { project_name, description } = params;
            
            const prompt = `Based on the project "${project_name}": ${description}
            
            Suggest 5 potential media partnerships or outreach channels that would be effective.
            For each, provide a brief reason why.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: prompt }],
            });

            return Response.json({ suggestions: completion.choices[0].message.content });
        }

        if (endpoint === 'generate_employee_ids') {
             if (user.role !== 'admin' && !user.is_admin) {
                 return Response.json({ error: 'Admin required' }, { status: 403 });
             }

             const users = await base44.asServiceRole.entities.User.list({ limit: 1000 });
             let updatedCount = 0;

             for (const u of users) {
                 if (!u.employee_id) {
                     // Generate simple ID: SN-{YEAR}-{RANDOM}
                     const id = `SN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                     await base44.asServiceRole.entities.User.update(u.id, {
                         employee_id: id
                     });
                     updatedCount++;
                 }
             }
             
             return Response.json({ message: `Generated IDs for ${updatedCount} users` });
        }

        return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
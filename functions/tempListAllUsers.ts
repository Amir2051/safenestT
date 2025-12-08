import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Directly list users using service role, bypassing auth check for this temp function
    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    
    // Extract just emails for the response to avoid truncation
    const emails = users.map(u => u.email);

    return Response.json({ 
      success: true, 
      count: users.length,
      emails: emails
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
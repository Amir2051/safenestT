import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Directly list users using service role, bypassing auth check for this temp function
    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    
    // Extract just emails and names for the response
    const userDetails = users.map(u => ({
        email: u.email,
        name: u.full_name || u.first_name + ' ' + u.last_name,
        id: u.id,
        role: u.role
    }));

    return Response.json({ 
      success: true, 
      count: users.length,
      users: userDetails
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
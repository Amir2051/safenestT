import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization is determined solely by the platform role field.
    // user.is_admin and user.job_title are NOT real fields on the User entity
    // (verified via auth.me() keys), so they must never grant elevated access.
    const isAdmin = user.role === 'admin';

    let cases;
    if (isAdmin) {
      // Admins see all cases (RLS allows role:admin globally).
      cases = await base44.entities.MyCase.list('-created_date', 50000);
    } else {
      // Non-admins: ONLY their own cases, scoped to immutable ownership keys.
      // RLS is authoritative; the filter is defense-in-depth and never relies on
      // mutable client-set email fields (client_email/created_by_email/assigned_to).
      cases = await base44.entities.MyCase.filter(
        { $or: [{ user_id: user.id }, { created_by_id: user.id }] },
        '-created_date',
        50000
      );
    }

    return Response.json({
      success: true,
      cases: cases,
      count: cases.length,
      user_role: isAdmin ? 'admin' : 'user'
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
        // Allow service role usage if needed, but usually stats are for dashboard
        // return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Fetch all cases (InvestigationCase + MyCase)
    // Optimization: Filter by closed/resolved for resolution time, and all for success rate
    
    // We'll fetch from InvestigationCase as primary source for "Investigative" KPIs
    const cases = await base44.entities.InvestigationCase.list(null, 1000);
    
    // Metrics
    let totalResolved = 0;
    let totalRecoveredCount = 0;
    let totalResolutionTimeMs = 0;
    let recoveredAmount = 0;
    
    const resolutionTimes = []; // For chart?
    const outcomeCounts = {
        resolved: 0,
        recovered: 0,
        closed_unresolved: 0,
        active: 0
    };

    cases.forEach(c => {
        const status = (c.status || '').toLowerCase();
        
        // Active vs Closed
        if (['new', 'investigating', 'pending', 'in progress'].includes(status)) {
            outcomeCounts.active++;
        } else {
            // Closed/Resolved
            if (status === 'resolved' || status === 'recovered') {
                totalResolved++;
                outcomeCounts.resolved++;
                
                if (status === 'recovered') {
                    totalRecoveredCount++;
                    outcomeCounts.recovered++;
                }

                // Resolution Time
                const created = new Date(c.created_date);
                // We don't have a 'resolved_date' field standard, use updated_date as proxy if status is resolved
                // Or check last_activity. 
                const resolvedDate = new Date(c.updated_date || c.last_activity || Date.now());
                const diff = resolvedDate - created;
                if (diff > 0) {
                    totalResolutionTimeMs += diff;
                    resolutionTimes.push({ date: resolvedDate.toISOString().split('T')[0], durationDays: Math.round(diff / (1000 * 60 * 60 * 24)) });
                }
            } else if (status === 'closed') {
                outcomeCounts.closed_unresolved++;
            }
        }

        if (c.recovery_amount) {
            recoveredAmount += c.recovery_amount;
        }
    });

    const avgResolutionTimeDays = totalResolved > 0 
        ? Math.round((totalResolutionTimeMs / totalResolved) / (1000 * 60 * 60 * 24)) 
        : 0;

    const successRate = (totalResolved + outcomeCounts.closed_unresolved) > 0
        ? Math.round(((totalResolved) / (totalResolved + outcomeCounts.closed_unresolved)) * 100)
        : 0;

    return new Response(JSON.stringify({
        success: true,
        kpis: {
            avgResolutionDays: avgResolutionTimeDays,
            successRate: successRate,
            totalRecoveredAmount: recoveredAmount,
            totalCases: cases.length,
            breakdown: outcomeCounts
        },
        resolutionTrend: resolutionTimes.slice(-30) // Last 30 resolved cases
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
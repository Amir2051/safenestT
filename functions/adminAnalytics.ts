import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch all necessary data (limit to reasonably recent for performance if needed, but strict requirements imply full stats)
        // For extensive data, we might need to paginate, but for now we fetch a large batch.
        const cases = await base44.asServiceRole.entities.MyCase.list('-created_date', 2000);
        const automations = await base44.asServiceRole.entities.WorkflowAutomation.list('-executed_at', 1000);

        // --- 1. Case Resolution Times ---
        let totalResolutionTimeMs = 0;
        let resolvedCount = 0;
        const closedStatuses = ['Resolved', 'Closed', 'recovered'];

        cases.forEach(c => {
            if (closedStatuses.includes(c.status) && c.updated_date && c.created_date) {
                const start = new Date(c.created_date);
                const end = new Date(c.updated_date); // Approximate resolution time using last update
                const diff = end - start;
                if (diff > 0) {
                    totalResolutionTimeMs += diff;
                    resolvedCount++;
                }
            }
        });
        const avgResolutionHours = resolvedCount > 0 ? (totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60)).toFixed(1) : 0;


        // --- 2. Recovery Rates ---
        let totalLost = 0;
        let totalRecovered = 0;
        
        cases.forEach(c => {
            totalLost += (c.amount_lost || c.amount_stolen_usd || 0);
            totalRecovered += (c.recovery_amount || 0);
        });
        const recoveryRate = totalLost > 0 ? ((totalRecovered / totalLost) * 100).toFixed(1) : 0;


        // --- 3. Fraud Trends (Type & Region/Month) ---
        const fraudByType = {};
        const fraudByMonth = {};
        
        cases.forEach(c => {
            // Type
            const type = c.issue_type || 'Unknown';
            fraudByType[type] = (fraudByType[type] || 0) + 1;

            // Month Trend
            const month = new Date(c.created_date).toLocaleString('default', { month: 'short', year: '2-digit' });
            fraudByMonth[month] = (fraudByMonth[month] || 0) + 1;
        });

        // --- 4. Specialist Workload & Performance ---
        const specialistLoad = {};
        cases.forEach(c => {
            if (c.assigned_to) {
                const agent = c.assigned_to;
                if (!specialistLoad[agent]) {
                    specialistLoad[agent] = { total: 0, active: 0, resolved: 0, totalResolutionTimeMs: 0, resolvedCountForTime: 0 };
                }
                specialistLoad[agent].total++;
                
                if (closedStatuses.includes(c.status)) {
                    specialistLoad[agent].resolved++;
                    
                    // Calculate individual resolution time
                    if (c.updated_date && c.created_date) {
                        const start = new Date(c.created_date);
                        const end = new Date(c.updated_date);
                        const diff = end - start;
                        if (diff > 0) {
                            specialistLoad[agent].totalResolutionTimeMs += diff;
                            specialistLoad[agent].resolvedCountForTime++;
                        }
                    }
                } else {
                    specialistLoad[agent].active++;
                }
            }
        });

        // Calculate averages
        Object.keys(specialistLoad).forEach(agent => {
            const data = specialistLoad[agent];
            data.avgResolutionHours = data.resolvedCountForTime > 0 
                ? (data.totalResolutionTimeMs / data.resolvedCountForTime / (1000 * 60 * 60)).toFixed(1) 
                : 0;
            delete data.totalResolutionTimeMs; // Clean up intermediate data
            delete data.resolvedCountForTime;
        });

        // --- 5. Automation Success Rates ---
        let automationTotal = 0;
        let automationSuccess = 0;
        const automationByType = {};

        automations.forEach(a => {
            automationTotal++;
            if (a.status === 'success') automationSuccess++;
            
            const type = a.trigger_type || 'unknown';
            if (!automationByType[type]) automationByType[type] = { total: 0, success: 0 };
            automationByType[type].total++;
            if (a.status === 'success') automationByType[type].success++;
        });
        
        const automationSuccessRate = automationTotal > 0 ? ((automationSuccess / automationTotal) * 100).toFixed(1) : 0;

        return Response.json({
            kpis: {
                avgResolutionHours,
                totalRecovered,
                totalLost,
                recoveryRate,
                activeCases: cases.length - resolvedCount,
                totalCases: cases.length
            },
            trends: {
                byType: Object.entries(fraudByType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
                byMonth: Object.entries(fraudByMonth).map(([name, value]) => ({ name, value })), // Ideally sort chronologically
            },
            specialists: Object.entries(specialistLoad).map(([email, stats]) => ({
                email,
                ...stats
            })).sort((a, b) => b.active - a.active),
            automation: {
                successRate: automationSuccessRate,
                totalEvents: automationTotal,
                breakdown: Object.entries(automationByType).map(([type, stats]) => ({
                    type,
                    rate: ((stats.success / stats.total) * 100).toFixed(1),
                    count: stats.total
                }))
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
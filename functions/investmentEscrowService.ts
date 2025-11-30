import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, data } = body;
    // Actions: invest, release, refund, flag_company

    if (action === 'invest') {
      // User initiating investment
      const { company_id, amount, payment_method } = data;
      
      // 1. Verify Company exists and is Active
      const company = await base44.entities.VerifiedCompany.get(company_id);
      if (!company || company.verification_status !== 'active') {
         return Response.json({ error: 'Company is not verified for investment.' }, { status: 400 });
      }

      // 2. Create Investment Record (Pending Escrow)
      const investment = await base44.entities.Investment.create({
        user_id: user.id,
        user_email: user.email,
        company_id: company.id,
        company_name: company.company_name,
        amount: Number(amount),
        status: 'pending_escrow',
        payment_method: payment_method || 'wallet',
        notes: 'Funds held in SafeNestt Escrow'
      });

      // 3. Log
      await base44.entities.InvestmentLog.create({
        action: 'new_investment',
        details: `User ${user.email} invested $${amount} in ${company.company_name}`,
        actor_email: user.email,
        target_id: investment.id,
        target_type: 'investment',
        timestamp: new Date().toISOString()
      });

      // In a real app, we would trigger Stripe or Crypto transfer here. 
      // For now, we assume payment is simulated/successful.
      
      return Response.json({ success: true, investment });
    }

    // Admin Only Actions
    if (['release', 'refund', 'flag_company'].includes(action)) {
      if (user.role !== 'admin' && !user.is_admin) {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      if (action === 'release') {
        const { investment_id } = data;
        const investment = await base44.entities.Investment.get(investment_id);
        
        if (investment.status !== 'pending_escrow') {
           return Response.json({ error: 'Investment not in escrow' }, { status: 400 });
        }

        // Update Status
        await base44.entities.Investment.update(investment_id, {
          status: 'paid_to_company',
          escrow_release_date: new Date().toISOString()
        });

        // Log Escrow Transaction
        await base44.entities.EscrowTransaction.create({
          investment_id: investment_id,
          type: 'release',
          amount: investment.amount,
          reason: 'Conditions met, admin approved',
          processed_by: user.email,
          transaction_date: new Date().toISOString()
        });

        // Log
        await base44.entities.InvestmentLog.create({
          action: 'funds_released',
          details: `Released $${investment.amount} to company for Inv #${investment.id}`,
          actor_email: user.email,
          target_id: investment_id,
          target_type: 'investment',
          timestamp: new Date().toISOString()
        });

        return Response.json({ success: true, status: 'released' });
      }

      if (action === 'refund') {
        const { investment_id, reason } = data;
        const investment = await base44.entities.Investment.get(investment_id);

        await base44.entities.Investment.update(investment_id, {
          status: 'refunded',
          notes: `Refunded: ${reason}`
        });

        await base44.entities.EscrowTransaction.create({
          investment_id: investment_id,
          type: 'refund',
          amount: investment.amount,
          reason: reason || 'Admin initiated refund',
          processed_by: user.email,
          transaction_date: new Date().toISOString()
        });

         await base44.entities.InvestmentLog.create({
          action: 'funds_refunded',
          details: `Refunded $${investment.amount} to user. Reason: ${reason}`,
          actor_email: user.email,
          target_id: investment_id,
          target_type: 'investment',
          timestamp: new Date().toISOString()
        });

        return Response.json({ success: true, status: 'refunded' });
      }
      
      if (action === 'flag_company') {
        const { company_id, reason } = data;
        
        // Update company status
        await base44.entities.VerifiedCompany.update(company_id, {
           verification_status: 'suspended',
           risk_notes: `FLAGGED: ${reason}`
        });

        // Auto-refund pending investments logic could go here
        // For now just log
        await base44.entities.InvestmentLog.create({
          action: 'company_flagged',
          details: `Company suspended. Reason: ${reason}`,
          actor_email: user.email,
          target_id: company_id,
          target_type: 'company',
          severity: 'alert',
          timestamp: new Date().toISOString()
        });

        return Response.json({ success: true, status: 'suspended' });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
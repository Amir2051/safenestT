import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // Log incoming webhook request
        console.log('🔔 ALCHEMY WEBHOOK RECEIVED:', new Date().toISOString());
        
        // Parse the incoming payload from Alchemy
        const payload = await req.json();
        
        // Log the full payload for debugging
        console.log('📦 ALCHEMY PAYLOAD:', JSON.stringify(payload, null, 2));
        
        // Extract wallet activity data
        const { event } = payload;
        
        if (event) {
            console.log('📊 WALLET ACTIVITY:', {
                type: event.activity?.type || 'unknown',
                network: event.network || 'unknown',
                fromAddress: event.activity?.fromAddress || 'N/A',
                toAddress: event.activity?.toAddress || 'N/A',
                hash: event.activity?.hash || 'N/A',
                value: event.activity?.value || 0,
                asset: event.activity?.asset || 'N/A',
                category: event.activity?.category || 'N/A',
                timestamp: event.activity?.timestamp || new Date().toISOString()
            });
        }
        
        // Initialize Base44 client for potential database operations
        const base44 = createClientFromRequest(req);
        
        // TODO: Store wallet activity in database if needed
        // Example: await base44.asServiceRole.entities.WalletActivity.create({...})
        
        // Immediately return 200 OK to Alchemy
        return Response.json({ 
            success: true, 
            received: true,
            timestamp: new Date().toISOString(),
            message: 'Webhook received and processed'
        }, { status: 200 });
        
    } catch (error) {
        console.error('❌ ALCHEMY WEBHOOK ERROR:', error);
        
        // Still return 200 to prevent Alchemy from retrying
        return Response.json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 200 });
    }
});
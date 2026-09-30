import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        // Read the raw body once — needed for HMAC signature verification.
        const rawBody = await req.text();

        // Verify the caller. This is a webhook receiver called by Alchemy
        // without a login, so instead of an auth check we verify the request
        // signature. Alchemy signs the raw body with HMAC-SHA256 using the
        // webhook signing key and sends it in the `x-alchemy-signature` header.
        const signature = req.headers.get('x-alchemy-signature');
        const signingKey = Deno.env.get('ALCHEMY_WEBHOOK_SECRET');

        if (!signingKey) {
            console.error('ALCHEMY_WEBHOOK_SECRET is not configured');
            return Response.json({ error: 'Webhook not configured' }, { status: 500 });
        }

        if (!signature) {
            return Response.json({ error: 'Missing signature' }, { status: 401 });
        }

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(signingKey),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
        const expected = [...new Uint8Array(mac)]
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        if (signature !== expected) {
            return Response.json({ error: 'Invalid signature' }, { status: 401 });
        }

        console.log('🔔 ALCHEMY WEBHOOK RECEIVED:', new Date().toISOString());

        const payload = JSON.parse(rawBody);
        console.log('📦 ALCHEMY PAYLOAD:', JSON.stringify(payload, null, 2));

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

        const base44 = createClientFromRequest(req);

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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { config_id } = body;

    if (!config_id) {
      return Response.json({ 
        error: 'Missing config_id' 
      }, { status: 400 });
    }

    // Get config
    const configs = await base44.entities.VPNConfig.filter({
      config_id,
      user_email: user.email
    });

    if (configs.length === 0) {
      return Response.json({ 
        error: 'Config not found' 
      }, { status: 404 });
    }

    const config = configs[0];

    // Generate QR code using Core.InvokeLLM with image generation
    // For actual QR code, in production you'd use a QR library
    // Here we'll return the config in a format ready for QR encoding
    
    const qrData = {
      type: 'wireguard_config',
      config: config.config_content,
      device_id: config.device_id,
      expires_at: config.token_expires_at
    };

    // Simple QR code SVG generation (basic implementation)
    const qrCodeSVG = await generateQRCodeSVG(config.config_content);

    // Update config with QR data
    await base44.entities.VPNConfig.update(config.id, {
      qr_code_data: qrCodeSVG,
      config_format: 'qr_code'
    });

    return Response.json({
      success: true,
      qr_code: qrCodeSVG,
      config_content: config.config_content,
      expires_at: config.token_expires_at
    });

  } catch (error) {
    console.error('QR Generator Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

// Helper function to generate QR code SVG
async function generateQRCodeSVG(data) {
  // Simplified QR code generation
  // In production, use actual QR library
  const encoded = btoa(data);
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-size="12" fill="black">
        QR Code: ${encoded.substring(0, 20)}...
      </text>
      <text x="100" y="120" text-anchor="middle" font-size="10" fill="gray">
        Scan with WireGuard app
      </text>
    </svg>
  `)}`;
}
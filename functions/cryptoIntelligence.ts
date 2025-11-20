import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();

    if (endpoint === 'crypto-prices') {
      // Fetch live crypto prices from CoinGecko API
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true'
      );
      const data = await response.json();

      const formatted = {
        BTC: {
          price: data.bitcoin?.usd || 0,
          change24h: data.bitcoin?.usd_24h_change || 0,
          volume24h: data.bitcoin?.usd_24h_vol || 0
        },
        ETH: {
          price: data.ethereum?.usd || 0,
          change24h: data.ethereum?.usd_24h_change || 0,
          volume24h: data.ethereum?.usd_24h_vol || 0
        },
        USDT: {
          price: data.tether?.usd || 0,
          change24h: data.tether?.usd_24h_change || 0,
          volume24h: data.tether?.usd_24h_vol || 0
        },
        BNB: {
          price: data.binancecoin?.usd || 0,
          change24h: data.binancecoin?.usd_24h_change || 0,
          volume24h: data.binancecoin?.usd_24h_vol || 0
        },
        SOL: {
          price: data.solana?.usd || 0,
          change24h: data.solana?.usd_24h_change || 0,
          volume24h: data.solana?.usd_24h_vol || 0
        },
        XRP: {
          price: data.ripple?.usd || 0,
          change24h: data.ripple?.usd_24h_change || 0,
          volume24h: data.ripple?.usd_24h_vol || 0
        }
      };

      return Response.json({ prices: formatted });
    }

    if (endpoint === 'scam-alerts') {
      // Get recent scam alerts from database
      const recentScams = await base44.asServiceRole.entities.ScamDatabase.list('-created_date', 20);
      
      const alerts = recentScams.map(scam => ({
        id: scam.id,
        scamType: scam.scam_type,
        title: `${scam.scam_type.toUpperCase()}: ${scam.identifier.substring(0, 30)}...`,
        summary: scam.scam_description,
        platform: scam.blockchain || 'Multiple',
        walletAddress: scam.scam_type === 'wallet' ? scam.identifier : null,
        category: scam.scam_type,
        riskLevel: scam.risk_level,
        timestamp: scam.created_date,
        source: scam.reported_by,
        verified: scam.verified,
        victimCount: scam.victim_count || 1
      }));

      return Response.json({ alerts });
    }

    if (endpoint === 'flagged-wallets') {
      // Get flagged wallets from database
      const flaggedWallets = await base44.asServiceRole.entities.ScamDatabase.filter(
        { scam_type: 'wallet', status: 'active' },
        '-created_date',
        30
      );
      
      const wallets = flaggedWallets.map(wallet => ({
        id: wallet.id,
        address: wallet.identifier,
        scamCategory: wallet.scam_description || 'Suspicious Activity',
        reportCount: wallet.victim_count || 1,
        platforms: [wallet.blockchain || 'Unknown'],
        riskLevel: wallet.risk_level,
        source: wallet.reported_by,
        totalStolen: wallet.total_stolen_usd || 0,
        firstReported: wallet.first_reported || wallet.created_date,
        verified: wallet.verified,
        status: wallet.status
      }));

      return Response.json({ wallets });
    }

    if (endpoint === 'security-tips') {
      const tips = [
        {
          id: 1,
          title: "Enable 2FA Everywhere",
          description: "Two-factor authentication adds an extra layer of security to your accounts. Always enable it on exchanges and wallets.",
          category: "authentication",
          icon: "shield"
        },
        {
          id: 2,
          title: "Never Share Private Keys",
          description: "Your private keys are like your bank password. Never share them with anyone, including 'support' teams.",
          category: "wallet",
          icon: "key"
        },
        {
          id: 3,
          title: "Verify URLs Before Clicking",
          description: "Phishing sites look identical to real ones. Always double-check the URL before entering sensitive information.",
          category: "phishing",
          icon: "link"
        },
        {
          id: 4,
          title: "Use Hardware Wallets for Large Amounts",
          description: "Store significant crypto holdings in hardware wallets (cold storage) for maximum security.",
          category: "wallet",
          icon: "lock"
        },
        {
          id: 5,
          title: "Research Before Investing",
          description: "If something promises guaranteed returns or seems too good to be true, it probably is. Always DYOR.",
          category: "investment",
          icon: "search"
        },
        {
          id: 6,
          title: "Beware of Fake Support",
          description: "Real crypto support never DMs first. Block and report anyone claiming to be support who contacts you.",
          category: "scam",
          icon: "alert"
        },
        {
          id: 7,
          title: "Keep Software Updated",
          description: "Outdated software has security vulnerabilities. Always update your wallet apps and browser extensions.",
          category: "security",
          icon: "refresh"
        },
        {
          id: 8,
          title: "Use Different Passwords",
          description: "Never reuse passwords across platforms. Use a password manager to generate and store unique passwords.",
          category: "password",
          icon: "key"
        }
      ];

      // Return 3 random tips
      const shuffled = tips.sort(() => 0.5 - Math.random());
      const selectedTips = shuffled.slice(0, 3);

      return Response.json({ tips: selectedTips });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
  const base44 = createClientFromRequest(req);
  
  // Authorization check
  const user = await base44.auth.me();
  if (!user || (user.role !== 'admin' && !user.is_admin)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const { address } = await req.json();

  if (!address) {
    return new Response(JSON.stringify({ error: 'Wallet address is required' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const API_KEY = Deno.env.get('ETHERSCAN_API_KEY');
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Etherscan API key not configured' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const BASE_URL = 'https://api.etherscan.io/api';

  try {
    // Fetch data in parallel
    const [balanceRes, txRes, tokenRes, erc721Res] = await Promise.all([
      fetch(`${BASE_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY}`),
      fetch(`${BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=${API_KEY}`),
      fetch(`${BASE_URL}?module=account&action=tokentx&address=${address}&page=1&offset=50&sort=desc&apikey=${API_KEY}`),
      fetch(`${BASE_URL}?module=account&action=tokennfttx&address=${address}&page=1&offset=50&sort=desc&apikey=${API_KEY}`)
    ]);

    const balanceData = await balanceRes.json();
    const txData = await txRes.json();
    const tokenData = await tokenRes.json();
    const erc721Data = await erc721Res.json();

    // Process Balance (Wei to ETH)
    const balance = balanceData.result ? (parseInt(balanceData.result) / 1e18).toFixed(4) : '0.00';

    // Process Transactions
    const transactions = Array.isArray(txData.result) ? txData.result.map(tx => ({
      hash: tx.hash,
      timeStamp: tx.timeStamp,
      from: tx.from,
      to: tx.to,
      value: (parseInt(tx.value) / 1e18).toFixed(4),
      isError: tx.isError,
      functionName: tx.functionName
    })) : [];

    // Calculate counts
    const incomingCount = transactions.filter(tx => tx.to.toLowerCase() === address.toLowerCase()).length;
    const outgoingCount = transactions.filter(tx => tx.from.toLowerCase() === address.toLowerCase()).length;

    // Contract Interactions
    const contractInteractions = transactions.filter(tx => tx.to === '' || (tx.input && tx.input !== '0x'));

    // Risk Indicators
    const risks = [];
    if (outgoingCount > incomingCount * 2 && outgoingCount > 10) risks.push("High outgoing activity (Possible drainage)");
    if (transactions.some(tx => tx.isError === '1')) risks.push("Failed transactions detected");
    if (contractInteractions.length > 0) risks.push(`${contractInteractions.length} contract interactions detected`);

    return new Response(JSON.stringify({
      address,
      balance,
      transactions,
      tokens: Array.isArray(tokenData.result) ? tokenData.result : [],
      nfts: Array.isArray(erc721Data.result) ? erc721Data.result : [],
      stats: {
        incoming: incomingCount,
        outgoing: outgoingCount,
        total: transactions.length
      },
      risks
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

// Etherscan API endpoints:
// Balance: module=account&action=balance
// Normal Tx: module=account&action=txlist
// ERC20: module=account&action=tokentx
// ERC721: module=account&action=tokennfttx
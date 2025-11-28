import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, params } = await req.json();
    
    const rpcUrl = Deno.env.get("ELECTRA_RPC_URL");
    const rpcUser = Deno.env.get("ELECTRA_RPC_USER");
    const rpcPass = Deno.env.get("ELECTRA_RPC_PASSWORD");

    if (!rpcUrl || !rpcUser || !rpcPass) {
       // Fallback for demo purposes if secrets aren't set yet, 
       // typically we would return an error or handle mock data
       if (method === 'getnewaddress') {
         return Response.json({ result: "EP" + Math.random().toString(36).substring(2, 12).toUpperCase() + "MOCK" });
       }
       return Response.json({ error: 'Electra Node configuration missing' }, { status: 503 });
    }

    const rpcBody = {
      jsonrpc: "1.0",
      id: "curltext",
      method: method,
      params: params || []
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain;',
        'Authorization': 'Basic ' + btoa(`${rpcUser}:${rpcPass}`)
      },
      body: JSON.stringify(rpcBody)
    });

    const data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error }, { status: 400 });
    }

    return Response.json(data);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
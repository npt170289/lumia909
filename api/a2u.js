// A2U SANDBOX / TESTNET HANDLER CHO LUMIA 909
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY; // API Key Sandbox của lumia909
  
  try {
    console.log(`LUMIA909 SANDBOX A2U Processing for UID: ${uid}`);

    // DÙNG ENDPOINT SANDBOX / TESTNET THAY VÌ MAINNET
    const response = await fetch('https://api.sandbox.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 Sandbox Test to @${username || 'user'}`,
        metadata: { target_uid: uid },
        uid: uid
      })
    });
    
    const data = await response.json();
    console.log("LUMIA909 Sandbox API Response Status:", response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Pi Sandbox API Error", details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

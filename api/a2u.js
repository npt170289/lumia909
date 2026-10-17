export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY; // API Key lấy từ Pi Developer Portal của app lumia909
  
  try {
    console.log(`LUMIA909 A2U Processing for UID: ${uid}`);

    // Gọi trực tiếp Pi Mainnet API Server v2
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 Mainnet Test to @${username || 'user'}`,
        metadata: { target_uid: uid },
        uid: uid
      })
    });
    
    const data = await response.json();
    console.log("LUMIA909 Pi API Response Status:", response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Pi API Error", details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

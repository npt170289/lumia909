export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, username, amount } = req.body || {};
  
  if (!uid) {
    return res.status(400).json({ error: "Thiếu dữ liệu UID trong Request Body" });
  }

  const PI_API_KEY = process.env.PI_API_KEY; 
  
  if (!PI_API_KEY) {
    return res.status(500).json({ error: "Thiếu PI_API_KEY trên Vercel!" });
  }
  
  try {
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 Sandbox Test to @${username || uid}`,
        metadata: { target_uid: uid },
        uid: uid
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Pi API Error", details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    return res.status(500).json({ error: "Internal Exception", message: e.message });
  }
}

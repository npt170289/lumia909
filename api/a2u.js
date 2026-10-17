// MAINNET A2U - Lumia 909
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY; // Nhớ set PI_API_KEY = 5v9y...2n1f trong Vercel
  
  try {
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia909 Mainnet to @${username}`,
        metadata: { target_uid: uid },
        uid: uid
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

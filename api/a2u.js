export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;
  
  console.log(`LUMIA909 API Start - UID: ${uid}, Key exists: ${!!PI_API_KEY}`);

  if (!PI_API_KEY) {
    console.error("❌ LỖI: Thiếu biến môi trường PI_API_KEY trên Vercel!");
    return res.status(500).json({ error: "Missing PI_API_KEY in Vercel settings" });
  }
  
  try {
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
    console.log("Pi Sandbox API Raw Response Status:", response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({ error: "Pi Sandbox API Error", details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    console.error("❌ Ngoại lệ Catch trong a2u.js:", e.message);
    return res.status(500).json({ error: "Internal Server Exception", message: e.message });
  }
}

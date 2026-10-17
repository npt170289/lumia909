export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;
  
  console.log(`LUMIA909 API Start - UID: ${uid}, Key exists: ${!!PI_API_KEY}`);

  if (!PI_API_KEY) {
    return res.status(500).json({ error: "Missing PI_API_KEY in Vercel settings" });
  }
  
  try {
    // Thử dùng endpoint chuẩn api.minepi.com nhưng bật chế độ sandbox thông qua headers hoặc payload nếu Pi yêu cầu,
    // hoặc ép kiểu gọi fetch với timeout/agent. Ở đây ta thử gọi endpoint chuẩn v2 payments:
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 Test to @${username || 'user'}`,
        metadata: { target_uid: uid },
        uid: uid
      })
    });
    
    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch (err) {
      data = { raw: textData };
    }
    
    console.log("Pi API Response Status:", response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Pi API Error", details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    console.error("❌ Fetch Exception Detail:", e);
    return res.status(500).json({ error: "Fetch Failed Exception", message: e.message });
  }
}

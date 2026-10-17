export default async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY; // Key Mainnet của Lumia 909 trên Vercel
  
  console.log(`[LUMIA909 A2U] Bắt đầu xử lý cho UID: ${uid}, User: @${username}, Key tồn tại: ${!!PI_API_KEY}`);

  if (!PI_API_KEY) {
    return res.status(500).json({ error: "Thiếu PI_API_KEY trong cài đặt Environment Variables của Vercel!" });
  }

  if (!uid) {
    return res.status(400).json({ error: "Thiếu thông tin UID người nhận!" });
  }
  
  try {
    // Gọi thẳng vào endpoint chuẩn v2/payments giống hệt Garden Station Mainnet
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 A2U Reward to @${username || 'user'}`,
        metadata: { target_uid: uid, app: "lumia909" },
        uid: uid
      })
    });
    
    const data = await response.json();
    
    console.log(`[LUMIA909 API Response] Status: ${response.status}`, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Pi API Error", 
        status: response.status,
        details: data 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      paymentId: data.identifier || data.id, 
      data 
    });

  } catch (e) {
    console.error("❌ Lỗi ngoại lệ trong a2u.js:", e.message);
    return res.status(500).json({ 
      error: "Internal Exception", 
      message: e.message 
    });
  }
}

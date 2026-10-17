export default async function handler(req, res) {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;
  
  console.log(`LUMIA909 API Start - UID: ${uid}, Key exists: ${!!PI_API_KEY}`);

  // Kiểm tra biến môi trường API Key
  if (!PI_API_KEY) {
    console.error("❌ LỖI: Thiếu biến môi trường PI_API_KEY trên Vercel!");
    return res.status(500).json({ error: "Missing PI_API_KEY in Vercel settings" });
  }

  // Kiểm tra UID truyền lên
  if (!uid) {
    return res.status(400).json({ error: "Missing target UID" });
  }
  
  try {
    // Gọi trực tiếp đến API Sandbox A2U của Pi Network
    const response = await fetch('https://api.sandbox.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        amount: amount || 1,
        memo: `Lumia 909 Sandbox Test to @${username || 'user'}`,
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
    
    console.log("Pi Sandbox API Response Status:", response.status, JSON.stringify(data));

    // Nếu Pi Server trả về lỗi (như user_not_found hoặc lỗi auth)
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Pi Sandbox API Error", 
        status: response.status,
        details: data 
      });
    }
    
    // Thành công rực rỡ
    return res.status(200).json({ 
      success: true, 
      paymentId: data.identifier || data.payment_id, 
      data 
    });

  } catch (e) {
    console.error("❌ Fetch Exception Detail in a2u.js:", e.message);
    return res.status(500).json({ 
      error: "Fetch Failed Exception", 
      message: e.message 
    });
  }
}

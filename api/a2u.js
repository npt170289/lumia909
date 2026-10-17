// MAINNET A2U - Lumia 909 - FIX 500 - GIỮ HỒN GARDEN STATION 303
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount, memo } = req.body || {};
  const PI_API_KEY = process.env.PI_API_KEY;
  
  if (!uid) return res.status(400).json({ error: 'Thiếu UID' });
  if (!PI_API_KEY) return res.status(500).json({ error: 'PI_API_KEY chưa set trong Vercel ENV' });

  try {
    // FIX QUAN TRỌNG: Phải dùng api.minepi.com như con Garden đã pay thành công
    // Chứ không phải api.testnet.minepi.com
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount) || 1,
        // Dùng memo từ frontend gửi qua (có timestamp) để tránh Pi Browser cache trùng
        memo: memo || `Lumia909 Mainnet to @${username} #${Date.now()}`,
        metadata: { target_uid: uid, username: username, app: 'lumia909-mainnet' },
        uid: uid
      })
    });
    
    const data = await response.json();
    
    // Log ra Vercel Logs để bro xem, không giấu lỗi nữa
    console.log('Lumia909 A2U Pi Response:', response.status, JSON.stringify(data).substring(0,500));

    if (!response.ok) {
      // Trả về lỗi thật của Pi, không quăng 500 chung chung
      return res.status(response.status).json({ error: 'Pi API Error', details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    console.error('Lumia909 A2U Exception:', e);
    return res.status(500).json({ error: e.message });
  }
}

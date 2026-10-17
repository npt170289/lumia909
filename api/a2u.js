// LUMIA 909 - MAINNET A2U - KHỚP GARDEN STATION 303 V5 THÀNH CÔNG
// BUILD: lumia909-mainnet.vercel.app
// APP ID: lumia909 (MAINNET)
// 5 UID DÙNG LẠI - KHÔNG PHÂN BIỆT TESTNET/MAINNET

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { uid, username, amount, memo } = req.body || {};
  const PI_API_KEY = process.env.PI_API_KEY; // 5v9y...2n1f đã set trong Vercel ENV
  
  if (!uid) return res.status(400).json({ error: 'Thiếu UID' });
  if (!PI_API_KEY) return res.status(500).json({ error: 'PI_API_KEY chưa set trong Vercel' });

  try {
    // KHỚP GARDEN THÀNH CÔNG: Dùng api.minepi.com (MAINNET)
    // Vì 5 UID này đã dùng thành công cho cả 2 web, không phân biệt
    const response = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount) || 1,
        memo: memo || `Lumia909 Mainnet to @${username} #${Date.now()}`,
        metadata: { target_uid: uid, username: username, app: 'lumia909-mainnet', soul: 'garden-station-303' },
        uid: uid
      })
    });
    
    const data = await response.json();
    
    // LOG RA VERCEL LOGS ĐỂ BRO SOI - FIX LỖI 500 MÙ TRƯỚC ĐÓ
    console.log(`LUMIA909 A2U Pi Response: ${response.status}`, JSON.stringify(data).substring(0,600));

    if (!response.ok) {
      // Trả về lỗi thật của Pi, không throw 500 chung chung
      return res.status(response.status).json({ error: 'Pi API Error', details: data });
    }
    
    return res.status(200).json({ success: true, paymentId: data.identifier, data });
  } catch (e) {
    console.error('LUMIA909 A2U Exception:', e);
    return res.status(500).json({ error: e.message });
  }
}

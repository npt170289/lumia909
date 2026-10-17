export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  if (!PI_API_KEY) {
    return res.status(500).json({ error: "Thiếu PI_API_KEY trong Vercel Environment Variables!" });
  }

  try {
    console.log(`[LUMIA909 A2U TESTNET] Đang tạo payment cho @${username} (UID: ${uid})...`);

    // 1. Bước Create Payment trên Testnet Endpoint chuẩn
    const createRes = await fetch('https://api.testnet.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: uid,
        amount: amount || 1,
        memo: `Lumia 909 A2U Testnet Reward for @${username}`,
        metadata: { type: "a2u_lumia909" }
      })
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error("Create Payment Error:", createData);
      return res.status(createRes.status).json({ error: "Create Payment Failed", details: createData });
    }

    const paymentId = createData.identifier || createData.id;
    console.log(`[LUMIA909 A2U TESTNET] Payment Created: ${paymentId}. Đang Approve...`);

    // 2. Bước Approve Payment
    const approveRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      console.error("Approve Error:", approveData);
      return res.status(approveRes.status).json({ error: "Approve Failed", details: approveData });
    }

    // 3. Bước Complete Payment
    const txid = approveData.transaction?.txid || "mock_txid_" + Date.now();
    const completeRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid: txid })
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) {
      console.error("Complete Error:", completeData);
      return res.status(completeRes.status).json({ error: "Complete Failed", details: completeData });
    }

    return res.status(200).json({
      success: true,
      paymentId: paymentId,
      message: `Thành công A2U cho @${username}`,
      data: completeData
    });

  } catch (e) {
    console.error("Fatal A2U Error:", e.message);
    return res.status(500).json({ error: "Internal Exception", message: e.message });
  }
}

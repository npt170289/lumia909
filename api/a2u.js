export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  if (!uid) {
    return res.status(400).json({ error: 'Missing uid in request body' });
  }

  try {
    // Chuẩn hóa payload bọc trong object 'payment' theo đúng tài liệu Pi Platform API
    const piPayload = {
      payment: {
        amount: Number(amount) || 1,
        memo: `Lumia 909 Sandbox Test to @${username || uid}`,
        metadata: { target_uid: uid },
        uid: uid
      }
    };

    const piResponse = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(piPayload)
    });

    const responseData = await piResponse.json();

    // Log an toàn trên server Vercel để đối soát khi cần
    console.log("Pi API Status:", piResponse.status);
    console.log("Pi API Response Body:", JSON.stringify(responseData));

    return res.status(piResponse.status).json(responseData);

  } catch (error) {
    console.error("Internal Server Error:", error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

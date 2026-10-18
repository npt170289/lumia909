export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { uid, username, amount } = req.body;
  const PI_API_KEY = process.env.PI_API_KEY;

  try {
    const piResponse = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: uid,
        amount: amount || 1,
        memo: `A2U payment for @${username}`,
        metadata: { test: true }
      })
    });

    const responseData = await piResponse.json();
    return res.status(piResponse.status).json(responseData);

  } catch (error) {
    return res.status(500).json({ error: 'Server Error', details: error.message });
  }
}

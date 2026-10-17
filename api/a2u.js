export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});

  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({error: 'Thieu uid'});

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) return res.status(500).json({error: 'Thieu PI_API_KEY'});

  try {
    const r = await fetch('https://api.minepi.com/v2/payments', {
      method: 'POST',
      headers: { 'Authorization': `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1, memo: `Lumia909 to ${uid}`, metadata: {target_uid: uid}, uid: uid })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json({success: true, paymentId: data.identifier, data});
  } catch (e) {
    return res.status(500).json({error: e.message});
  }
}

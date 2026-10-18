export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  const body = req.body || {};
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const amount = Number(body.amount);

  if (!uid || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid parameters" });
  }

  const piPayload = {
    payment: {
      amount,
      memo: `Lumia 909 Sandbox Test to @${username || uid}`,
      metadata: { target_uid: uid },
      uid,
    },
  };

  try {
    const piResponse = await fetch("https://api.minepi.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(piPayload),
    });

    const responseText = await piResponse.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { raw_response: responseText.slice(0, 2000) };
    }

    if (!piResponse.ok) {
      return res.status(piResponse.status).json({
        success: false,
        error: "Pi Platform API rejected the request",
        details: responseData,
      });
    }

    return res.status(200).json({
      success: true,
      pi_response: responseData,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: "Unable to reach Pi Platform API",
      details: error.message,
    });
  }
}

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
  const payment_id = typeof body.payment_id === "string" ? body.payment_id.trim() : "";

  if (!payment_id) {
    return res.status(400).json({ success: false, error: "Missing payment_id" });
  }

  try {
    const piResponse = await fetch(`https://api.minepi.com/v2/payments/${payment_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
        error: "Không thể hủy giao dịch trên Pi Server",
        details: responseData,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã hủy thành công giao dịch kẹt: ${payment_id}`,
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

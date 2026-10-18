export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const PI_API_KEY = process.env.PI_API_KEY;
  const paymentId = "GMBEpNlMFR9y2iCZsuTk33t1j0"; // Mã đang kẹt cứng
  // Stellar TXID giả lập chuẩn 64 ký tự hex để Pi Sandbox chấp nhận
  const mockTxid = "1111111111111111111111111111111111111111111111111111111111111111";

  try {
    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ txid: mockTxid }),
      }
    );

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return res.status(response.status).json({
      success: response.ok,
      pi_status: response.status,
      response: data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

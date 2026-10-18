export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    return res.status(500).json({ success: false, error: "Thiếu PI_API_KEY" });
  }

  // Nhận payment_identifier bị kẹt từ request body
  const { payment_id } = req.body || {};

  if (!payment_id) {
    return res.status(400).json({ success: false, error: "Thiếu payment_id" });
  }

  try {
    // Gọi API của Pi Network để hủy/giải phóng giao dịch đang bị treo
    const response = await fetch(
      `https://api.minepi.com/v2/payments/${payment_id}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "Không thể hủy giao dịch trên Pi Server",
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã hủy thành công giao dịch kẹt: ${payment_id}`,
      pi_response: data,
    });
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message });
  }
}

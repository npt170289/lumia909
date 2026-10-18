
export default async function handler(req, res) {
  // 1. Chỉ nhận POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed",
    });
  }

  // 2. Kiểm tra API key phía server
  const PI_API_KEY = process.env.PI_API_KEY;

  if (!PI_API_KEY) {
    console.error("Missing environment variable: PI_API_KEY");

    return res.status(500).json({
      success: false,
      error: "Server configuration error",
      details: "PI_API_KEY is not configured",
    });
  }

  // 3. Đọc và xác thực dữ liệu đầu vào
  const body = req.body || {};
  const uid =
    typeof body.uid === "string" ? body.uid.trim() : "";
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const amount = Number(body.amount);

  if (!uid) {
    return res.status(400).json({
      success: false,
      error: "Missing uid",
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid amount",
    });
  }

  // 4. Tạo yêu cầu A2U gửi tới Pi Platform API
  const piPayload = {
    payment: {
      amount,
      memo: `Lumia 909 Sandbox Test to @${username || uid}`,
      metadata: {
        target_uid: uid,
      },
      uid,
    },
  };

  try {
    const piResponse = await fetch(
      "https://api.minepi.com/v2/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(piPayload),
      }
    );

    // Đọc an toàn kể cả khi Pi API không trả JSON
    const responseText = await piResponse.text();
    let responseData;

    try {
      responseData = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      responseData = {
        raw_response: responseText.slice(0, 2000),
      };
    }

    // Không log API key hoặc thông tin bí mật
    console.log("Pi API Status:", piResponse.status);
    console.log(
      "Pi API Response:",
      JSON.stringify(responseData)
    );

    if (!piResponse.ok) {
      return res.status(piResponse.status).json({
        success: false,
        error: "Pi Platform API rejected the request",
        pi_status: piResponse.status,
        details: responseData,
      });
    }

    return res.status(piResponse.status).json({
      success: true,
      pi_response: responseData,
    });
  } catch (error) {
    console.error("A2U request failed:", error.message);

    return res.status(502).json({
      success: false,
      error: "Unable to reach Pi Platform API",
      details: error.message,
    });
  }
}

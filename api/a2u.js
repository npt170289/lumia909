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
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
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

  // 4. BƯỚC 1: Tạo yêu cầu A2U gửi tới Pi Platform API
  const piPayload = {
    payment: {
      amount,
      memo: `Lumia 909 Sandbox Test to @${username || uid}`,
      metadata: { target_uid: uid },
      uid,
    },
  };

  try {
    const createRes = await fetch("https://api.minepi.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(piPayload),
    });

    const createText = await createRes.text();
    let createData;
    try {
      createData = createText ? JSON.parse(createText) : {};
    } catch {
      createData = { raw_response: createText.slice(0, 2000) };
    }

    if (!createRes.ok) {
      return res.status(createRes.status).json({
        success: false,
        error: "Pi Platform API rejected payment creation",
        pi_status: createRes.status,
        details: createData,
      });
    }

    const paymentId = createData.identifier;
    const txid = createData.transaction?.txid || `tx_sandbox_${Date.now()}`;

    // 5. BƯỚC 2: Tự động gọi COMPLETE để đóng vòng đời giao dịch ngay lập tức
    // Tránh bị giữ trạng thái treo dở dang (ongoing_payment_found) cho UID tiếp theo
    if (paymentId) {
      try {
        const completeRes = await fetch(
          `https://api.minepi.com/v2/payments/${paymentId}/complete`,
          {
            method: "POST",
            headers: {
              Authorization: `Key ${PI_API_KEY}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ txid }),
          }
        );

        const completeText = await completeRes.text();
        let completeData;
        try {
          completeData = completeText ? JSON.parse(completeText) : {};
        } catch {
          completeData = { raw_response: completeText.slice(0, 2000) };
        }

        if (completeRes.ok) {
          return res.status(200).json({
            success: true,
            completed: true,
            payment_id: paymentId,
            pi_response: completeData,
          });
        }
      } catch (completeErr) {
        console.warn("Auto-complete call error:", completeErr.message);
      }
    }

    // Trả về kết quả nếu tạo thành công (ngay cả khi complete chờ xử lý ở sandbox)
    return res.status(200).json({
      success: true,
      completed: false,
      payment_id: paymentId,
      pi_response: createData,
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

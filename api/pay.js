export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const PI_API_KEY = process.env.PI_API_KEY;
  if (!PI_API_KEY) {
    return res.status(500).json({ success: false, error: "Server configuration error: missing PI_API_KEY" });
  }

  const body = req.body || {};
  // Hỗ trợ cả 1 UID (uid) và 5 UID (uids)
  let targetList = [];
  if (Array.isArray(body.uids) && body.uids.length > 0) {
    targetList = body.uids.map(u => typeof u === 'string' ? u.trim() : '').filter(Boolean);
  } else if (typeof body.uid === 'string' && body.uid.trim()) {
    targetList = [body.uid.trim()];
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const amount = Number(body.amount);
  
  // Nếu truyền 5 UID hoàn chỉnh của bro thì dùng luôn
  const DEFAULT_5UIDS = [
    "17bd5195-d292-453f-9257-e3c9d812a7a0",
    "4a0e132a-2689-484b-8d4b-04e6391a89d9",
    "7dc50a3e-e66d-4e06-8077-d2b5306889b1",
    "0c5bbb4d-5306-48b4-b227-383d95399a53",
    "f963dc03-f6f5-41ba-a3f4-54f5a8569b5c"
  ];

  if (targetList.length === 0) {
    // Nếu không gửi gì thì mặc định bắn 5 UID thật của bro
    targetList = DEFAULT_5UIDS;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: "Invalid amount" });
  }

  async function piFetch(path, method = "GET", payload) {
    const r = await fetch(`https://api.minepi.com${path}`, {
      method,
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const text = await r.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0,2000)}; }
    return { ok: r.ok, status: r.status, data };
  }

  try {
    // B0: DỌN INCOMPLETE CŨ - Đây là chỗ fix kẹt UID đầu tiên
    try {
      const incomplete = await piFetch("/v2/payments/incomplete", "GET");
      if (incomplete.ok && incomplete.data && Array.isArray(incomplete.data.incomplete_payments)) {
        for (const p of incomplete.data.incomplete_payments) {
          await piFetch(`/v2/payments/${p.identifier}/cancel`, "POST");
        }
      } else if (incomplete.ok && Array.isArray(incomplete.data) && incomplete.data.length > 0) {
        // Format khác của Pi API
        for (const p of incomplete.data) {
          await piFetch(`/v2/payments/${p.identifier}/cancel`, "POST");
        }
      }
    } catch (e) {
      // Không chặn flow chính nếu dọn rác lỗi
      console.log("Cleanup incomplete error:", e.message);
    }

    // B1: BẮN 5 UID - Giữ y nguyên logic ChatGPT đã thành công cho 1 UID
    const results = [];
    for (let i = 0; i < targetList.length; i++) {
      const uid = targetList[i];
      const piPayload = {
        payment: {
          amount,
          memo: `Lumia 909 Sandbox Test to @${username || uid} - ${i+1}/${targetList.length}`,
          metadata: { target_uid: uid, batch_index: i },
          uid,
        },
      };

      const piResponse = await piFetch("/v2/payments", "POST", piPayload);

      if (!piResponse.ok) {
        results.push({
          uid,
          success: false,
          error: "Pi Platform API rejected",
          details: piResponse.data,
          status: piResponse.status
        });
      } else {
        results.push({
          uid,
          success: true,
          pi_response: piResponse.data
        });
      }

      // Nghỉ nhẹ 600ms giữa các lần bắn tránh rate limit
      if (i < targetList.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    const allOk = results.every(r => r.success);
    return res.status(allOk ? 200 : 207).json({
      success: allOk,
      total: results.length,
      results
    });

  } catch (error) {
    return res.status(502).json({
      success: false,
      error: "Unable to reach Pi Platform API",
      details: error.message,
    });
  }
}

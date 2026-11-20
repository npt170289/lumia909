// POST /api/chats — lưu lịch sử chat vào Supabase để huấn luyện AI.
// Lumia 909 — venue: 'lumia909'.
// Chỉ lưu text, không lưu gì khác. Không để chat nằm trong RAM.
import { supaInsert } from './_supabase.js';

const VENUE = 'lumia909';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
  const body = req.body || {};
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  const userMessage = typeof body.user_message === 'string' ? body.user_message.trim() : '';
  const botReply = typeof body.bot_reply === 'string' ? body.bot_reply.trim() : '';
  const bookingId =
    typeof body.booking_id === 'string' && body.booking_id.trim()
      ? body.booking_id.trim()
      : null;

  if (!sessionId) return res.status(400).json({ success: false, error: 'Thiếu session_id' });
  if (!userMessage) return res.status(400).json({ success: false, error: 'Thiếu user_message' });
  if (!botReply) return res.status(400).json({ success: false, error: 'Thiếu bot_reply' });

  try {
    const inserted = await supaInsert('chats', {
      venue: VENUE,
      session_id: sessionId,
      user_message: userMessage,
      bot_reply: botReply,
      booking_id: bookingId,
    });
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    return res.status(200).json({ success: true, id: row && row.id ? row.id : null });
  } catch (e) {
    console.error('chats error:', e.message);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ, chưa lưu được lịch sử chat' });
  }
}

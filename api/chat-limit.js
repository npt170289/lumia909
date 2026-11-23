// POST /api/chat-limit — Giới hạn chatbot nội bộ: mỗi người tối đa 20 câu/ngày.
// Nhận diện "người" bằng MÃ TRÌNH DUYỆT (cid) khi frontend gửi lên; nếu không có cid
// thì dùng IP (hash SHA-256, KHÔNG lưu IP thô). Dùng cid để tránh chặn nhầm: ở trong
// quán, nhiều khách dùng chung WiFi (chung 1 IP công cộng) thì mỗi trình duyệt vẫn có
// quota riêng. Đếm theo ngày Việt Nam.
// Dùng bảng Supabase `chat_limits` (ip_hash, venue, day, count). Cột ip_hash giờ chứa
// hash của cid HOẶC của IP (có tiền tố 'cid:' / 'ip:' để phân biệt) — KHÔNG cần đổi schema.
// Trả về { allowed: true, remaining: N } hoặc { allowed: false, remaining: 0 }.
// Lỗi Supabase -> fail OPEN (allowed: true) để chatbot không gãy vì limiter.
import crypto from 'crypto';
import { supaSelect, supaInsert, supaUpdate } from './_supabase.js';

const LIMIT_PER_DAY = 20;
const VENUES = ['garden303', 'lumia909'];
// cid hợp lệ: 8-128 ký tự, chỉ chữ/số và . _ - (do frontend tự sinh, chặn chuỗi lạ).
const CID_RE = /^[A-Za-z0-9._-]{8,128}$/;

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).trim();
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function todayVN() {
  // Ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh), dạng YYYY-MM-DD.
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

// Hash định danh: ưu tiên cid (mỗi trình duyệt 1 quota), nếu không có/không hợp lệ
// thì dùng IP (tương thích cũ). Tiền tố 'cid:' / 'ip:' để 2 loại không đụng nhau.
function identifierHash(req, body) {
  const cid = typeof body.cid === 'string' ? body.cid.trim() : '';
  if (cid && CID_RE.test(cid)) {
    return crypto.createHash('sha256').update('cid:' + cid).digest('hex');
  }
  const ip = clientIp(req);
  return crypto.createHash('sha256').update('ip:' + ip).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ allowed: true, error: 'Method Not Allowed' });
  }
  const body = req.body || {};
  const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
  if (!VENUES.includes(venue)) {
    return res.status(400).json({ allowed: true, error: 'venue không hợp lệ' });
  }
  const idHash = identifierHash(req, body);
  const day = todayVN();

  try {
    const rows = await supaSelect(
      'chat_limits',
      'ip_hash=eq.' + encodeURIComponent(idHash) +
      '&venue=eq.' + encodeURIComponent(venue) +
      '&day=eq.' + encodeURIComponent(day) +
      '&select=count'
    );
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    const count = row && typeof row.count === 'number' ? row.count : 0;

    if (count >= LIMIT_PER_DAY) {
      return res.status(200).json({ allowed: false, remaining: 0, count });
    }
    const next = count + 1;
    if (!row) {
      await supaInsert('chat_limits', { ip_hash: idHash, venue, day, count: 1 });
    } else {
      await supaUpdate(
        'chat_limits',
        { count: next },
        'ip_hash=eq.' + encodeURIComponent(idHash) +
        '&venue=eq.' + encodeURIComponent(venue) +
        '&day=eq.' + encodeURIComponent(day)
      );
    }
    return res.status(200).json({ allowed: true, remaining: LIMIT_PER_DAY - next, count: next });
  } catch (e) {
    // Fail open: limiter lỗi thì vẫn cho chat (không chặn khách vì lỗi hệ thống).
    console.error('chat-limit error:', e.message);
    return res.status(200).json({ allowed: true, remaining: LIMIT_PER_DAY, error: 'limiter tạm lỗi, cho qua' });
  }
}

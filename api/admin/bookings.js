// GET /api/admin/bookings — dashboard nội bộ cho Lumia 909 xem lại đặt bàn.
// Chỉ trả đặt bàn của venue 'lumia909' (DB dùng chung 2 quán).
// Query: ?phone= (tìm gần đúng theo SĐT, không bắt buộc), ?limit= (mặc định 50, tối đa 200).
// BẢO MẬT: route này yêu cầu mật khẩu quản trị.
// - Client gửi mật khẩu trong header "x-admin-key".
// - Server so sánh với process.env.ADMIN_PASSWORD (đặt trong Vercel Dashboard
//   → Environment Variables, KHÔNG ghi trong code, KHÔNG commit lên Git).
// - So sánh timing-safe (băm SHA-256 rồi so sánh) để kẻ xấu không đoán được
//   mật khẩu từng ký tự bằng cách đo thời gian phản hồi.
// - Fail-closed: nếu ADMIN_PASSWORD chưa được đặt thì CHẶN TẤT CẢ (401),
//   kể cả khi có gửi key. Không có mật khẩu mặc định.
import crypto from 'node:crypto';
import { supaSelect } from '../_supabase.js';

const VENUE = 'lumia909';

function timingSafeEqualStr(a, b) {
  const ha = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const provided = req.headers['x-admin-key'];
  if (
    !adminPassword ||
    typeof provided !== 'string' ||
    provided.length === 0 ||
    !timingSafeEqualStr(provided, adminPassword)
  ) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập quản trị' });
  }
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;

  const phone =
    typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
  // PostgREST ilike: tìm gần đúng, escape % và _ trong input
  const safePhone = phone.replace(/[%_\\]/g, (c) => '\\' + c);
  const filter = safePhone
    ? 'phone=ilike.*' + encodeURIComponent(safePhone) + '*'
    : '';
  const query =
    'venue=eq.' + VENUE +
    '&select=id,name,phone,time,party_size,note,pi_points_used,created_at' +
    '&order=created_at.desc&limit=' +
    limit +
    (filter ? '&' + filter : '');

  try {
    const bookings = await supaSelect('bookings', query);
    return res.status(200).json({ success: true, bookings: bookings || [] });
  } catch (e) {
    console.error('admin/bookings error:', e.message);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ, chưa tải được đặt bàn' });
  }
}

// POST /api/bookings — nhận form đặt bàn thật, lưu vào Supabase.
// Lumia 909 — venue: 'lumia909'.
// Quy tắc điểm Phase 1: mỗi lần đặt bàn thành công = +10 điểm Pi
// (điểm thưởng, KHÔNG phải thanh toán — thanh toán chỉ VND).
// DB dùng chung 2 quán: mọi row đều gắn venue, khách tra theo
// (phone, venue) để cùng một SĐT không bị nhầm giữa 2 quán.
import { supaInsert, supaSelect, supaUpsert } from './_supabase.js';

const VENUE = 'lumia909';
const POINTS_PER_BOOKING = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const partySize = Number(body.party_size);
  const time = new Date(body.time);

  if (!name) return res.status(400).json({ success: false, error: 'Thiếu tên quý khách' });
  if (!phone) return res.status(400).json({ success: false, error: 'Thiếu số điện thoại' });
  if (!body.time || isNaN(time.getTime()))
    return res.status(400).json({ success: false, error: 'Giờ đến không hợp lệ' });
  if (!Number.isInteger(partySize) || partySize < 1)
    return res.status(400).json({ success: false, error: 'Số người phải là số nguyên từ 1 trở lên' });

  try {
    // 1. Lưu booking (pi_points_used = 0 khi tạo)
    const inserted = await supaInsert('bookings', {
      venue: VENUE,
      name,
      phone,
      time: time.toISOString(),
      party_size: partySize,
      note: note || null,
      pi_points_used: 0,
    });
    const booking = Array.isArray(inserted) ? inserted[0] : inserted;

    // 2. Khách + điểm (phần này lỗi thì vẫn giữ booking, chỉ báo points_awarded = 0)
    let customer = null;
    let pointsAwarded = 0;
    try {
      const found = await supaSelect(
        'customers',
        'phone=eq.' + encodeURIComponent(phone) +
          '&venue=eq.' + VENUE +
          '&select=id,phone,total_points&limit=1'
      );
      if (!found || found.length === 0) {
        const created = await supaUpsert(
          'customers',
          { venue: VENUE, phone, name, total_points: POINTS_PER_BOOKING },
          'phone,venue'
        );
        customer = Array.isArray(created) ? created[0] : created;
        pointsAwarded = POINTS_PER_BOOKING;
      } else {
        const existing = found[0];
        const newTotal = (existing.total_points || 0) + POINTS_PER_BOOKING;
        const updated = await supaUpsert(
          'customers',
          { venue: VENUE, phone, name, total_points: newTotal },
          'phone,venue'
        );
        customer = Array.isArray(updated) ? updated[0] : updated;
        pointsAwarded = POINTS_PER_BOOKING;
      }
      if (customer && customer.id) {
        await supaInsert('points_log', {
          venue: VENUE,
          customer_id: customer.id,
          points_change: POINTS_PER_BOOKING,
          reason: 'dat_ban',
          booking_id: booking.id,
        });
      }
    } catch (e) {
      console.error('bookings: points award failed (booking kept):', e.message);
      customer = null;
      pointsAwarded = 0;
    }

    return res.status(200).json({
      success: true,
      booking,
      customer: customer
        ? { id: customer.id, phone: customer.phone, total_points: customer.total_points }
        : null,
      points_awarded: pointsAwarded,
    });
  } catch (e) {
    console.error('bookings error:', e.message);
    return res.status(500).json({ success: false, error: 'Lỗi máy chủ, chưa lưu được đặt bàn' });
  }
}

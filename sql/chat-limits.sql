-- sql/chat-limits.sql — Bảng đếm số câu hỏi chatbot nội bộ theo IP + venue + ngày.
-- Chạy 1 lần trong Supabase SQL Editor (project "303 garden", dùng chung cho Garden + Lumia).
-- KHÔNG lưu IP thô, chỉ lưu hash SHA-256 (ip_hash) để bảo vệ riêng tư.
-- Giới hạn: 20 câu/ngày/người (xem api/chat-limit.js).

create table if not exists public.chat_limits (
  ip_hash text not null,
  venue text not null,
  day date not null,
  count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (ip_hash, venue, day)
);

-- Giống Phase 1: phải GRANT cho service_role thì API route (dùng Service Role Key) mới đọc/ghi được.
grant select, insert, update, delete on public.chat_limits to service_role;
grant usage on schema public to service_role;

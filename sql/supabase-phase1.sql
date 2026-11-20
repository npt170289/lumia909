-- ============================================================
-- LUMIA 909 — PHASE 1: SUPABASE SCHEMA
-- Chạy file này trong Supabase Dashboard → SQL Editor → Run.
-- KHÔNG hardcode key trong code. Supabase URL + SERVICE_ROLE_KEY
-- đặt trong Vercel: Project Settings → Environment Variables
--   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
-- (dùng SERVICE_ROLE_KEY vì các API route chạy phía server, bypass RLS)
--
-- DB DÙNG CHUNG 2 quán trong cùng project: mọi bảng đều có cột venue
-- ('lumia909' cho quán này, giá trị còn lại cho quán kia) để phân biệt.
-- Customers định danh theo (phone, venue) — cùng một SĐT có thể là
-- khách của cả 2 quán mà không bị nhầm điểm.
-- ============================================================

-- 1. bookings — đặt bàn (Mr Thương xem lại + forward Zalo/Call)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue TEXT NOT NULL DEFAULT 'lumia909',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL,
  party_size INT NOT NULL,
  note TEXT,
  pi_points_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. chats — lịch sử chat để huấn luyện AI (không để trong RAM)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue TEXT NOT NULL DEFAULT 'lumia909',
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_reply TEXT NOT NULL,
  booking_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. customers — khách hàng, định danh bằng (SĐT, venue)
-- (pi_uid khi đăng nhập Pi)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue TEXT NOT NULL DEFAULT 'lumia909',
  phone TEXT NOT NULL,
  name TEXT,
  pi_uid TEXT,
  total_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone, venue)
);

-- 4. points_log — nhật ký cộng/trừ điểm (kiểm toán điểm thưởng)
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue TEXT NOT NULL DEFAULT 'lumia909',
  customer_id UUID REFERENCES customers(id),
  points_change INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('dat_ban', 'ghe_quan', 'doi_mon')),
  booking_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (chỉ những index KHÔNG dùng cột venue — index theo venue nằm ở
-- khối MIGRATION bên dưới, sau khi cột venue đã được thêm; nếu để ở đây
-- sẽ lỗi "column venue does not exist" vì bảng cũ chưa có cột này.)
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings (phone);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_session_id ON chats (session_id);
CREATE INDEX IF NOT EXISTS idx_points_log_customer_id ON points_log (customer_id);

-- Cấp quyền cho service_role (API server dùng key này để ghi vào bảng)
-- BẮT BUỘC: nếu thiếu GRANT, service_role sẽ bị lỗi 42501
-- "permission denied for table bookings" dù key đúng 100%.
-- (Bản gốc từng thiếu GRANT và gây lỗi 500 — bản này có sẵn.)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_log TO service_role;

-- Quy tắc điểm Phase 1: mỗi lần đặt bàn thành công = +10 điểm Pi
-- (cộng trong api/bookings.js, ghi vào points_log với reason = 'dat_ban')

-- ============================================================
-- MIGRATION — 4 bảng ĐÃ TỒN TẠI từ Garden 303 (chưa có cột venue).
-- Chạy toàn bộ file này MỘT LẦN trong SQL Editor.
-- Thứ tự đúng: thêm cột (nullable) → gắn venue cũ → đặt NOT NULL +
-- default → đổi unique → index + GRANT. (Bản trước để UPDATE trước
-- ADD COLUMN nên UPDATE sẽ lỗi vì chưa có cột venue; và default
-- 'lumia909' ở ADD COLUMN sẽ gán nhầm dữ liệu cũ thành Lumia.)
-- ============================================================
-- 1. Thêm cột venue (nullable trước, chưa đặt default):
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.points_log ADD COLUMN IF NOT EXISTS venue TEXT;

-- 2. Gắn venue cho dữ liệu cũ của Garden 303:
UPDATE public.bookings SET venue = 'garden303' WHERE venue IS NULL;
UPDATE public.chats SET venue = 'garden303' WHERE venue IS NULL;
UPDATE public.customers SET venue = 'garden303' WHERE venue IS NULL;
UPDATE public.points_log SET venue = 'garden303' WHERE venue IS NULL;

-- 3. Đặt NOT NULL + default 'lumia909' cho cột venue:
ALTER TABLE public.bookings ALTER COLUMN venue SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN venue SET DEFAULT 'lumia909';
ALTER TABLE public.chats ALTER COLUMN venue SET NOT NULL;
ALTER TABLE public.chats ALTER COLUMN venue SET DEFAULT 'lumia909';
ALTER TABLE public.customers ALTER COLUMN venue SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN venue SET DEFAULT 'lumia909';
ALTER TABLE public.points_log ALTER COLUMN venue SET NOT NULL;
ALTER TABLE public.points_log ALTER COLUMN venue SET DEFAULT 'lumia909';

-- 4. Đổi unique của customers từ phone sang (phone, venue):
-- (tên constraint cũ có thể khác — kiểm tra bằng:
--  SELECT conname FROM pg_constraint WHERE conrelid = 'public.customers'::regclass AND contype = 'u';)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_phone_venue_key') THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_phone_venue_key UNIQUE (phone, venue);
  END IF;
END $$;

-- 5. Index + GRANT cho bảng đã tồn tại (chạy lại cho chắc):
CREATE INDEX IF NOT EXISTS idx_bookings_venue ON public.bookings (venue);
CREATE INDEX IF NOT EXISTS idx_chats_venue ON public.chats (venue);
CREATE INDEX IF NOT EXISTS idx_customers_phone_venue ON public.customers (phone, venue);
CREATE INDEX IF NOT EXISTS idx_points_log_venue ON public.points_log (venue);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_log TO service_role;

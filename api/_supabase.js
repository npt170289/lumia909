// Supabase REST helper — Vercel serverless, KHÔNG thêm npm dependency.
// Dùng trực tiếp Supabase REST API qua fetch (không dùng @supabase/supabase-js).
// Key lấy từ biến môi trường Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// File bắt đầu bằng "_" nên Vercel KHÔNG coi là API route.
// Pi chỉ làm điểm thưởng — KHÔNG thanh toán, KHÔNG quy đổi, KHÔNG cấn trừ.
// Thanh toán chỉ VND (terms.html §2, privacy.html §3).

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables'
    );
  }
  return { url: url.replace(/\/$/, ''), key };
}

function headers(key, extra) {
  return Object.assign(
    {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    extra || {}
  );
}

async function supaFetch(path, options) {
  const { url, key } = getConfig();
  const res = await fetch(url + '/rest/v1/' + path, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.hint)) ||
      'Supabase error ' + res.status;
    throw new Error(String(msg));
  }
  return data;
}

// Insert một row, trả về row đã tạo (mảng 1 phần tử)
export async function supaInsert(table, row) {
  const { key } = getConfig();
  return supaFetch(table, {
    method: 'POST',
    headers: headers(key, { Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
}

// Select: query là chuỗi query string KHÔNG có dấu "?" đầu,
// ví dụ: "phone=eq.0399035303&select=id,phone,total_points&order=created_at.desc&limit=50"
export async function supaSelect(table, query) {
  const { key } = getConfig();
  return supaFetch(table + (query ? '?' + query : ''), {
    method: 'GET',
    headers: headers(key),
  });
}

// Upsert theo cột unique (onConflict, ví dụ "phone,venue").
// Chỉ cập nhật các cột có trong row, các cột khác giữ nguyên.
export async function supaUpsert(table, row, onConflict) {
  const { key } = getConfig();
  const q = onConflict ? '?on_conflict=' + encodeURIComponent(onConflict) : '';
  return supaFetch(table + q, {
    method: 'POST',
    headers: headers(key, {
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(row),
  });
}

// Update các row khớp filter (filter dạng "phone=eq.0399035303").
// Trả về các row đã cập nhật.
export async function supaUpdate(table, row, filter) {
  const { key } = getConfig();
  return supaFetch(table + '?' + filter, {
    method: 'PATCH',
    headers: headers(key, { Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
}

export function getSupabase() {
  return getConfig();
}

/* Lumia 909 — Garden Lounge | plain-JS app (no framework, no build step).
 * Renders header, hero, NOTTE clips, booking form, menu (19 groups),
 * gallery, footer and the 3-tier chatbot modal. Data comes from data/menu.json. */
(function () {
  "use strict";

  var HOTLINE = "0399 035 303";
  var HOTLINE_TEL = "tel:0399035303";
  var ADDRESS = "909 Trần Hưng Đạo, P. Chợ Quán";
  var ADDRESS_FULL = "909 Trần Hưng Đạo, P. Chợ Quán (Quận 5 cũ), TP.HCM";
  var HOURS = "17:00 - 03:00";
  var MAPS_URL = "https://www.google.com/maps/search/?api=1&query=909+Tr%E1%BA%A7n+H%C6%B0ng+%C4%90%E1%BA%A1o+Qu%E1%BA%ADn+5+TP.HCM";
  var PI_IFRAME_URL = "https://lumiarz2822.pinet.com";

  var root = document.getElementById("root");
  var menuData = null;
  var activeTab = 0;
  var piUser = null;
  var piStatus = "checking";
  var sessionId = "web-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

// Mã trình duyệt riêng cho giới hạn chat (20 câu/ngày). Lưu ở sessionStorage để mỗi
// trình duyệt/tab có quota riêng — tránh chặn nhầm khi nhiều khách dùng chung WiFi quán.
// Không dùng localStorage (theo quy tắc Phase 1: dữ liệu ở Supabase, không ở trình duyệt).
function getChatCid() {
  try {
    var k = "chat_cid";
    var cid = sessionStorage.getItem(k);
    if (!cid) {
      cid = "cid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(k, cid);
    }
    return cid;
  } catch (e) {
    return "cid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
}

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------------- header ---------------- */
  function renderHeader() {
    return el(
      '<header class="site"><div class="wrap header-in">' +
        '<div class="brand">' +
          '<div class="logo-tile grad-tile">909</div>' +
          '<div><div class="brand-name">LUMIA 909</div>' +
          '<div class="brand-sub">GARDEN LOUNGE</div></div>' +
        '</div>' +
        '<div class="header-right">' +
          '<span class="pill open-pill"><span class="dot"></span><span class="open-label">OPEN&nbsp;</span>17:00 - 03:00</span>' +
          '<a class="pill tel-pill" href="' + HOTLINE_TEL + '">' + HOTLINE + ' <small>/ Mr Thương</small></a>' +
        '</div>' +
      '</div></header>'
    );
  }

  /* ---------------- hero ---------------- */
  function renderHero() {
    var hero = el(
      '<section class="wrap"><div class="hero">' +
        '<div>' +
          '<span class="hero-badge">BEER GARDEN - VIP LOUNGE - HOT DJ &amp; DANCER - PR PRO</span>' +
          '<img class="hero-logo" src="public/images/hero-logo.jpg" alt="Lumia 909 Garden Lounge Logo">' +
          '<div class="hero-tagline">' +
            '<span class="tag-vn">TỔ HỢP GIẢI TRÍ VỀ ĐÊM ĐẲNG CẤP NHẤT CHỢ QUÁN</span>' +
            '<span class="tag-cn">CHỢ QUÁN最顶级的夜间娱乐综合体</span>' +
            '<span class="tag-en">THE PREMIER NIGHTLIFE ENTERTAINMENT COMPLEX IN CHỢ QUÁN</span>' +
          '</div>' +
          '<p class="hero-desc">Dancer, PR pro. ' +
          '<b>909 Trần Hưng Đạo, P. Chợ Quán</b> - <span class="hl">17:00 tới 03:00</span></p>' +
          '<div class="hero-pills">' +
            '<span class="pill">LIVE GARDEN</span><span class="pill">BEER TOWER</span><span class="pill">OPEN</span>' +
          '</div>' +
          '<div class="hero-actions">' +
            '<button type="button" class="btn btn-chat" data-open-chat style="padding:12px 18px;font-size:10px;">💬 AI Tư vấn và đặt bàn</button>' +
            '<a class="btn btn-book" href="#dat-ban" style="padding:12px 20px;font-size:10px;">Đặt bàn VIP</a>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="photo-grid">' +
            '<div class="photo photo-top">' +
              '<img src="public/images/hero-customers.jpg" alt="Lumia Garden Customers">' +
            '</div>' +
            '<div class="photo photo-bl"><img src="public/images/hero-lounge.jpg" alt="909 Lounge"></div>' +
            '<div class="photo photo-br"><img src="public/images/hero-guests.webp" alt="Khach hang 909"></div>' +
          '</div>' +
          '<div class="info-cards">' +
            '<div class="card info-card"><div class="k">HOTLINE</div><div class="v">' + HOTLINE + '<small>Mr Thương</small></div></div>' +
            '<div class="card info-card"><div class="k">ADDRESS</div><div class="v">909 Trần Hưng Đạo<small>P. Chợ Quán</small></div></div>' +
            '<div class="card info-card"><div class="k">OPEN</div><div class="v">17:00 - 03:00<small>Hàng ngày</small></div></div>' +
          '</div>' +
        '</div>' +
      '</div></section>'
    );
    return hero;
  }

  /* ---------------- NOTTE / LIVE CLIPS ----------------
   * Clips are VERTICAL (405x720, ~5s, silent) — portrait 9/16 cards so they
   * display fully instead of being cropped by a landscape card. */
  function renderNotte() {
    var colors = ["#a855f7", "#ef4444", "#d4af37"];
    var cards = [1, 2, 3].map(function (n, i) {
      return '<div class="clip-card" style="border-color:' + colors[i] + '55">' +
        '<video src="public/videos/notte-' + n + '.mp4" muted loop autoplay playsinline preload="metadata"></video>' +
      '</div>';
    }).join("");
    return el(
      '<section class="wrap" id="live"><div class="notte-grid">' + cards + '</div></section>'
    );
  }

  /* ---------------- CLIP FULL ----------------
   * Full clips (clipfulllumia01-05) are VERTICAL like NOTTE — portrait 9/16
   * cards so they fill the card instead of pillarboxing in a 16/9 card.
   * Placed right after NOTTE so all videos sit together. */
  function renderFullClips() {
    var colors = ["#a855f7", "#ef4444", "#d4af37", "#22c55e", "#38bdf8"];
    var cards = [1, 2, 3, 4, 5].map(function (n, i) {
      return '<div class="fullclip-card" style="border-color:' + colors[i] + '55">' +
        '<video src="public/videos/clipfulllumia0' + n + '.mp4" muted loop autoplay playsinline preload="metadata"></video>' +
      '</div>';
    }).join("");
    return el(
      '<section class="wrap" id="clip-full"><div class="fullclip-grid">' + cards + '</div></section>'
    );
  }

  /* ---------------- booking ---------------- */
  function renderBooking() {
    var sec = el(
      '<section class="wrap" id="dat-ban"><div class="booking-card">' +
        '<div class="booking-head">' +
          '<h2 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">ĐẶT BÀN VIP - <span class="grad-text-offer">Tặng 200 Pi</span> <span class="hot-pill">HOT</span></h2>' +
          '<div class="booking-hotline">Hotline đặt bàn: <a class="btn tel-btn" href="' + HOTLINE_TEL + '">' + HOTLINE + '</a></div>' +
        '</div>' +
        '<div class="sec-sub" style="margin:0 0 4px;">VIP BOOKING • 预订贵宾桌</div>' +
        '<div class="booking-cols">' +
          '<div class="card pi-card" id="pi-card"></div>' +
          '<div class="card form-card">' +
            '<h3>Đặt bàn VIP</h3>' +
            '<form id="booking-form" novalidate>' +
              '<div class="field"><label for="bk-name">Tên quý khách</label>' +
              '<input id="bk-name" name="name" type="text" required autocomplete="name" placeholder="Tên của bạn"></div>' +
              '<div class="field"><label for="bk-phone">Số điện thoại</label>' +
              '<input id="bk-phone" name="phone" type="tel" required autocomplete="tel" placeholder="09xx xxx xxx"></div>' +
              '<div class="field"><label for="bk-party">Số người</label>' +
              '<input id="bk-party" name="party_size" type="number" min="1" value="2" required></div>' +
              '<div class="field"><label for="bk-time">Ngày/giờ đến</label>' +
              '<input id="bk-time" name="time" type="datetime-local" required></div>' +
              '<div class="field"><label for="bk-note">Ghi chú</label>' +
              '<input id="bk-note" name="note" type="text" placeholder="Ví dụ: sinh nhật, khu vực ngoài trời..."></div>' +
              '<button type="submit" class="btn submit-btn" id="bk-submit">Đặt bàn VIP</button>' +
            '</form>' +
            '<div id="bk-result"></div>' +
          '</div>' +
        '</div>' +
      '</div></section>'
    );
    return sec;
  }

  function renderPiCard() {
    var card = document.getElementById("pi-card");
    if (!card) return;
    var pillClass = piStatus === "ready" ? "status-ready" : (piStatus === "checking" ? "status-checking" : "status-web");
    var pillText = piStatus === "ready" ? "READY" : (piStatus === "checking" ? "CHECKING" : "WEB");
    var body;
    if (piUser) {
      body = '<p class="pi-body">Hi ' + esc(piUser.username || "bạn") + ' 👋<br>' +
        'Đặt bàn VIP qua Pi để nhận ưu đãi Tặng 200 Pi ạ. Mr Thương ' + HOTLINE + ' sẽ liên hệ xác nhận.</p>';
    } else {
      body = '<button type="button" class="pi-login-btn" id="pi-login-btn">LOGIN WITH PI BROWSER</button>';
    }
    card.innerHTML =
      '<div class="pi-head"><div class="pi-icon">π</div><h3 style="margin:0;">PI NETWORK</h3>' +
      '<span class="status-pill ' + pillClass + '">' + pillText + '</span></div>' + body;
    var btn = document.getElementById("pi-login-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.textContent = "ĐANG KẾT NỐI...";
        var auth = window.LumiaPiAuth ? window.LumiaPiAuth() : Promise.resolve(null);
        auth.then(function (user) {
          if (user) { piUser = user; piStatus = "ready"; }
          else { piStatus = "not-pi"; }
          renderPiCard();
        }).catch(function () { piStatus = "not-pi"; renderPiCard(); });
      });
    }
  }

  function bindBookingForm() {
    var form = document.getElementById("booking-form");
    var submit = document.getElementById("bk-submit");
    var result = document.getElementById("bk-result");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("bk-name").value.trim();
      var phone = document.getElementById("bk-phone").value.trim();
      var partySize = parseInt(document.getElementById("bk-party").value, 10);
      var time = document.getElementById("bk-time").value;
      var note = document.getElementById("bk-note").value.trim();
      if (!name || !phone || !partySize || partySize < 1 || !time) {
        result.innerHTML = '<div class="error-box">Dạ quý khách vui lòng điền đủ tên, số điện thoại, số người và ngày/giờ đến ạ.</div>';
        return;
      }
      submit.disabled = true;
      submit.textContent = "Đang ghi nhận...";
      result.innerHTML = "";
      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, phone: phone, party_size: partySize, time: time, note: note || null })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        submit.disabled = false;
        submit.textContent = "Đặt bàn VIP";
        if (res.ok && res.d && res.d.booking) {
          var b = res.d.booking;
          var lines = "Cảm ơn " + b.name + "! Đã ghi nhận đặt bàn.\n" +
            "• Số người: " + b.party_size + "\n" +
            "• SĐT: " + b.phone + "\n" +
            "• Ngày/giờ: " + fmtTime(b.time);
          if (b.note) lines += "\n• Ghi chú: " + b.note;
          lines += "\nBạn được +10 điểm Pi. Mr Thương " + HOTLINE + " sẽ liên hệ xác nhận.";
          result.innerHTML = '<div class="confirm-box">' + esc(lines) + '</div>';
          form.reset();
          document.getElementById("bk-party").value = "2";
        } else {
          var msg = (res.d && (res.d.error || res.d.message)) || "Đặt bàn chưa thành công, quý khách vui lòng thử lại hoặc gọi " + HOTLINE + " ạ.";
          result.innerHTML = '<div class="error-box">' + esc(msg) + '</div>';
        }
      }).catch(function () {
        submit.disabled = false;
        submit.textContent = "Đặt bàn VIP";
        result.innerHTML = '<div class="error-box">Kết nối chưa thành công, quý khách vui lòng thử lại hoặc gọi ' + HOTLINE + ' (Mr Thương) ạ.</div>';
      });
    });
  }

  /* ---------------- menu ---------------- */
  function renderMenu() {
    var sec = el(
      '<section class="wrap" id="menu"><div class="sec-head">' +
        '<div><h2>MENU</h2><div class="sec-sub">菜单</div><div class="grad-div"></div></div>' +
        '<span class="sec-note" style="display:none;" id="menu-right-label">● BEER TOWER - COCKTAIL 3L - RƯỢU MẠNH</span>' +
      '</div>' +
      '<div class="tabs" id="menu-tabs"></div>' +
      '<div class="dish-grid" id="dish-grid"></div>' +
      '<div class="price-note"><span class="bang">!</span><span>Giá thay đổi tùy diễn biến thị trường. Giá chưa gồm VAT — vui lòng xác nhận khi đặt bàn qua ' + HOTLINE + ' (Mr Thương).</span></div>' +
      '</section>'
    );
    return sec;
  }

  function renderTabs() {
    var tabs = document.getElementById("menu-tabs");
    if (!tabs || !menuData) return;
    tabs.innerHTML = "";
    menuData.categories.forEach(function (cat, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab-btn" + (i === activeTab ? " active" : "");
      b.innerHTML = esc(cat.name) + ' <span class="count">' + cat.items.length + '</span>';
      b.addEventListener("click", function () { activeTab = i; renderTabs(); renderDishes(); });
      tabs.appendChild(b);
    });
    var label = document.getElementById("menu-right-label");
    if (label && window.innerWidth >= 768) label.style.display = "";
  }

  function renderDishes() {
    var grid = document.getElementById("dish-grid");
    if (!grid || !menuData) return;
    var cat = menuData.categories[activeTab];
    if (!cat) { grid.innerHTML = ""; return; }
    grid.innerHTML = "";
    var lastSub = null;
    cat.items.forEach(function (item) {
      // subsection (e.g. TÔM CÀNG XANH / TÔM SÚ / TÔM HÙM BABY inside MÓN TÔM)
      if (item.subsection && item.subsection !== lastSub) {
        lastSub = item.subsection;
        var sub = document.createElement("div");
        sub.className = "dish-sub";
        sub.textContent = item.subsection;
        grid.appendChild(sub);
      }
      var card = document.createElement("div");
      card.className = "card dish-card";
      var nameHtml = '<div class="dish-name">' + esc(item.name) + '</div>';
      if (item.base) nameHtml += '<div class="dish-base">' + esc(item.base) + '</div>';
      card.innerHTML = '<div style="min-width:0;">' + nameHtml + '</div>' +
        '<span class="price-pill">' + esc(item.price) + '</span>';
      grid.appendChild(card);
    });
  }

  /* ---------------- gallery ---------------- */
  function renderGallery() {
    var photos = [
      { src: "public/images/hero-logo.jpg", alt: "Lumia 909 Garden Lounge Logo" },
      { src: "public/images/hero-customers.jpg", alt: "Lumia Garden Customers" },
      { src: "public/images/hero-lounge.jpg", alt: "909 Lounge" },
      { src: "public/images/hero-guests.webp", alt: "Khach hang 909" },
      { src: "public/images/piclumia01.jpg", alt: "Lumia 909 - Khoanh khac 01" },
      { src: "public/images/piclumia04.jpg", alt: "Lumia 909 - Khoanh khac 04" },
      { src: "public/images/piclumia05.jpg", alt: "Lumia 909 - Khoanh khac 05" },
      { src: "public/images/piclumia06.jpg", alt: "Lumia 909 - Khoanh khac 06" },
      { src: "public/images/piclumia07.jpg", alt: "Lumia 909 - Khoanh khac 07" },
      { src: "public/images/piclumia08.jpg", alt: "Lumia 909 - Khoanh khac 08" },
      { src: "public/images/piclumia10.jpg", alt: "Lumia 909 - Khoanh khac 10" }
    ];
    var items = photos.map(function (p) {
      return '<div class="gallery-item"><img src="' + p.src + '" alt="' + esc(p.alt) + '" loading="lazy"></div>';
    }).join("");
    return el(
      '<section class="wrap"><div class="sec-head">' +
        '<div><h2>KHOẢNH KHẮC 909</h2><div class="sec-sub">MOMENTS • 精彩瞬间</div><div class="grad-div"></div></div>' +
      '</div><div class="gallery-grid">' + items + '</div></section>'
    );
  }

  /* ---------------- footer ---------------- */
  function renderFooter() {
    return el(
      '<footer class="site"><div class="wrap"><div class="foot-grid">' +
        '<div>' +
          '<div class="foot-brand"><img class="foot-logo" src="public/images/hero-logo.jpg" alt="logo small">' +
          '<div><div class="brand-name">LUMIA 909 - GARDEN LOUNGE</div>' +
          '<div class="brand-sub">BEER GARDEN - VIP LOUNGE - HOT DJ &amp; DANCER</div></div></div>' +
          '<div class="foot-welcome">' +
            '<p class="welcome-vn">Chào mừng Quý Công ty, Đơn vị, Cá nhân đến với 909 Lumina Garden Lounge! 🌿✨<br>Bar - Lounge - VIP giữa rừng nhiệt đới, DJ - Dancer cực cháy tại 909 Trần Hưng Đạo, P. Chợ Quán.<br>Đặt bàn đêm nay: Mr Thương - 0399 035 303 (17:00 - 03:00) 🔥</p>' +
            '<p class="welcome-en">Welcome Companies, Organizations &amp; Individuals to 909 Lumina Garden Lounge! 🌿✨<br>VIP Bar - Lounge in tropical garden vibe, DJ - Dancer on fire at 909 Tran Hung Dao, Cho Quan Ward.<br>Book tonight: Mr Thuong - 0399 035 303 (17:00 - 03:00) 🔥</p>' +
            '<p class="welcome-cn">欢迎各公司、单位及个人光临 909 Lumina Garden Lounge! 🌿✨<br>热带雨林风情的 VIP 酒吧 Lounge，DJ - Dancer 热辣全场，地址：陈兴道909号。<br>今晚订位：Mr Thuong - 0399 035 303 (17:00 - 03:00) 🔥</p>' +
          '</div>' +
          '<div class="foot-chips"><span class="pill">909 Trần Hưng Đạo, P. Chợ Quán</span><span class="pill">17:00 - 03:00</span></div>' +
        '</div>' +
        '<div><div class="foot-h">HOTLINE</div>' +
          '<a class="foot-hotline" href="' + HOTLINE_TEL + '">' + HOTLINE + '</a>' +
          '<div class="foot-hotline-sub">Mr Thương - Đặt bàn VIP</div>' +
          '<span class="offer-pill grad-tile">TẶNG 200 PI</span>' +
        '</div>' +
        '<div><div class="foot-h">MAP</div>' +
          '<p class="foot-map">909 Trần Hưng Đạo<br>Quận 5 (cũ) - TP.HCM<br>Gần cầu Nguyễn Văn Cừ, gửi xe rộng</p>' +
          '<a class="btn map-btn" href="' + MAPS_URL + '" target="_blank" rel="noopener noreferrer">Chỉ đường tới Lumia 909 ↗</a>' +
        '</div>' +
      '</div></div>' +
      '<div class="bottom-bar">© 2026 LUMIA 909 - GARDEN LOUNGE &nbsp;·&nbsp; <a href="privacy.html" style="color:rgba(255,255,255,.65);text-decoration:underline">Privacy Policy</a> &nbsp;·&nbsp; <a href="terms.html" style="color:rgba(255,255,255,.65);text-decoration:underline">Terms of Service</a></div></footer>'
    );
  }

  /* ---------------- chatbot ---------------- */
  // Nhận diện ngôn ngữ khách gõ: cn (chữ Hán), en (từ khóa tiếng Anh), vi (mặc định).
  function detectLang(q) {
    var s = q || "";
    if (/[\u4e00-\u9fff]/.test(s)) return "cn";
    var lower = s.toLowerCase();
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(lower)) return "vi";
    if (/\b(dat ban|dia chi|thuc don|mo cua|thanh toan|o dau)\b/.test(lower)) return "vi";
    if (/\b(menu|booking|book|address|open|hours|price|vip|hello|hi|hey|table|reservation|how|what|where|when|pay|payment)\b/.test(lower)) return "en";
    return "vi";
  }

  function T(q) {
    // Chatbot thông minh (intent + tra menu thật). Build 1 lần từ menuData (tự đếm từ menu).
    if (!window.__LumiaSmartBot && window.ChatbotIntent && menuData) {
      var __menu = [];
      var __cats = [];
      menuData.categories.forEach(function (c) {
        __cats.push({ name: c.name, count: c.items.length });
        c.items.forEach(function (it) {
          __menu.push({ name: it.name, price: it.price == null ? "" : String(it.price), category: c.name });
        });
      });
      window.__LumiaSmartBot = window.ChatbotIntent.create({
        venueName: "Lumia 909",
        contactName: "Mr Thương",
        hotline: HOTLINE,
        address: ADDRESS_FULL,
        hours: HOURS,
        totalDishes: __menu.length,
        categories: __cats,
        menu: __menu,
        piReply: "Dạ Pi Network: đặt bàn VIP được Tặng 200 Pi ạ. Thanh toán tại quán chỉ dùng VND. Pi chỉ là ưu đãi, không phải thanh toán ạ.",
        parkingReply: "Dạ có chỗ gửi xe rộng ạ, gần cầu Nguyễn Văn Cừ. Quý khách cứ tới, nhân viên sẽ hướng dẫn ạ.",
        giftText: "tặng 200 Pi",
      });
    }
    if (window.__LumiaSmartBot) return window.__LumiaSmartBot.reply(q);
    // Fallback nếu menu chưa load kịp: câu trả lời chung (không bịa).
    var lang = detectLang(q);
    if (lang === "cn") return "需要什么帮助？需要菜单、预订贵宾桌还是地址和营业时间？";
    if (lang === "en") return "How can I help? Do you need the menu, VIP booking, or address & hours?";
    return "Dạ em hiểu rồi ạ. Các bạn cần hỗ trợ thêm về menu, đặt bàn VIP hay địa chỉ giờ mở cửa ạ?";
  }

  function openChat() {
    if (document.getElementById("chat-modal")) return;
    var modal = el(
      '<div class="modal-backdrop" id="chat-modal">' +
        '<div class="modal" role="dialog" aria-label="AI Tư vấn và đặt bàn">' +
          '<div class="modal-head"><div class="pi-icon" style="width:32px;height:32px;font-size:12px;">💬</div>' +
          '<span class="t">AI Tư vấn và đặt bàn</span>' +
          '<button type="button" class="modal-close" id="chat-close" aria-label="Đóng">✕</button></div>' +
          '<div class="chat-tabs">' +
            '<button type="button" class="chat-tab active" id="tab-internal">Nội bộ 3 tầng</button>' +
            '<button type="button" class="chat-tab" id="tab-iframe">AI Iframe</button>' +
          '</div>' +
          '<div class="chat-body" id="chat-body"></div>' +
          '<div class="quick-chips" id="chat-chips">' +
            '<button type="button" data-q="menu">Xem menu</button>' +
            '<button type="button" data-q="đặt bàn">Đặt bàn VIP</button>' +
            '<button type="button" data-q="địa chỉ">Địa chỉ &amp; giờ mở cửa</button>' +
          '</div>' +
          '<div class="chat-input-row"><input id="chat-input" type="text" placeholder="Nhắn tin cho Lumia 909..." autocomplete="off">' +
          '<button type="button" class="btn chat-send" id="chat-send">Gửi</button></div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(modal);

    var body = document.getElementById("chat-body");
    var input = document.getElementById("chat-input");
    var chips = document.getElementById("chat-chips");
    var inputRow = modal.querySelector(".chat-input-row");
    var greeting = "Các bạn cần hỗ trợ gì ạ? Ẩm thực đa dạng món Á-Âu chuẩn vị. Gõ \"menu\" để xem thực đơn, \"đặt bàn\" để đặt VIP, \"địa chỉ\" để xem thông tin.\nHow can I help? Diverse Asian-European cuisine, authentic flavors. Type \"menu\" / \"booking\" / \"address\".\n需要什么帮助？亚欧美食，种类丰富，地道风味。输入\"menu\" / \"booking\" / \"address\"。";

    function addMsg(text, who) {
      var m = document.createElement("div");
      m.className = "msg " + who;
      m.textContent = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }
    function ask(q) {
      var userQ = (q || "").trim();
      if (!userQ) return;
      addMsg(userQ, "user");
      var reply = T(userQ);
      setTimeout(function () {
        // Giới hạn 20 câu/ngày/người (theo trình duyệt, qua /api/chat-limit). Lỗi -> cho qua (fail open).
        fetch("/api/chat-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venue: "lumia909", cid: getChatCid() })
        }).then(function (r) { return r.ok ? r.json() : { allowed: true }; })
          .catch(function () { return { allowed: true }; })
          .then(function (d) {
            var allowed = d.allowed !== false;
            if (!allowed) {
              var lang = detectLang(userQ);
              reply = lang === "cn" ? "您今天已经问了20个问题，请致电 Mr Thương 0399 035 303，工作人员会继续帮您。"
                : lang === "en" ? "You've asked 20 questions today. Please call Mr Thương 0399 035 303 and our staff will help you further."
                : "Dạ quý khách đã hỏi đủ 20 câu hôm nay rồi ạ. Quý khách gọi Mr Thương 0399 035 303 để nhân viên hỗ trợ tiếp nhé.";
            }
            addMsg(reply, "bot");
            if (allowed && window.LumiaChatLog) window.LumiaChatLog(sessionId, userQ, reply);
          });
      }, 400);
    }
    addMsg(greeting, "bot");

    document.getElementById("chat-send").addEventListener("click", function () { ask(input.value); input.value = ""; input.focus(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { ask(input.value); input.value = ""; } });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-q]");
      if (b) ask(b.getAttribute("data-q"));
    });

    document.getElementById("tab-internal").addEventListener("click", function () {
      document.getElementById("tab-internal").classList.add("active");
      document.getElementById("tab-iframe").classList.remove("active");
      var frame = document.getElementById("chat-iframe-el");
      if (frame) frame.remove();
      body.style.display = "";
      chips.style.display = "";
      inputRow.style.display = "";
    });
    document.getElementById("tab-iframe").addEventListener("click", function () {
      document.getElementById("tab-iframe").classList.add("active");
      document.getElementById("tab-internal").classList.remove("active");
      body.style.display = "none";
      chips.style.display = "none";
      inputRow.style.display = "none";
      if (!document.getElementById("chat-iframe-el")) {
        var frame = document.createElement("iframe");
        frame.id = "chat-iframe-el";
        frame.className = "chat-iframe";
        frame.src = PI_IFRAME_URL;
        frame.title = "Lumia 909 Chatbot";
        modal.querySelector(".modal").appendChild(frame);
      }
    });

    function close() { modal.remove(); }
    document.getElementById("chat-close").addEventListener("click", close);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function escClose(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", escClose); }
    });
    input.focus();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    root.appendChild(renderHeader());
    root.appendChild(renderHero());
    root.appendChild(renderNotte());
    root.appendChild(renderFullClips());
    root.appendChild(renderBooking());
    root.appendChild(renderMenu());
    root.appendChild(renderGallery());
    root.appendChild(renderFooter());

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-open-chat]");
      if (b) openChat();
    });

    // Pi status (silent; no debug chips shown to customers)
    if (window.LumiaPiStatus) {
      var st = window.LumiaPiStatus();
      piStatus = st === "ready" ? "ready" : (st === "checking" ? "checking" : "not-pi");
    } else {
      piStatus = /PiBrowser/i.test(navigator.userAgent) ? "checking" : "not-pi";
    }
    renderPiCard();
    bindBookingForm();

    fetch("data/menu.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        menuData = data;
        renderTabs();
        renderDishes();
      })
      .catch(function () {
        var grid = document.getElementById("dish-grid");
        if (grid) grid.innerHTML = '<div class="error-box" style="grid-column:1/-1;">Menu đang được cập nhật, quý khách vui lòng gọi ' + HOTLINE + ' (Mr Thương) để được tư vấn ạ.</div>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

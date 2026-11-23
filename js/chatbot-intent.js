/* chatbot-intent.js — Não intent dùng chung cho Chatbot nội bộ Garden 303 + Lumia 909.
 * Plain JS, không dependency, chạy được ở mọi trang. KHÔNG gọi API, KHÔNG tốn token.
 * Chỉ trả lời từ dữ liệu thật của quán (menu, giá, địa chỉ, giờ mở cửa). Không bịa.
 * Không biết -> nói để nhân viên liên hệ (kèm hotline). Trả lời ngắn 2-3 câu.
 *
 * Cách dùng:
 *   var bot = ChatbotIntent.create({
 *     venueName: "303 Garden Station",
 *     contactName: "Mr Thành",
 *     hotline: "0971363121",
 *     address: "303 Phạm Văn Đồng, P. Hạnh Thông, Gò Vấp",
 *     hours: "17:00 - 03:00",
 *     totalDishes: 308,
 *     categories: [{ name: "Gà Tre", count: 9 }, ...],
 *     menu: [{ name: "Gà Tre Hấp Lá Chanh", price: "319K", category: "Gà Tre" }, ...],
 *     piReply: "...",        // câu trả lời riêng cho Pi/thanh toán (từng quán khác nhau)
 *     parkingReply: "...",   // câu trả lời chỗ đậu xe; null = chưa có dữ liệu -> bot nói không biết
 *     giftText: "tặng 200 Pi"  // dạng ngắn, dùng trong câu "Đặt bàn VIP được tặng 200 Pi ạ."
 *   });
 *   bot.reply("Tối nay 6 người còn bàn không?")  -> string (2-3 câu)
 */
(function (global) {
  "use strict";

  /* ---------- helpers ---------- */
  function stripDiacritics(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  }
  function norm(s) {
    return stripDiacritics(String(s || "").toLowerCase());
  }
  function wordsOf(s) {
    return norm(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  }

  function detectLang(q) {
    var s = q || "";
    if (/[一-鿿]/.test(s)) return "cn";
    var lower = s.toLowerCase();
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(lower)) return "vi";
    if (/\b(dat ban|dia chi|thuc don|mo cua|thanh toan|o dau|con ban|het ban|dau xe|do xe|gui xe|toi nay)\b/.test(lower)) return "vi";
    if (/\b(menu|booking|book|address|open|hours|price|vip|hello|hi|hey|table|reservation|how|what|where|when|pay|payment|do|does|is|are|can|could|you|we|have|has|there|any|please)\b/.test(lower)) return "en";
    return "vi";
  }

  // Số người: "6 người" -> 6 ; "sáu người" -> 6 ; "for 8 people" -> 8 ; "for 8" -> 8.
  var NUM_WORDS = { mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10 };
  function extractPartySize(qn) {
    var m = qn.match(/(\d{1,2})\s*nguoi/);
    if (m) return parseInt(m[1], 10);
    m = qn.match(/(\d{1,2})\s*(people|person|pax|guests?)\b/);
    if (m) return parseInt(m[1], 10);
    m = qn.match(/\bfor\s+(\d{1,2})\b/);
    if (m) return parseInt(m[1], 10);
    var w = wordsOf(qn);
    for (var i = 0; i < w.length; i++) {
      if (NUM_WORDS[w[i]] && w[i + 1] === "nguoi") return NUM_WORDS[w[i]];
    }
    return 0;
  }

  // Thời điểm: trả về mã trung tính ("tonight" | "afternoon" | "H:7") để render theo ngôn ngữ.
  function extractTimeRef(qn) {
    if (/\btoi nay\b/.test(qn) || /\btonight\b/.test(qn) || /\btoi\b/.test(qn)) return "tonight";
    if (/\bchieu nay\b/.test(qn) || /\bchieu\b/.test(qn)) return "afternoon";
    var m = qn.match(/(\d{1,2})\s*(h|gio)\b/);
    if (m) return "H:" + m[1];
    return "";
  }
  function timeRefText(code, lang) {
    if (!code) return "";
    if (code === "tonight") return lang === "cn" ? "今晚" : (lang === "en" ? "tonight" : "tối nay");
    if (code === "afternoon") return lang === "cn" ? "今天下午" : (lang === "en" ? "this afternoon" : "chiều nay");
    if (code.indexOf("H:") === 0) return lang === "cn" ? code.slice(2) + "点" : (lang === "en" ? "at " + code.slice(2) : code.slice(2) + " giờ");
    return "";
  }

  /* ---------- menu search ---------- */
  // Từ dừng (không mang nghĩa món ăn) — bỏ khi trích từ khóa tìm món. Gồm cả VI + EN.
  var STOP = {};
  ["co", "khong", "k", "gia", "bao", "nhieu", "tien", "cho", "em", "anh", "chi", "quy", "khach", "muon", "xem", "la", "gi", "nao", "voi", "va", "o", "dau", "may", "gio", "mo", "cua", "dat", "ban", "vip", "menu", "thuc", "don", "an", "uong", "ton", "nay", "chieu", "toi", "nguoi", "hoi", "biet", "duoc", "ca", "the", "a", "oi", "nha", "het", "con", "mon",
   "do", "you", "have", "is", "there", "are", "can", "could", "i", "we", "the", "an", "any", "what", "how", "does", "please", "for", "tonight", "would", "like", "to", "me", "my", "us", "it", "this", "that", "and", "or", "of", "on", "in", "at", "book", "table", "hi", "hello", "hey",
   "ngon", "tuoi", "ngonnhat", "dacsan"].forEach(function (w) { STOP[w] = true; });

  // Từ đồng nghĩa / dịch EN-VN cho tìm món (2 chiều). VD "bia" <-> "beer", "hotpot" <-> "lẩu".
  var SYN = {
    bia: ["beer"], beer: ["bia"],
    hotpot: ["lau"], lau: ["hotpot"],
    ruou: ["wine", "soju"], wine: ["ruou"], soju: ["ruou"],

    ga: ["chicken"], chicken: ["ga"],
    bo: ["beef"], beef: ["bo"],
    heo: ["pork"], pork: ["heo"],
    ca: ["fish"], fish: ["ca"],
    tom: ["shrimp", "prawn"], shrimp: ["tom"], prawn: ["tom"],
    muc: ["squid"], squid: ["muc"],
    com: ["rice"], rice: ["com"],
    mi: ["noodle", "noodles"], noodle: ["mi"], noodles: ["mi"]
  };
  function expandWord(w) {
    var out = [w];
    if (SYN[w]) out = out.concat(SYN[w]);
    return out;
  }

  // Từ khóa chỉ khớp theo NHÓM món (không khớp tên món) — tránh "chay" (chay tịnh)
  // khớp nhầm "cháy" (áp chảo) vì sau khi bỏ dấu 2 từ này giống nhau.
  var CAT_ALIAS = { chay: ["rau"] };

  function buildIndex(menu) {
    return (menu || []).map(function (d) {
      var name = String(d.name || "");
      var cat = String(d.category || "");
      return {
        name: name,
        price: String(d.price == null ? "" : d.price),
        category: cat,
        nameN: norm(name),
        catN: norm(cat)
      };
    });
  }

  // Tìm món theo câu hỏi. Trả về tối đa 3 món khớp nhất.
  function searchMenu(idx, qn) {
    var qw = wordsOf(qn).filter(function (w) { return !STOP[w] && w.length > 1; });
    if (!qw.length) return [];
    var scored = [];
    for (var i = 0; i < idx.length; i++) {
      var d = idx[i], score = 0;
      for (var j = 0; j < qw.length; j++) {
        var w = qw[j];
        // CAT_ALIAS: từ khóa chỉ khớp theo NHÓM (vd "chay" -> nhóm "rau"), KHÔNG khớp tên món.
        if (CAT_ALIAS[w]) {
          for (var ka = 0; ka < CAT_ALIAS[w].length; ka++) {
            if (d.catN.indexOf(CAT_ALIAS[w][ka]) !== -1) { score += 2; break; }
          }
          continue;
        }
        var terms = expandWord(w);
        for (var k = 0; k < terms.length; k++) {
          var t = terms[k];
          if (t.length < 2) continue;
          if (d.nameN.indexOf(t) === 0) { score += 3; break; } // tên món BẮT ĐẦU bằng từ khóa
          if (d.nameN.indexOf(t) !== -1) { score += 2; break; }
          if (d.catN.indexOf(t) !== -1) { score += 1; break; }
        }
      }
      // Khớp nguyên cụm tên món (vd "lau thai" trong "Lẩu Thái Hải Sản") -> cộng mạnh.
      if (qw.length > 1 && d.nameN.indexOf(qw.join(" ")) !== -1) score += 3;
      if (score > 0) scored.push({ d: d, score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 3).map(function (x) { return x.d; });
  }

  // Có phải câu hỏi về món ăn không (để phân biệt "không tìm thấy món" vs fallback chung).
  function looksFoodRelated(qn) {
    return /\b(an|mon|lau|ga|ca|tom|muc|bo|heo|com|mi|mien|chao|combo|bia|beer|ruou|wine|cocktail|drink|hai san|dong que|rau|goi|salad|oc|ngheu|so|vem|trung hoa|alcaf|fusion|hotpot|chay)\b/.test(qn);
  }

  /* ---------- reply templates ---------- */
  function fmtPrice(p) {
    var s = String(p == null ? "" : p).trim();
    if (!s || /^ttg$/i.test(s)) return "theo thời giá";
    return s;
  }
  function dishLine(d) {
    return d.name + " " + fmtPrice(d.price);
  }

  function create(cfg) {
    var venueName = cfg.venueName || "";
    var contactName = cfg.contactName || "";
    var hotline = cfg.hotline || "";
    var address = cfg.address || "";
    var hours = cfg.hours || "";
    var totalDishes = cfg.totalDishes || 0;
    var categories = cfg.categories || [];
    var idx = buildIndex(cfg.menu || []);
    var piReply = cfg.piReply || "";
    var parkingReply = cfg.parkingReply || null; // null = chưa có dữ liệu
    var giftText = cfg.giftText || "tặng 200 Pi";

    function catList(lang) {
      var unit = lang === "cn" ? "道" : (lang === "en" ? " dishes" : " món");
      return categories.map(function (c) { return c.name + " " + c.count + unit; }).join(", ");
    }
    function menuOverview(lang) {
      if (lang === "cn") return "本店菜单有" + totalDishes + "道菜，" + categories.length + "个类别：" + catList("cn") + "。您想看哪个类别？";
      if (lang === "en") return "Our menu has " + totalDishes + " dishes in " + categories.length + " groups: " + catList("en") + ". Which group would you like to see?";
      return "Dạ menu " + venueName + " có " + totalDishes + " món, " + categories.length + " nhóm ạ: " + catList("vi") + ". Quý khách muốn xem nhóm nào ạ?";
    }
    function notFound(lang) {
      if (lang === "cn") return "菜单上没有找到这道菜，请致电" + contactName + " " + hotline + "咨询。";
      if (lang === "en") return "I couldn't find that dish on our menu. Please call " + contactName + " " + hotline + " and our staff will help.";
      return "Dạ em tìm trong menu không thấy món đó ạ. Quý khách gọi " + contactName + " " + hotline + " để nhân viên tư vấn thêm nhé.";
    }
    function fallback(lang) {
      if (lang === "cn") return "我还不太明白，请致电" + contactName + " " + hotline + "，工作人员会马上帮您。";
      if (lang === "en") return "I'm not sure I understood. Please call " + contactName + " " + hotline + " and our staff will help you right away.";
      return "Dạ em chưa hiểu rõ ý quý khách ạ. Quý khách gọi " + contactName + " " + hotline + " để nhân viên hỗ trợ ngay nhé.";
    }

    function reply(q) {
      var lang = detectLang(q);
      var s = String(q || "").toLowerCase();
      var qn = norm(q); // không dấu, chữ thường
      var has = function () {
        for (var i = 0; i < arguments.length; i++) {
          if (qn.indexOf(arguments[i]) !== -1) return true;
        }
        return false;
      };
      var hasWord = function (w) {
        return new RegExp("\\b" + w + "\\b").test(qn);
      };
      var qwCount = wordsOf(qn).length;

      /* 1. Pi / thanh toán (kiểm tra TRƯỚC — nhưng KHÔNG chứa chuỗi PCT, chuỗi đó do bundle giữ). */
      if (hasWord("pi") || has("thanh toan", "chuyen khoan", "tra tien", "tien mat", "quẹt the", "quet the")) {
        if (piReply) return piReply;
      }
      if (has("pay", "payment") && !looksFoodRelated(qn)) {
        if (piReply) return piReply;
      }

      /* 2. Chào hỏi (kiểm tra SỚM, dùng word-boundary để "hi" không khớp nhầm "hiểu"). */
      if (hasWord("hello") || hasWord("hi") || hasWord("hey") || hasWord("chao") || has("xin chao")) {
        if (lang === "cn") return "您好！需要菜单、预订贵宾桌还是地址和营业时间？";
        if (lang === "en") return "Hello! Do you need the menu, VIP booking, or address & hours?";
        return "Dạ chào quý khách ạ. Quý khách cần xem menu, đặt bàn VIP hay địa chỉ giờ mở cửa ạ?";
      }

      /* 3. Đặt bàn (kèm số người + thời điểm nếu có). */
      var party = extractPartySize(qn);
      var isBooking = has("dat ban", "booking", "reservation", "con ban", "con cho", "het ban", "dat cho", "giu ban", "giu cho", "may nguoi", "book", "table", "reserve", "tonight")
        || hasWord("vip")
        || (has("ban") && has("nguoi"))
        || (has("toi nay") && has("ban"))
        || (party > 0 && (has("toi", "chieu", "nay", "gio", "ban", "dat", "cho") || qwCount <= 4));
      if (isBooking) {
        var tcode = extractTimeRef(qn);
        var when = timeRefText(tcode, lang);
        if (lang === "cn") {
          if (party > 0) return (when ? when + "可以预订" : "可以预订") + party + "位贵宾桌，请联系" + contactName + " " + hotline + "。" + giftText + "。";
          return "预订贵宾桌请联系" + contactName + " " + hotline + "。热辣DJ、舞者、专业公关。请问几位、几点到？";
        }
        if (lang === "en") {
          if (party > 0) return "Yes, we can take a table for " + party + (when ? " " + when : "") + ". Please call " + contactName + " " + hotline + " to book VIP. " + giftText + ".";
          return "For VIP booking, please contact " + contactName + " " + hotline + ". Hot DJ, dancer, pro PR. How many people and what time?";
        }
        if (party > 0) return "Dạ, " + (when ? when + " " : "") + "quán vẫn nhận bàn " + party + " người ạ. Quý khách gọi " + contactName + " " + hotline + " để đặt bàn VIP nhé. Đặt bàn VIP được " + giftText + " ạ.";
        return "Dạ đặt bàn VIP quý khách vui lòng liên hệ " + contactName + " " + hotline + " ạ. DJ hot, dancer, PR pro. Đặt bàn VIP được " + giftText + ". Quý khách đi mấy người và mấy giờ ạ?";
      }

      /* 4. Chỗ đậu xe. */
      if (has("dau xe", "do xe", "gui xe", "cho dau", "cho do", "bai xe", "parking", "de xe")) {
        if (parkingReply) return parkingReply;
        if (lang === "cn") return "我还没有停车信息，请致电" + contactName + " " + hotline + "咨询。";
        if (lang === "en") return "I don't have parking info yet. Please call " + contactName + " " + hotline + " and our staff will guide you.";
        return "Dạ em chưa có thông tin chỗ đậu xe ạ. Quý khách gọi " + contactName + " " + hotline + " để nhân viên hướng dẫn nhé.";
      }

      /* 5. Giờ mở cửa. */
      if (has("mo cua", "dong cua", "gio mo", "may gio mo", "gio giac", "open", "hours", "营业", "几点开")) {
        if (lang === "cn") return "营业时间每天" + hours + "。订桌热线：" + contactName + " " + hotline + "。";
        if (lang === "en") return "We're open " + hours + " daily. Booking hotline: " + contactName + " " + hotline + ".";
        return "Dạ quán mở cửa " + hours + " hàng ngày ạ. Hotline đặt bàn: " + contactName + " " + hotline + ".";
      }
      // "mấy giờ" đứng một mình, không có ngữ cảnh đặt bàn -> hỏi giờ mở cửa.
      if (has("may gio") && !has("ban", "nguoi", "dat")) {
        if (lang === "cn") return "营业时间每天" + hours + "。订桌热线：" + contactName + " " + hotline + "。";
        if (lang === "en") return "We're open " + hours + " daily. Booking hotline: " + contactName + " " + hotline + ".";
        return "Dạ quán mở cửa " + hours + " hàng ngày ạ. Hotline đặt bàn: " + contactName + " " + hotline + ".";
      }

      /* 6. Địa chỉ. */
      if (has("dia chi", "o dau", "duong", "address", "chi duong", "o cho nao", "地址", "在哪", "gan cau", "gan")) {
        if (lang === "cn") return "地址：" + address + "。营业时间每天" + hours + "。订桌热线：" + contactName + " " + hotline + "。";
        if (lang === "en") return "Address: " + address + ". Open " + hours + " daily. Booking hotline: " + contactName + " " + hotline + ".";
        return "Dạ địa chỉ " + address + ". Mở cửa " + hours + " hàng ngày. Hotline đặt bàn: " + contactName + " " + hotline + ".";
      }

      /* 7. Hỏi chung "món gì ngon / ăn gì" -> xem menu tổng quan (không phải "không tìm thấy"). */
      if (has("mon gi", "an gi")) return menuOverview(lang);

      /* 8. Tìm món trong menu thật (tên món / nhóm món). */
      var found = searchMenu(idx, qn);
      if (found.length) {
        var list = found.map(dishLine).join(", ");
        if (lang === "cn") return "有的，" + list + "。价格不含税。需要订桌吗？";
        if (lang === "en") return "Yes, we have " + list + ". Prices exclude VAT. Would you like to book a table?";
        return "Dạ có ạ. " + list + ". Giá chưa gồm VAT. Quý khách muốn đặt bàn để thưởng thức không ạ?";
      }
      // Hỏi "có X không" mà X là món ăn nhưng không tìm thấy -> trả lời không có, không bịa.
      // Riêng "ngon" mà không tìm thấy món cụ thể -> cho xem menu tổng quan thay vì "không có".
      if (hasWord("co") && looksFoodRelated(qn)) {
        if (has("ngon")) return menuOverview(lang);
        return notFound(lang);
      }

      /* 9. Xem menu tổng quan. */
      if (has("menu", "thuc don", "mon", "an gi", "co mon gi", "菜", "点菜")) {
        return menuOverview(lang);
      }

      /* 10. Fallback — không bịa, đưa hotline để nhân viên hỗ trợ. */
      return fallback(lang);
    }

    return { reply: reply, searchMenu: function (q) { return searchMenu(idx, norm(q)); } };
  }

  global.ChatbotIntent = { create: create, stripDiacritics: stripDiacritics, detectLang: detectLang };
})(typeof window !== "undefined" ? window : this);

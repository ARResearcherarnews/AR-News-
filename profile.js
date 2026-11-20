/* profile.js — ইউজার প্রোফাইল পেজ
   হেডারে লগইন করা থাকলে অ্যাভাটার বাটনে ক্লিক করলে এই পেজ খোলে।
   feed.html-এর "Full Story" পেজের মতোই একই স্লাইড-ইন .detail-overlay কাঠামো
   ব্যবহার করা হয়েছে, শুধু আলাদা আইডি (#profile-overlay) দিয়ে।
   URL হ্যাশ (#profile) দিয়ে রুট করা হয়, তাই ব্যাক বাটন/ব্রাউজার-ব্যাক দুটোই কাজ করবে।
   ইউজারের তথ্য আগে থেকেই লোড হওয়া Firebase Auth (firebase.auth()) থেকে আসে।
   ডিজাইন: ব্যানার + অ্যাভাটার, নাম/যোগদান/বায়ো, তিনটি কার্ড (সেভ করা / পড়া / লাইক করা) যেগুলো নিচের তালিকার ট্যাবও। */
(function () {
  "use strict";

  var CAMERA_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>';
  function pfIc(d, fill) { return '<svg viewBox="0 0 24 24" fill="' + (fill || "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; }
  var BIO_ICON = pfIc('<path d="M4 20h4L19 9l-4-4L4 16z"/>');
  var CAL_ICON = pfIc('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>');
  var EYE_ICON = pfIc('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
  var HEART_ICON = pfIc('<path d="M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.9-8 10.6-8 10.6z"/>');
  var CMT_ICON = pfIc('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>');
  var SAVE_ICON = pfIc('<path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4z"/>');
  var READ_ICON = pfIc('<path d="M4 5.5C7 4.5 10 5 12 7c2-2 5-2.5 8-1.5v12c-3-1-6-.5-8 1.5-2-2-5-2.5-8-1.5z"/>');
  var BULB_ICON = pfIc('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>');
  var CHECK_ICON = pfIc('<path d="m5 12.5 4.5 4.5L19 7.5"/>');
  var PLUS_ICON = pfIc('<path d="M12 5v14M5 12h14"/>');
  var CHEV_ICON = pfIc('<path d="m9 6 6 6-6 6"/>');

  // তিনটি তালিকা: কার্ড = ট্যাব
  var PF_TABS = [
    { key: "saved", path: "savedPosts", label: "সেভ করা", title: "সেভ করা পোস্ট", icon: SAVE_ICON, empty: "এখনো কোনো পোস্ট সেভ করেননি।" },
    { key: "read", path: "readPosts", label: "পড়া পোস্ট", title: "আপনার পড়া পোস্ট", icon: READ_ICON, empty: "এখনো কোনো পোস্ট পড়েননি।" },
    { key: "liked", path: "likedPosts", label: "লাইক করা", title: "লাইক করা পোস্ট", icon: HEART_ICON, empty: "এখনো কোনো পোস্ট লাইক দেননি।" }
  ];

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var overlay = document.getElementById("profile-overlay");
    var body = document.getElementById("profile-body");
    var backBtn = document.getElementById("profile-back");

    var editBioOverlay = document.getElementById("edit-bio-overlay");
    var editBioBody = document.getElementById("edit-bio-body");
    var editBioBackBtn = document.getElementById("edit-bio-back");

    if (!overlay || !body || !backBtn) return;

    function authReady() {
      return !!(window.firebase && firebase.auth);
    }

    function dbReady() {
      return !!window.rtdb;
    }

    // নির্বাচিত ছবি ছোট করে (max 320px) ও JPEG-এ কমপ্রেস করে একটা data URL (লিংক) বানায়,
    // যাতে Realtime Database-এ বেশি জায়গা না লাগে
    function resizeImageToDataUrl(file, maxSize, quality) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error("read failed")); };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error("image load failed")); };
          img.onload = function () {
            var w = img.width, h = img.height;
            var scale = Math.min(1, maxSize / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement("canvas");
            canvas.width = cw;
            canvas.height = ch;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, cw, ch);
            resolve(canvas.toDataURL("image/jpeg", quality || 0.82));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // ব্যানারের জন্য: ছবির মাঝখান থেকে w×h অনুপাতে কেটে ছোট করে JPEG বানায় (লিংকের আকার কম রাখতে)
    function resizeCoverToDataUrl(file, w, h, quality) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error("read failed")); };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error("image load failed")); };
          img.onload = function () {
            var scale = Math.max(w / img.width, h / img.height);
            var sw = w / scale, sh = h / scale;
            var sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", quality || 0.75));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function escHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : str;
      return div.innerHTML;
    }

    function formatDate(iso) {
      try {
        var d = new Date(iso);
        return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" }).replace(/,/g, "");
      } catch (e) {
        return "";
      }
    }

    // ---------- সেভ/পড়া/লাইক করা পোস্টের তালিকা (কার্ডই ট্যাব) ----------
    var pfIds = {};          // { saved: [id...], read: [...], liked: [...] } — লোড শেষ হলে বসে
    var pfFailed = {};
    var pfActive = "saved";

    function fmtCount(n) {
      n = Number(n) || 0;
      return n >= 1000000 ? (n / 1000000).toFixed(1).replace(".0", "") + "M" : n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n);
    }

    function pfRowHtml(id, post) {
      if (!post) {
        return '<div class="pf-row"><div class="pf-thumb"></div><div class="pf-rt"><div class="pf-rn">পোস্ট পাওয়া যায়নি (মুছে ফেলা হয়েছে)</div></div></div>';
      }
      var s = (window.postStatsById || {})[id] || {};
      var when = post.createdAt && window.formatDate ? window.formatDate(post.createdAt) : "";
      var meta = (post.category || "") + (post.category && when ? " · " : "") + when;
      return (
        '<a class="pf-row" href="#post/' + encodeURIComponent(id) + '">' +
        '<div class="pf-thumb">' + (post.imageUrl ? '<img src="' + escHtml(post.imageUrl) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</div>" +
        '<div class="pf-rt"><div class="pf-rn">' + escHtml(post.title || "শিরোনামহীন") + "</div>" +
        (meta ? '<div class="pf-rm">' + escHtml(meta) + "</div>" : "") +
        '<div class="pf-rs"><span>' + EYE_ICON + fmtCount(s.views) + "</span><span>" + HEART_ICON + fmtCount(s.likes) + "</span><span>" + CMT_ICON + fmtCount(s.comments) + "</span></div></div>" +
        '<span class="pf-cv">' + CHEV_ICON + "</span></a>"
      );
    }

    function renderActiveList() {
      var el = document.getElementById("pf-list");
      if (!el) return; // পেজ ততক্ষণে বন্ধ/পুনরায় রেন্ডার হতে পারে
      var tab = PF_TABS.filter(function (t) { return t.key === pfActive; })[0];
      var ids = pfIds[pfActive];
      var titleEl = document.getElementById("pf-list-title");
      var countEl = document.getElementById("pf-list-count");
      if (titleEl) titleEl.textContent = tab.title;
      if (countEl) countEl.textContent = ids ? ids.length.toLocaleString("bn-BD") + "টি" : "";
      if (pfFailed[pfActive]) { el.innerHTML = '<p class="profile-list-empty">লোড করা যায়নি।</p>'; return; }
      if (!ids) { el.innerHTML = '<p class="profile-list-empty">লোড হচ্ছে...</p>'; return; }
      if (!ids.length) { el.innerHTML = '<p class="profile-list-empty">' + escHtml(tab.empty) + "</p>"; return; }
      var postsMap = window.postsById;
      if (!postsMap) {
        // মূল পোস্ট তালিকা এখনো লোড হয়নি, একবার অপেক্ষা করা হচ্ছে
        el.innerHTML = '<p class="profile-list-empty">লোড হচ্ছে...</p>';
        document.addEventListener("ar:posts-ready", function handler() {
          document.removeEventListener("ar:posts-ready", handler);
          renderActiveList();
        });
        return;
      }
      var rowsHtml = ids.map(function (id) { return pfRowHtml(id, postsMap[id]); });
      // প্রতি ৭–৮টি পোস্টের পর বিজ্ঞাপন (feed.html-এর window.arAds); না থাকলে শুধু পোস্ট
      el.innerHTML = window.arAds && window.arAds.interleave ? window.arAds.interleave(rowsHtml) : rowsHtml.join("");
    }

    function setCount(key) {
      var el = document.getElementById("pf-count-" + key);
      if (el) el.textContent = pfIds[key] ? pfIds[key].length.toLocaleString("bn-BD") : "–";
    }

    function loadAllLists(uid) {
      pfIds = {}; pfFailed = {};
      PF_TABS.forEach(function (t) {
        if (!dbReady()) { pfIds[t.key] = []; setCount(t.key); return; }
        window.rtdb.ref("users/" + uid + "/" + t.path).once("value")
          .then(function (snap) {
            var val = snap.val() || {};
            pfIds[t.key] = Object.keys(val).sort(function (a, b) { return (val[b] || 0) - (val[a] || 0); });
          })
          .catch(function () { pfFailed[t.key] = true; })
          .then(function () { setCount(t.key); if (t.key === pfActive) renderActiveList(); });
      });
      renderActiveList();
    }

    function bindTabs() {
      body.querySelectorAll(".pf-card").forEach(function (card) {
        card.addEventListener("click", function () {
          pfActive = card.getAttribute("data-tab");
          body.querySelectorAll(".pf-card").forEach(function (c) {
            var on = c === card;
            c.classList.toggle("on", on);
            c.setAttribute("aria-selected", on ? "true" : "false");
          });
          renderActiveList();
        });
      });
    }

    // ---------- প্রোফাইলের HTML তৈরি ও বাইন্ড করা ----------
    function renderProfile(user) {
      var name = user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী");
      var email = user.email || "";
      var letter = (name || "?").trim().charAt(0).toUpperCase();
      var joined =
        user.metadata && user.metadata.creationTime ? formatDate(user.metadata.creationTime) : "";

      pfActive = "saved";
      body.innerHTML =
        '<div class="pf-banner" id="profile-banner">' +
        '  <button type="button" class="pf-banner-edit" id="profile-banner-edit" aria-label="ব্যানার পরিবর্তন করুন">' + CAMERA_ICON + "ব্যানার</button>" +
        '  <input type="file" id="profile-banner-input" accept="image/*" hidden>' +
        "</div>" +
        '<div class="pf-avatar-wrap">' +
        '  <div class="pf-avatar" id="profile-avatar">' + escHtml(letter) + "</div>" +
        '  <button type="button" class="pf-cam" id="profile-avatar-edit" aria-label="ছবি পরিবর্তন করুন">' + CAMERA_ICON + "</button>" +
        '  <input type="file" id="profile-photo-input" accept="image/*" hidden>' +
        "</div>" +
        '<div class="pf-editrow"><button type="button" class="pf-edit" id="profile-bio-edit-btn" aria-label="বায়ো এডিট">' + BIO_ICON + "এডিট</button></div>" +
        '<div class="pf-id">' +
        '  <h1 class="pf-name" id="profile-name">' + escHtml(name) + "</h1>" +
        (joined ? '<p class="pf-joined">' + CAL_ICON + "যোগদান: " + escHtml(joined) + "</p>" : "") +
        '  <p class="pf-bio" id="profile-bio"></p>' +
        "</div>" +
        '<p class="profile-photo-msg" id="profile-photo-msg"></p>' +
        '<div class="pf-cards" role="tablist">' +
        PF_TABS.map(function (t) {
          return '<button type="button" class="pf-card' + (t.key === pfActive ? " on" : "") + '" data-tab="' + t.key + '" role="tab" aria-selected="' + (t.key === pfActive) + '">' +
            '<span class="pf-ci">' + t.icon + "</span><b id=\"pf-count-" + t.key + '">–</b><small>' + t.label + "</small></button>";
        }).join("") + "</div>" +
        '<div class="pf-sec-head"><h2 id="pf-list-title"></h2><span id="pf-list-count"></span></div>' +
        '<div class="pf-list" id="pf-list"></div>';

      bindEditButton();
      bindAvatarUpload(user, letter);
      bindBannerUpload(user);
      loadBio(user.uid);
      bindTabs();
      loadAllLists(user.uid);
    }

    function loadBio(uid) {
      var el = document.getElementById("profile-bio");
      if (!el || !dbReady()) return;
      window.rtdb
        .ref("users/" + uid + "/bio")
        .once("value")
        .then(function (snap) {
          var bio = snap.val();
          el = document.getElementById("profile-bio"); // পেজ ততক্ষণে পুনরায় রেন্ডার হতে পারে
          if (!el) return;
          el.textContent = bio || "";
        })
        .catch(function () {});
    }

    function setAvatarPhoto(el, photoUrl, letter) {
      if (!el) return;
      if (photoUrl) {
        el.innerHTML = '<img src="' + escHtml(photoUrl) + '" alt="">';
      } else {
        el.textContent = letter;
      }
    }

    function bindAvatarUpload(user, letter) {
      var avatarEl = document.getElementById("profile-avatar");
      var editBtn = document.getElementById("profile-avatar-edit");
      var fileInput = document.getElementById("profile-photo-input");
      var msg = document.getElementById("profile-photo-msg");
      if (!avatarEl || !editBtn || !fileInput) return;

      // আগে থেকে সেভ করা ছবি থাকলে দেখানো (Realtime Database থেকে)
      if (dbReady()) {
        window.rtdb
          .ref("users/" + user.uid + "/photoURL")
          .once("value")
          .then(function (snap) {
            var url = snap.val();
            if (url) setAvatarPhoto(avatarEl, url, letter);
          })
          .catch(function () {});
      }

      editBtn.addEventListener("click", function () {
        fileInput.click();
      });

      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        if (!file.type || file.type.indexOf("image/") !== 0) {
          if (msg) msg.textContent = "শুধু ছবি ফাইল নির্বাচন করুন।";
          return;
        }
        if (!dbReady()) {
          if (msg) msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }

        editBtn.disabled = true;
        if (msg) msg.textContent = "ছবি সংরক্ষণ করা হচ্ছে...";

        resizeImageToDataUrl(file, 320, 0.82)
          .then(function (dataUrl) {
            setAvatarPhoto(avatarEl, dataUrl, letter); // সাথে সাথে প্রিভিউ দেখানো
            return window.rtdb.ref("users/" + user.uid + "/photoURL").set(dataUrl);
          })
          .then(function () {
            if (msg) msg.textContent = "ছবি সংরক্ষণ হয়েছে ✓";
            // হেডারের অ্যাভাটারও (login.js) আপডেট করতে জানানো হচ্ছে
            document.dispatchEvent(new CustomEvent("ar:profile-updated"));
          })
          .catch(function () {
            if (msg) msg.textContent = "ছবি সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন।";
          })
          .finally(function () {
            editBtn.disabled = false;
          });
      });
    }

    // ---------- ব্যানার ছবি যোগ/পরিবর্তন ----------
    function setBanner(el, url) {
      if (!el) return;
      el.style.backgroundImage = url ? 'url("' + String(url).replace(/"/g, "%22") + '")' : "";
      el.classList.toggle("has-img", !!url);
    }

    function bindBannerUpload(user) {
      var bannerEl = document.getElementById("profile-banner");
      var editBtn = document.getElementById("profile-banner-edit");
      var fileInput = document.getElementById("profile-banner-input");
      var msg = document.getElementById("profile-photo-msg");
      if (!bannerEl || !editBtn || !fileInput) return;

      if (dbReady()) {
        window.rtdb
          .ref("users/" + user.uid + "/bannerURL")
          .once("value")
          .then(function (snap) { setBanner(document.getElementById("profile-banner"), snap.val()); })
          .catch(function () {});
      }

      editBtn.addEventListener("click", function () { fileInput.click(); });

      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if (!file) return;
        if (!file.type || file.type.indexOf("image/") !== 0) {
          if (msg) msg.textContent = "শুধু ছবি ফাইল নির্বাচন করুন।";
          return;
        }
        if (!dbReady()) {
          if (msg) msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        editBtn.disabled = true;
        if (msg) msg.textContent = "ব্যানার সংরক্ষণ করা হচ্ছে...";

        resizeCoverToDataUrl(file, 900, 300, 0.75)
          .then(function (dataUrl) {
            setBanner(bannerEl, dataUrl); // সাথে সাথে প্রিভিউ
            return window.rtdb.ref("users/" + user.uid + "/bannerURL").set(dataUrl);
          })
          .then(function () { if (msg) msg.textContent = "ব্যানার সংরক্ষণ হয়েছে ✓"; })
          .catch(function () { if (msg) msg.textContent = "ব্যানার সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন।"; })
          .finally(function () { editBtn.disabled = false; });
      });
    }

    // ---------- এডিট বাটন (সরাসরি বায়ো এডিট পেজে নিয়ে যায়) ----------
    function bindEditButton() {
      var btn = document.getElementById("profile-bio-edit-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        location.hash = "profile/bio";
      });
    }

    // ---------- বায়ো পরিবর্তন — ফুল-স্ক্রিন পেজ ----------
    var BIO_MAX_LEN = 160;

    var BIO_TIPS = [
      "আপনার আগ্রহের বিষয় লিখুন, যেমন প্রযুক্তি, খেলাধুলা বা সমাজ।",
      "ছোট ও স্পষ্ট রাখুন, " + BIO_MAX_LEN.toLocaleString("bn-BD") + " অক্ষরের মধ্যে এক-দুই লাইনই যথেষ্ট।",
      "ফোন নম্বর বা ঠিকানার মতো ব্যক্তিগত তথ্য না লেখাই ভালো।"
    ];
    var BIO_EXAMPLES = [
      "জ্ঞান, প্রযুক্তি ও সমাজ নিয়ে জানতে ভালোবাসি।",
      "খবর পড়া আমার নেশা, AR News-এর নিয়মিত পাঠক।"
    ];

    function renderEditBio(user) {
      var name = user.displayName || "ইউজার";
      var letter = name.trim().charAt(0).toUpperCase();
      editBioBody.innerHTML =
        '<div class="eb-user"><div class="eb-av">' + escHtml(letter) + "</div>" +
        "<div><b>" + escHtml(name) + "</b><small>আপনার প্রোফাইলে নামের নিচে বায়ো দেখাবে।</small></div></div>" +
        '<form id="profile-bio-form">' +
        '  <label class="eb-label" for="profile-bio-input">আপনার সম্পর্কে</label>' +
        '  <div class="eb-box"><textarea id="profile-bio-input" maxlength="' + BIO_MAX_LEN + '" placeholder="নিজের সম্পর্কে কয়েক লাইন লিখুন..."></textarea>' +
        '  <span class="profile-bio-count" id="profile-bio-count">0/' + BIO_MAX_LEN + "</span></div>" +
        '  <div class="eb-bar"><i id="eb-bar-fill"></i></div>' +
        '  <div class="eb-preview"><small>' + EYE_ICON + "প্রোফাইলে এভাবে দেখাবে</small>" +
        '    <div class="eb-pr"><div class="eb-av">' + escHtml(letter) + "</div><div><b>" + escHtml(name) + '</b><p id="eb-preview-text"></p></div></div></div>' +
        '  <div class="eb-tips"><h2>' + BULB_ICON + "কী লিখবেন?</h2>" +
        BIO_TIPS.map(function (t) { return '<div class="eb-tip"><span>' + CHECK_ICON + "</span><p>" + escHtml(t) + "</p></div>"; }).join("") + "</div>" +
        '  <div class="eb-eh">উদাহরণ (চাপলে বক্সে বসে যাবে)</div>' +
        BIO_EXAMPLES.map(function (t) { return '<button type="button" class="eb-ex" data-text="' + escHtml(t) + '"><span>' + escHtml(t) + "</span><i>" + PLUS_ICON + "</i></button>"; }).join("") +
        '  <div class="eb-actions">' +
        '    <button type="submit" class="profile-save-btn" id="profile-bio-submit">সংরক্ষণ করুন</button>' +
        '    <button type="button" class="eb-cancel" id="eb-cancel">বাতিল</button>' +
        '    <p class="profile-msg" id="profile-bio-msg"></p>' +
        "  </div>" +
        "</form>";

      var form = document.getElementById("profile-bio-form");
      var input = document.getElementById("profile-bio-input");
      var countEl = document.getElementById("profile-bio-count");
      var msg = document.getElementById("profile-bio-msg");
      var saveBtn = document.getElementById("profile-bio-submit");
      var barFill = document.getElementById("eb-bar-fill");
      var previewEl = document.getElementById("eb-preview-text");

      function updateCount() {
        var len = input.value.length;
        countEl.textContent = len + "/" + BIO_MAX_LEN;
        barFill.style.width = Math.min(100, (len / BIO_MAX_LEN) * 100) + "%";
        barFill.classList.toggle("near", len >= BIO_MAX_LEN - 10);
        var t = input.value.trim();
        previewEl.textContent = t || "এখনো কিছু লেখা হয়নি।";
        previewEl.classList.toggle("empty", !t);
      }
      input.addEventListener("input", updateCount);
      editBioBody.querySelectorAll(".eb-ex").forEach(function (btn) {
        btn.addEventListener("click", function () {
          input.value = btn.getAttribute("data-text").slice(0, BIO_MAX_LEN);
          updateCount();
          input.focus();
        });
      });
      document.getElementById("eb-cancel").addEventListener("click", function () { history.back(); });

      if (dbReady()) {
        window.rtdb.ref("users/" + user.uid + "/photoURL").once("value")
          .then(function (snap) {
            var url = snap.val();
            if (url) editBioBody.querySelectorAll(".eb-av").forEach(function (el) { el.innerHTML = '<img src="' + escHtml(url) + '" alt="">'; });
          })
          .catch(function () {});
      }

      if (dbReady()) {
        window.rtdb
          .ref("users/" + user.uid + "/bio")
          .once("value")
          .then(function (snap) {
            input.value = snap.val() || "";
            updateCount();
            setTimeout(function () { input.focus(); }, 350);
          })
          .catch(updateCount);
      } else {
        updateCount();
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!dbReady()) {
          msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        var newBio = input.value.trim();
        msg.textContent = "";
        saveBtn.disabled = true;
        saveBtn.textContent = "সংরক্ষণ হচ্ছে...";

        window.rtdb
          .ref("users/" + user.uid + "/bio")
          .set(newBio)
          .then(function () {
            msg.textContent = "সফলভাবে আপডেট হয়েছে ✓";
            loadBio(user.uid); // প্রোফাইল পেজ পেছনে আপডেট হয়ে যাবে
            setTimeout(function () { history.back(); }, 500);
          })
          .catch(function () {
            msg.textContent = "আপডেট করা যায়নি, আবার চেষ্টা করুন।";
          })
          .finally(function () {
            saveBtn.disabled = false;
            saveBtn.textContent = "সংরক্ষণ করুন";
          });
      });
    }

    function openEditBio() {
      if (!editBioOverlay || !editBioBody) return;
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderEditBio(firebase.auth().currentUser);
      editBioOverlay.classList.add("open");
      editBioOverlay.scrollTop = 0;
    }

    function closeEditBio() {
      if (editBioOverlay) editBioOverlay.classList.remove("open");
    }

    // ---------- পেজ খোলা/বন্ধ করা ----------
    function openProfile() {
      if (!authReady() || !firebase.auth().currentUser) {
        // লগইন করা না থাকলে প্রোফাইল পেজ খোলা যাবে না
        if (location.hash === "#profile") history.replaceState(null, "", location.pathname + location.search);
        return;
      }
      renderProfile(firebase.auth().currentUser);
      overlay.classList.add("open");
      overlay.scrollTop = 0;
    }

    function closeProfile() {
      overlay.classList.remove("open");
    }

    function route() {
      var hash = location.hash;
      if (hash === "#profile/bio") {
        openEditBio();
        return;
      }
      closeEditBio();
      if (hash === "#profile") openProfile();
      else closeProfile();
    }

    backBtn.addEventListener("click", function () {
      history.back();
    });
    if (editBioBackBtn) editBioBackBtn.addEventListener("click", function () { history.back(); });
    if (editBioBackBtn) editBioBackBtn.addEventListener("click", function () { history.back(); });

    window.addEventListener("hashchange", route);

    // হেডারের অ্যাভাটার বাটনে ক্লিক করলে login.js এই ইভেন্ট পাঠায়
    document.addEventListener("ar:open-profile", function () {
      if (location.hash === "#profile") {
        openProfile();
      } else {
        location.hash = "profile";
      }
    });

    // পেজ লোড হওয়ার সময় URL-এ আগে থেকেই #profile বা #profile/bio থাকলে
    if (location.hash === "#profile" || location.hash === "#profile/bio") {
      route();
    }
  });
})();


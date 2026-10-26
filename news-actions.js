/* news-actions.js — স্ট্যাটিক /news/ID.html পেজে Like, Bookmark, Comment, Share ও Login চালু করে।
   নিউজের লেখা আগে থেকেই HTML-এ থাকে (গুগলের জন্য); এই স্ক্রিপ্ট শুধু ইন্টারঅ্যাক্টিভ অংশ যোগ করে।
   feed.html-এর একই config.js, login.js ও post.js ব্যবহার করে, তাই ডেটা ও আচরণ ফিডের মতোই।
   কোনো কারণে লোড না হলে নিউজ পড়তে কোনো সমস্যা হয় না। */
(function () {
  "use strict";

  var V = "20261025";
  var tag = document.currentScript;
  var m = location.pathname.match(/\/news\/([\w-]+?)(?:\.html)?\/?$/);
  var id = (tag && tag.getAttribute("data-post-id")) || (m && m[1]);
  if (!id) return;

  var CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function sheet(overlayId, closeId, inner) {
    return (
      '<div class="login-overlay" id="' + overlayId + '">' +
      '<div class="login-modal">' +
      '<button class="login-close" id="' + closeId + '" type="button" aria-label="বন্ধ করুন">' + CLOSE + "</button>" +
      inner +
      "</div></div>"
    );
  }

  // ---------- ফিডের মতো একই কাঠামো (ওভারলে/শিট) যোগ করা ----------
  var html =
    '<div class="share-toast" id="share-toast">লিংক কপি হয়েছে ✓</div>' +
    sheet(
      "login-overlay",
      "login-close",
      '<div id="login-modal-body"><h2>Login</h2>' +
        '<form id="login-form">' +
        '<input type="email" id="login-email" placeholder="ইমেইল" autocomplete="username" required>' +
        '<input type="password" id="login-password" placeholder="পাসওয়ার্ড" autocomplete="current-password" required>' +
        '<button type="submit" class="login-submit" id="login-submit">প্রবেশ করুন</button>' +
        '<p class="login-error" id="login-error"></p>' +
        "</form></div>"
    ) +
    sheet("comment-overlay", "comment-close", '<div id="comment-modal-body"></div>') +
    sheet("share-sheet-overlay", "share-sheet-close", '<div id="share-sheet-body"></div>') +
    sheet("report-sheet-overlay", "report-sheet-close", '<div id="report-sheet-body"></div>') +
    '<div id="detail-overlay" hidden></div>'; // post.js এই এলিমেন্ট আছে কিনা দেখে চালু হয়

  document.body.insertAdjacentHTML("beforeend", html);

  // login.js এই বাটন ছাড়া চালু হয় না; পেজে দেখা যায় না, লগইন খোলে কমেন্ট/লাইক বাটন থেকে
  document.body.insertAdjacentHTML(
    "beforeend",
    '<button class="login-btn" id="login-btn" type="button" style="display:none" aria-hidden="true" tabindex="-1">' +
      '<span class="login-btn-avatar" id="login-btn-avatar"></span><span class="login-btn-text">Login</span></button>'
  );

  // ---------- অনুবাদ (ফিডের একই কোড, হুবহু কপি) ----------
  function detectLang(text) {
    const banglaCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
    return banglaCount >= latinCount ? "bn" : "en";
  }

  function chunkText(text, maxLen) {
    const paras = String(text || "").split(/\n+/).filter(Boolean);
    const chunks = [];
    let cur = "";
    paras.forEach((p) => {
      while (p.length > maxLen) {
        if (cur) { chunks.push(cur); cur = ""; }
        chunks.push(p.slice(0, maxLen));
        p = p.slice(maxLen);
      }
      if ((cur + "\n" + p).length > maxLen) {
        if (cur) chunks.push(cur);
        cur = p;
      } else {
        cur = cur ? cur + "\n" + p : p;
      }
    });
    if (cur) chunks.push(cur);
    return chunks.length ? chunks : [""];
  }

  async function translateChunk(text, source, target) {
    if (!text.trim()) return text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("translate request failed");
    const data = await res.json();
    return (data && data.responseData && data.responseData.translatedText) || text;
  }

  async function translateText(text, source, target) {
    const chunks = chunkText(text, 450);
    const out = [];
    for (const chunk of chunks) out.push(await translateChunk(chunk, source, target));
    return out.join("\n\n");
  }

  // post.js প্রতিবার নতুন translate-btn এলিমেন্ট তৈরি করার পর এই ফাংশনটা কল করে
  // বাটনে কোনো লেখা নেই — শুধু আইকন, অবস্থা বোঝাতে class ও aria-label ব্যবহার হয়
  window.bindTranslateButton = function (btn, title, body) {
    if (!btn) return;
    let originalText = { title, body };
    let isTranslated = false;

    btn.disabled = false;
    btn.classList.remove("active", "spin");
    btn.setAttribute("aria-label", "Translate");
    btn.title = "Translate";

    async function translateNow() {
      const titleEl = document.getElementById("detail-title");
      const textEl = document.getElementById("detail-text");
      if (!titleEl || !textEl) return;

      if (isTranslated) {
        titleEl.textContent = originalText.title;
        textEl.textContent = originalText.body;
        isTranslated = false;
        btn.classList.remove("active");
        btn.setAttribute("aria-label", "Translate");
        btn.title = "Translate";
        return;
      }

      const source = detectLang(originalText.title + " " + originalText.body);
      const target = source === "bn" ? "en" : "bn";
      btn.disabled = true;
      btn.classList.add("spin");
      try {
        const [tTitle, tBody] = await Promise.all([
          translateText(originalText.title, source, target),
          translateText(originalText.body, source, target),
        ]);
        titleEl.textContent = tTitle;
        textEl.textContent = tBody;
        isTranslated = true;
        btn.classList.add("active");
        const label = target === "en" ? "Show Original" : "মূল লেখা দেখুন";
        btn.setAttribute("aria-label", label);
        btn.title = label;
      } catch (err) {
        alert("অনুবাদ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
      } finally {
        btn.disabled = false;
        btn.classList.remove("spin");
      }
    }

    btn.addEventListener("click", translateNow);

    // সেটিংস পেজে ভাষা পছন্দ ঠিক করা থাকলে, পোস্টের ভাষা তার থেকে ভিন্ন হলে
    // এমনিতেই খুলার সাথে সাথে অনুবাদ হয়ে যাবে
    try {
      const pref = localStorage.getItem("ar-lang-pref"); // "bn" | "en"
      if (pref === "bn" || pref === "en") {
        const source = detectLang(title + " " + body);
        if (source !== pref) translateNow();
      }
    } catch (_) {}
  };

  // ---------- স্ক্রিপ্টগুলো ক্রমানুসারে লোড ----------
  function load(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("লোড হয়নি: " + src)); };
      document.body.appendChild(s);
    });
  }

  var FB = "https://www.gstatic.com/firebasejs/10.13.0/";
  var chain = [
    FB + "firebase-app-compat.js",
    FB + "firebase-auth-compat.js",
    FB + "firebase-database-compat.js",
    "/config.js?v=" + V,
    "/login.js?v=" + V,
    "/post.js?v=" + V,
  ];

  function start() {
    if (!window.rtdb && window.firebase && firebase.apps && firebase.apps.length) {
      window.rtdb = firebase.database();
    }
    if (!window.rtdb || !window.PostActions) return;
    window.rtdb
      .ref("posts/" + id)
      .once("value")
      .then(function (snap) {
        var post = snap.val();
        if (post) window.PostActions.render(id, post);
      })
      .catch(function () {});
  }

  chain
    .reduce(function (p, src) { return p.then(function () { return load(src); }); }, Promise.resolve())
    .then(start)
    .catch(function (e) {
      if (window.console) console.warn("news-actions:", e && e.message);
    });
})();

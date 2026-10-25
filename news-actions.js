/* news-actions.js — স্ট্যাটিক /news/ID.html পেজে Like, Bookmark, Comment, Share ও Login চালু করে।
   নিউজের লেখা আগে থেকেই HTML-এ থাকে (গুগলের জন্য); এই স্ক্রিপ্ট শুধু ইন্টারঅ্যাক্টিভ অংশ যোগ করে।
   feed.html-এর একই config.js, login.js ও post.js ব্যবহার করে, তাই ডেটা ও আচরণ ফিডের মতোই।
   কোনো কারণে লোড না হলে নিউজ পড়তে কোনো সমস্যা হয় না। */
(function () {
  "use strict";

  var V = "20261024";
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

  // হেডারে লগইন বাটন (login.js এই বাটন ছাড়া চালু হয় না)
  var hdr = document.querySelector("header");
  if (hdr && !document.getElementById("login-btn")) {
    hdr.insertAdjacentHTML(
      "beforeend",
      '<button class="login-btn" id="login-btn" type="button" aria-label="লগইন">' +
        '<span class="login-btn-avatar" id="login-btn-avatar"></span>' +
        '<span class="login-btn-text">Login</span></button>'
    );
  }

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

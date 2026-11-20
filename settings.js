/* settings.js — প্রোফাইলের সেটিংস পেজ
   প্রোফাইল পেজের উপরের বারে (ডান পাশে) একটা গিয়ার আইকন থাকে (profile-settings-btn),
   যেটাতে চাপ দিলে এই ফাইলের নিয়ন্ত্রণে সেটিংস তালিকা খোলে — Full Story পেজের
   মতোই একই স্লাইড-ইন .detail-overlay কাঠামো ব্যবহার করা হয়েছে।
   তালিকায় থাকে: নাম পরিবর্তন করুন, পাসওয়ার্ড পরিবর্তন করুন — প্রতিটা নিজস্ব
   ফুল-স্ক্রিন পেজ হিসেবে খোলে (URL হ্যাশ দিয়ে রুট করা, তাই ব্যাক বাটন কাজ করে)।
   ডিজাইন: শিরোনাম, প্রোফাইল কার্ড, অ্যাপিয়ারেন্স (থিম/ফন্ট/ভাষা), অ্যাকাউন্ট, ডেটা এবং লাল কার্ডে লগআউট/মুছে ফেলা। */
(function () {
  "use strict";

  var SETTINGS_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var PENCIL_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var LOCK_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var MAIL_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>';
  var CHEVRON_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
  var LOGOUT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  var TRASH_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
  var ALERT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var MOON_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>';
  var TEXT_SIZE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>';
  var LANGUAGE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>';
  var EYE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 4.22-5.06M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  var USER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.7 3.4-5.5 7-5.5s6.3 1.8 7 5.5"/></svg>';
  var BULB_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
  var SHIELD_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>';

  // আইকনসহ গোল ঘর, কার্ড ও টিপসের ছোট অংশ (সব সাব-পেজে একই)
  function lf(icon, inner) { return '<div class="lf">' + icon + inner + "</div>"; }
  function spLabel(forId, text) { return '<label class="sp-lb"' + (forId ? ' for="' + forId + '"' : "") + ">" + text + "</label>"; }
  function spCard(title, icon, items) {
    return '<div class="sp-card"><h2>' + icon + title + "</h2>" +
      items.map(function (t) { return '<div class="sp-tip"><span>' + CHECK_ICON + "</span><p>" + t + "</p></div>"; }).join("") + "</div>";
  }
  function spActions(btnClass, btnId, btnText, msgId) {
    return '<div class="sp-actions"><button type="submit" class="profile-save-btn' + (btnClass ? " " + btnClass : "") + '" id="' + btnId + '">' + btnText + "</button>" +
      '<button type="button" class="sp-cancel">বাতিল</button><p class="profile-msg" id="' + msgId + '"></p></div>';
  }

  // "বাতিল": আগের পেজে ফেরে (কিছু সংরক্ষণ না করে)
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".sp-cancel")) history.back();
  });

  // পাসওয়ার্ড ইনপুট + শো/হাইড বাটন (login.js-এর মতোই)
  function passwordFieldHtml(id, placeholder, autocomplete) {
    return lf(LOCK_ICON,
      '<div class="login-password-wrap">' +
      '<input type="password" id="' + id + '" placeholder="' + placeholder + '" autocomplete="' + autocomplete + '" minlength="6" required>' +
      '<button type="button" class="login-toggle-pass" data-target="' + id + '" aria-label="পাসওয়ার্ড দেখান">' + EYE_ICON + "</button>" +
      "</div>"
    );
  }

  function bindPasswordToggles(container) {
    var toggles = container.querySelectorAll(".login-toggle-pass");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
        btn.setAttribute("aria-label", showing ? "পাসওয়ার্ড দেখান" : "পাসওয়ার্ড লুকান");
      });
    });
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var settingsBtn = document.getElementById("profile-settings-btn");

    var settingsOverlay = document.getElementById("settings-overlay");
    var settingsBody = document.getElementById("settings-body");
    var settingsBackBtn = document.getElementById("settings-back");

    var nameOverlay = document.getElementById("settings-name-overlay");
    var nameBody = document.getElementById("settings-name-body");
    var nameBackBtn = document.getElementById("settings-name-back");

    var emailOverlay = document.getElementById("settings-email-overlay");
    var emailBody = document.getElementById("settings-email-body");
    var emailBackBtn = document.getElementById("settings-email-back");

    var passwordOverlay = document.getElementById("settings-password-overlay");
    var passwordBody = document.getElementById("settings-password-body");
    var passwordBackBtn = document.getElementById("settings-password-back");

    var deleteOverlay = document.getElementById("settings-delete-overlay");
    var deleteBody = document.getElementById("settings-delete-body");
    var deleteBackBtn = document.getElementById("settings-delete-back");

    if (!settingsBtn || !settingsOverlay || !settingsBody) return;

    function authReady() {
      return !!(window.firebase && firebase.auth);
    }

    // ---------- থিম (ডার্ক/লাইট) টগল — নেভ মেনুর টগলের সাথে localStorage কী শেয়ার করে ----------
    function isDarkNow() {
      var root = document.documentElement;
      var saved = root.getAttribute("data-theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function bindThemeToggle() {
      var lightBtn = document.getElementById("settings-theme-light");
      var darkBtn = document.getElementById("settings-theme-dark");
      if (!lightBtn || !darkBtn) return;
      var root = document.documentElement;

      function reflect() {
        var dark = isDarkNow();
        darkBtn.classList.toggle("active", dark);
        lightBtn.classList.toggle("active", !dark);
      }
      function setTheme(next) {
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("ar-theme", next); } catch (_) {}
        reflect();
      }
      reflect();
      lightBtn.addEventListener("click", function () { setTheme("light"); });
      darkBtn.addEventListener("click", function () { setTheme("dark"); });
    }

    // ---------- ফন্ট সাইজ — feed.html এর Full Story পেজ এই একই localStorage কী পড়ে প্রয়োগ করে ----------
    var FONT_SIZES = [14, 15.5, 17, 18.5, 20]; // px

    function bindFontSizeControls() {
      var decBtn = document.getElementById("settings-font-dec");
      var incBtn = document.getElementById("settings-font-inc");
      var levelEl = document.getElementById("settings-font-level");
      if (!decBtn || !incBtn || !levelEl) return;

      var root = document.documentElement;
      var idx = 1; // ডিফল্ট = 15.5px
      try {
        var saved = parseInt(localStorage.getItem("ar-fontsize-idx"), 10);
        if (!isNaN(saved) && saved >= 0 && saved < FONT_SIZES.length) idx = saved;
      } catch (_) {}

      function apply() {
        root.style.setProperty("--article-font-size", FONT_SIZES[idx] + "px");
        levelEl.textContent = (idx + 1) + "/" + FONT_SIZES.length;
        decBtn.disabled = idx === 0;
        incBtn.disabled = idx === FONT_SIZES.length - 1;
        try { localStorage.setItem("ar-fontsize-idx", String(idx)); } catch (_) {}
      }
      decBtn.addEventListener("click", function () { if (idx > 0) { idx--; apply(); } });
      incBtn.addEventListener("click", function () { if (idx < FONT_SIZES.length - 1) { idx++; apply(); } });
      apply();
    }

    // ---------- ভাষা পছন্দ — পোস্টের ভাষা এর থেকে ভিন্ন হলে খোলার সাথে সাথে অনুবাদ হয়ে যাবে ----------
    function bindLanguageToggle() {
      var wrap = document.getElementById("settings-lang-toggle");
      if (!wrap) return;
      var bnBtn = document.getElementById("settings-lang-bn");
      var enBtn = document.getElementById("settings-lang-en");

      var pref = "bn";
      try {
        var saved = localStorage.getItem("ar-lang-pref");
        if (saved === "bn" || saved === "en") pref = saved;
      } catch (_) {}

      function reflect() {
        bnBtn.classList.toggle("active", pref === "bn");
        enBtn.classList.toggle("active", pref === "en");
      }
      reflect();

      function setPref(next) {
        pref = next;
        try { localStorage.setItem("ar-lang-pref", pref); } catch (_) {}
        reflect();
      }
      bnBtn.addEventListener("click", function () { setPref("bn"); });
      enBtn.addEventListener("click", function () { setPref("en"); });
    }

    // ---------- সেটিংস তালিকা ----------
    function row(icon, label, desc, right, attrs, tag) {
      tag = tag || "button";
      return "<" + tag + (tag === "button" ? ' type="button"' : "") + ' class="st-row"' + (attrs || "") + ">" +
        '<span class="st-ic">' + icon + "</span>" +
        '<span class="st-lb"><b>' + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span>" +
        (right || "") + "</" + tag + ">";
    }
    var CHEV = '<span class="st-cv">' + CHEVRON_ICON + "</span>";

    function renderSettingsList() {
      var user = authReady() ? firebase.auth().currentUser : null;
      var name = (user && user.displayName) || "ইউজার";
      settingsBody.innerHTML =
        '<div class="st-title"><span class="st-gi">' + SETTINGS_ICON + "</span>" +
        "<div><h1>সেটিংস</h1><p>অ্যাপ সেটিংস ও পছন্দ অনুযায়ী কাস্টমাইজ করুন</p></div></div>" +

        '<button type="button" class="st-profile" id="settings-profile-card" aria-label="প্রোফাইল খুলুন">' +
        '<span class="st-pa" id="settings-profile-avatar">' + escHtml(name.trim().charAt(0).toUpperCase()) + "</span>" +
        '<span class="st-pn"><b>' + escHtml(name) + '</b><span class="st-ok">' + CHECK_ICON + "লগইন করা আছে</span></span>" + CHEV + "</button>" +

        '<div class="st-label">অ্যাপিয়ারেন্স</div><div class="st-group">' +
        row(MOON_ICON, "থিম", "", '<span class="st-seg"><button type="button" id="settings-theme-light">লাইট</button><button type="button" id="settings-theme-dark">ডার্ক</button></span>', "", "div") +
        row(TEXT_SIZE_ICON, "ফন্ট সাইজ", "পোস্ট পড়ার লেখার আকার",
          '<span class="st-font"><button type="button" id="settings-font-dec" aria-label="Decrease text size">A−</button><span id="settings-font-level">3/5</span><button type="button" id="settings-font-inc" aria-label="Increase text size">A+</button></span>', "", "div") +
        row(LANGUAGE_ICON, "ভাষা পছন্দ", "পোস্টের ভাষা ভিন্ন হলে খোলার সাথে অনুবাদ হবে",
          '<span class="st-seg" id="settings-lang-toggle"><button type="button" id="settings-lang-bn">বাংলা</button><button type="button" id="settings-lang-en">English</button></span>', "", "div") +
        "</div>" +

        '<div class="st-label">অ্যাকাউন্ট</div><div class="st-group">' +
        row(PENCIL_ICON, "নাম পরিবর্তন করুন", "", CHEV, ' data-nav="name"') +
        row(MAIL_ICON, "ইমেইল পরিবর্তন করুন", "", CHEV, ' data-nav="email"') +
        row(LOCK_ICON, "পাসওয়ার্ড পরিবর্তন করুন", "", CHEV, ' data-nav="password"') +
        "</div>" +

        '<div class="st-label">ডেটা</div><div class="st-group">' +
        row(TRASH_ICON, '<span id="settings-clear-history-label">রিডিং হিস্ট্রি মুছে ফেলুন</span>', "আপনার পড়া পোস্টের তালিকা পরিষ্কার হবে", "", ' id="settings-clear-history-btn"') +
        "</div>" +

        '<div class="st-danger">' +
        row(LOGOUT_ICON, "লগআউট", "", "", ' id="settings-logout-btn"') +
        row(ALERT_ICON, "একাউন্ট মুছে ফেলুন", "", CHEV, ' data-nav="delete-account"') +
        "</div>";

      bindThemeToggle();
      bindFontSizeControls();
      bindLanguageToggle();

      // প্রোফাইল কার্ড: চাপলে প্রোফাইল পেজে যায়; ছবি থাকলে অ্যাভাটারে বসে
      var card = document.getElementById("settings-profile-card");
      if (card) card.addEventListener("click", function () { location.hash = "profile"; });
      if (user && window.rtdb) {
        window.rtdb.ref("users/" + user.uid + "/photoURL").once("value")
          .then(function (snap) {
            var url = snap.val();
            var av = document.getElementById("settings-profile-avatar");
            if (url && av) av.innerHTML = '<img src="' + escHtml(url) + '" alt="">';
          })
          .catch(function () {});
      }

      settingsBody.querySelectorAll(".st-row[data-nav]").forEach(function (row) {
        row.addEventListener("click", function () {
          location.hash = "settings/" + row.dataset.nav;
        });
      });

      var clearHistoryBtn = document.getElementById("settings-clear-history-btn");
      if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", function () {
          if (!authReady() || !firebase.auth().currentUser) return;
          if (!confirm("আপনি কি আপনার পড়ার ইতিহাস মুছে ফেলতে চান?")) return;
          if (!window.rtdb) return;

          var label = document.getElementById("settings-clear-history-label");
          var uid = firebase.auth().currentUser.uid;
          clearHistoryBtn.disabled = true;
          if (label) label.textContent = "মুছে ফেলা হচ্ছে...";

          window.rtdb
            .ref("users/" + uid + "/readPosts")
            .remove()
            .then(function () {
              if (label) label.textContent = "মুছে ফেলা হয়েছে ✓";
            })
            .catch(function () {
              if (label) label.textContent = "মুছে ফেলা যায়নি, আবার চেষ্টা করুন।";
            })
            .finally(function () {
              clearHistoryBtn.disabled = false;
              setTimeout(function () {
                if (label) label.textContent = "রিডিং হিস্ট্রি মুছে ফেলুন";
              }, 1800);
            });
        });
      }

      var logoutBtn = document.getElementById("settings-logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
          if (!authReady()) return;
          if (!confirm("আপনি কি লগআউট করতে চান?")) return;
          firebase
            .auth()
            .signOut()
            .then(function () {
              history.back();
            });
        });
      }
    }

    function openSettings() {
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderSettingsList();
      settingsOverlay.classList.add("open");
      settingsOverlay.scrollTop = 0;
    }

    function closeSettings() {
      settingsOverlay.classList.remove("open");
    }

    // ---------- নাম পরিবর্তন ----------
    function renderSettingsName(user) {
      var curName = user.displayName || "ইউজার";
      nameBody.innerHTML =
        '<div class="sp-user"><div class="sp-av">' + escHtml(curName.trim().charAt(0).toUpperCase()) + "</div>" +
        "<div><b>" + escHtml(curName) + "</b><small>আপনার বর্তমান নাম</small></div></div>" +
        '<form id="settings-name-form" class="settings-form">' +
        spLabel("settings-name-input", "নতুন নাম") +
        lf(USER_ICON, '<input type="text" id="settings-name-input" value="' + escHtml(user.displayName || "") + '" placeholder="আপনার নাম" autocomplete="name">') +
        '<p class="sp-ht">এই নামটি আপনার প্রোফাইল ও কমেন্টে দেখাবে।</p>' +
        spCard("কী লিখবেন?", BULB_ICON, ["আসল নাম লিখলে অন্যরা সহজে চিনতে পারবে।", "নামে ইমোজি বা বিশেষ চিহ্ন এড়িয়ে চলুন।", "পরে যতবার ইচ্ছা নাম বদলাতে পারবেন।"]) +
        spActions("", "settings-name-submit", "সংরক্ষণ করুন", "settings-name-msg") +
        "</form>";

      var form = document.getElementById("settings-name-form");
      var input = document.getElementById("settings-name-input");
      var msg = document.getElementById("settings-name-msg");
      var submitBtn = document.getElementById("settings-name-submit");

      setTimeout(function () {
        input.focus();
        input.select();
      }, 350);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        var newName = input.value.trim();
        msg.textContent = "";
        submitBtn.disabled = true;
        submitBtn.textContent = "সংরক্ষণ হচ্ছে...";

        user
          .updateProfile({ displayName: newName })
          .then(function () {
            msg.textContent = "সফলভাবে আপডেট হয়েছে ✓";
            // প্রোফাইল পেজের হেডার/অ্যাভাটার আপডেট করতে জানানো হচ্ছে
            document.dispatchEvent(new CustomEvent("ar:profile-updated"));
            setTimeout(function () { history.back(); }, 500);
          })
          .catch(function () {
            msg.textContent = "আপডেট করা যায়নি, আবার চেষ্টা করুন।";
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = "সংরক্ষণ করুন";
          });
      });
    }

    function openSettingsName() {
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderSettingsName(firebase.auth().currentUser);
      nameOverlay.classList.add("open");
      nameOverlay.scrollTop = 0;
    }

    function closeSettingsName() {
      nameOverlay.classList.remove("open");
    }

    // ---------- ইমেইল পরিবর্তন ----------
    function friendlyEmailError(error) {
      switch (error && error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "পাসওয়ার্ড সঠিক নয়।";
        case "auth/email-already-in-use":
          return "এই ইমেইল দিয়ে আগে থেকেই একটা একাউন্ট আছে।";
        case "auth/invalid-email":
          return "সঠিক ইমেইল দিন।";
        case "auth/too-many-requests":
          return "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর চেষ্টা করুন।";
        case "auth/requires-recent-login":
          return "নিরাপত্তার জন্য আবার লগইন করে চেষ্টা করুন।";
        default:
          return "ইমেইল পরিবর্তন করা যায়নি, আবার চেষ্টা করুন।";
      }
    }

    function renderSettingsEmail(user) {
      var hasPasswordProvider = (user.providerData || []).some(function (p) {
        return p.providerId === "password";
      });

      if (!hasPasswordProvider) {
        emailBody.innerHTML = '<p class="profile-list-empty">এই একাউন্টে ইমেইল পরিবর্তনের সুবিধা নেই।</p>';
        return;
      }

      emailBody.innerHTML =
        '<div class="sp-cx"><small>বর্তমান ইমেইল</small><b>' + escHtml(user.email || "") + "</b></div>" +
        '<form id="settings-email-form" class="settings-form">' +
        spLabel("settings-email-input", "নতুন ইমেইল") +
        lf(MAIL_ICON, '<input type="email" id="settings-email-input" value="' + escHtml(user.email || "") + '" placeholder="নতুন ইমেইল" autocomplete="email">') +
        spLabel("settings-email-password", "বর্তমান পাসওয়ার্ড") +
        passwordFieldHtml("settings-email-password", "পাসওয়ার্ড", "current-password") +
        '<p class="sp-ht">নিরাপত্তার জন্য বর্তমান পাসওয়ার্ড দিয়ে নিশ্চিত করতে হবে।</p>' +
        spCard("মনে রাখবেন", SHIELD_ICON, ["ইমেইল বদলালে পরের বার নতুন ইমেইল দিয়ে লগইন করতে হবে।", "সঠিক ও চালু ইমেইল ঠিকানা দিন।"]) +
        spActions("", "settings-email-submit", "সংরক্ষণ করুন", "settings-email-msg") +
        "</form>";

      var form = document.getElementById("settings-email-form");
      bindPasswordToggles(form);

      var emailInput = document.getElementById("settings-email-input");
      var passInput = document.getElementById("settings-email-password");
      var msg = document.getElementById("settings-email-msg");
      var submitBtn = document.getElementById("settings-email-submit");

      setTimeout(function () {
        emailInput.focus();
        emailInput.select();
      }, 350);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        var newEmail = emailInput.value.trim();
        var curPass = passInput.value;
        msg.textContent = "";

        if (newEmail === user.email) {
          msg.textContent = "এটা আপনার বর্তমান ইমেইলই আছে।";
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "পরিবর্তন হচ্ছে...";

        var credential = firebase.auth.EmailAuthProvider.credential(user.email, curPass);
        user
          .reauthenticateWithCredential(credential)
          .then(function () {
            return user.updateEmail(newEmail);
          })
          .then(function () {
            msg.textContent = "সফলভাবে আপডেট হয়েছে ✓";
            document.dispatchEvent(new CustomEvent("ar:profile-updated"));
            setTimeout(function () { history.back(); }, 700);
          })
          .catch(function (error) {
            msg.textContent = friendlyEmailError(error);
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = "সংরক্ষণ করুন";
          });
      });
    }

    function openSettingsEmail() {
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderSettingsEmail(firebase.auth().currentUser);
      emailOverlay.classList.add("open");
      emailOverlay.scrollTop = 0;
    }

    function closeSettingsEmail() {
      emailOverlay.classList.remove("open");
    }

    // ---------- পাসওয়ার্ড পরিবর্তন ----------
    function friendlyPasswordError(error) {
      switch (error && error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "বর্তমান পাসওয়ার্ড সঠিক নয়।";
        case "auth/weak-password":
          return "নতুন পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।";
        case "auth/too-many-requests":
          return "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর চেষ্টা করুন।";
        case "auth/requires-recent-login":
          return "নিরাপত্তার জন্য আবার লগইন করে চেষ্টা করুন।";
        default:
          return "পাসওয়ার্ড পরিবর্তন করা যায়নি, আবার চেষ্টা করুন।";
      }
    }

    function renderSettingsPassword(user) {
      var hasPasswordProvider = (user.providerData || []).some(function (p) {
        return p.providerId === "password";
      });

      if (!hasPasswordProvider) {
        passwordBody.innerHTML =
          '<p class="profile-list-empty">এই একাউন্টে পাসওয়ার্ড পরিবর্তনের সুবিধা নেই।</p>';
        return;
      }

      passwordBody.innerHTML =
        '<form id="settings-password-form" class="settings-form">' +
        spLabel("settings-current-password", "বর্তমান পাসওয়ার্ড") +
        passwordFieldHtml("settings-current-password", "বর্তমান পাসওয়ার্ড", "current-password") +
        spLabel("settings-new-password", "নতুন পাসওয়ার্ড") +
        passwordFieldHtml("settings-new-password", "নতুন পাসওয়ার্ড", "new-password") +
        spLabel("settings-new-password2", "নতুন পাসওয়ার্ড আবার") +
        passwordFieldHtml("settings-new-password2", "নতুন পাসওয়ার্ড আবার লিখুন", "new-password") +
        spCard("পাসওয়ার্ডের নিয়ম", SHIELD_ICON, ["কমপক্ষে ৬ ক্যারেক্টার হতে হবে।", "দুটি নতুন পাসওয়ার্ড একই হতে হবে।", "অন্য সাইটের পাসওয়ার্ড এখানে ব্যবহার না করাই ভালো।"]) +
        spActions("", "settings-password-submit", "পাসওয়ার্ড পরিবর্তন করুন", "settings-password-msg") +
        "</form>";

      var form = document.getElementById("settings-password-form");
      bindPasswordToggles(form);

      var curInput = document.getElementById("settings-current-password");
      var newInput = document.getElementById("settings-new-password");
      var new2Input = document.getElementById("settings-new-password2");
      var msg = document.getElementById("settings-password-msg");
      var submitBtn = document.getElementById("settings-password-submit");

      setTimeout(function () { curInput.focus(); }, 350);

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        var curPass = curInput.value;
        var newPass = newInput.value;
        var newPass2 = new2Input.value;
        msg.textContent = "";

        if (newPass !== newPass2) {
          msg.textContent = "নতুন পাসওয়ার্ড দুটি মিলছে না।";
          return;
        }
        if (newPass.length < 6) {
          msg.textContent = "নতুন পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।";
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "পরিবর্তন হচ্ছে...";

        var credential = firebase.auth.EmailAuthProvider.credential(user.email, curPass);
        user
          .reauthenticateWithCredential(credential)
          .then(function () {
            return user.updatePassword(newPass);
          })
          .then(function () {
            msg.textContent = "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে ✓";
            form.reset();
            setTimeout(function () { history.back(); }, 700);
          })
          .catch(function (error) {
            msg.textContent = friendlyPasswordError(error);
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = "পাসওয়ার্ড পরিবর্তন করুন";
          });
      });
    }

    function openSettingsPassword() {
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderSettingsPassword(firebase.auth().currentUser);
      passwordOverlay.classList.add("open");
      passwordOverlay.scrollTop = 0;
    }

    function closeSettingsPassword() {
      passwordOverlay.classList.remove("open");
    }

    // ---------- একাউন্ট মুছে ফেলুন ----------
    var DELETE_CONFIRM_WORD = "মুছে ফেলুন";

    function friendlyDeleteError(error) {
      switch (error && error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "পাসওয়ার্ড সঠিক নয়।";
        case "auth/too-many-requests":
          return "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর চেষ্টা করুন।";
        case "auth/requires-recent-login":
          return "নিরাপত্তার জন্য আবার লগইন করে চেষ্টা করুন।";
        default:
          return "একাউন্ট মুছে ফেলা যায়নি, আবার চেষ্টা করুন।";
      }
    }

    function renderSettingsDeleteAccount(user) {
      var hasPasswordProvider = (user.providerData || []).some(function (p) {
        return p.providerId === "password";
      });

      var warningHtml =
        '<div class="settings-warning"><h2>' + ALERT_ICON + "এই কাজ ফেরানো যাবে না</h2>" +
        "<p>এই কাজটি স্থায়ী এবং ফিরিয়ে আনা যাবে না। আপনার একাউন্ট মুছে ফেলা হলে:</p>" +
        "<ul>" +
        "<li>আপনার প্রোফাইল, নাম, ছবি ও বায়ো মুছে যাবে</li>" +
        "<li>পড়া পোস্ট ও লাইক করা পোস্টের তালিকা মুছে যাবে</li>" +
        "<li>এই ইমেইল দিয়ে আর লগইন করা যাবে না</li>" +
        "</ul>" +
        "</div>";

      if (!hasPasswordProvider) {
        deleteBody.innerHTML = warningHtml + '<p class="profile-list-empty">এই একাউন্টের জন্য মুছে ফেলার সুবিধা এখনো নেই।</p>';
        return;
      }

      deleteBody.innerHTML =
        warningHtml +
        '<form id="settings-delete-form" class="settings-form">' +
        spLabel("settings-delete-password", "বর্তমান পাসওয়ার্ড") +
        passwordFieldHtml("settings-delete-password", "পাসওয়ার্ড", "current-password") +
        spLabel("settings-delete-confirm-input", "নিশ্চিত করতে লিখুন: " + DELETE_CONFIRM_WORD) +
        lf(USER_ICON, '<input type="text" id="settings-delete-confirm-input" placeholder="' + DELETE_CONFIRM_WORD + '" autocomplete="off">') +
        spActions("danger-btn", "settings-delete-submit", "একাউন্ট স্থায়ীভাবে মুছে ফেলুন", "settings-delete-msg") +
        "</form>";

      var form = document.getElementById("settings-delete-form");
      bindPasswordToggles(form);

      var passInput = document.getElementById("settings-delete-password");
      var confirmInput = document.getElementById("settings-delete-confirm-input");
      var msg = document.getElementById("settings-delete-msg");
      var submitBtn = document.getElementById("settings-delete-submit");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          msg.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        msg.textContent = "";

        if (confirmInput.value.trim() !== DELETE_CONFIRM_WORD) {
          msg.textContent = 'নিশ্চিত করতে ঠিক এভাবে লিখুন: "' + DELETE_CONFIRM_WORD + '"';
          return;
        }
        if (!confirm("আপনি কি নিশ্চিত? এই কাজটি ফিরিয়ে আনা যাবে না।")) return;

        var curPass = passInput.value;
        var uid = user.uid;
        submitBtn.disabled = true;
        submitBtn.textContent = "মুছে ফেলা হচ্ছে...";

        var credential = firebase.auth.EmailAuthProvider.credential(user.email, curPass);
        user
          .reauthenticateWithCredential(credential)
          .then(function () {
            if (window.rtdb) {
              return window.rtdb.ref("users/" + uid).remove().catch(function () {});
            }
          })
          .then(function () {
            return user.delete();
          })
          .then(function () {
            location.href = location.pathname; // ফ্রেশ, লগ-আউট অবস্থায় পেজ পুনরায় লোড হবে
          })
          .catch(function (error) {
            msg.textContent = friendlyDeleteError(error);
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = "একাউন্ট স্থায়ীভাবে মুছে ফেলুন";
          });
      });
    }

    function openSettingsDeleteAccount() {
      if (!authReady() || !firebase.auth().currentUser) {
        history.back();
        return;
      }
      renderSettingsDeleteAccount(firebase.auth().currentUser);
      deleteOverlay.classList.add("open");
      deleteOverlay.scrollTop = 0;
    }

    function closeSettingsDeleteAccount() {
      deleteOverlay.classList.remove("open");
    }

    // ---------- রাউটিং ----------
    function route() {
      var hash = location.hash;
      if (hash === "#settings/name") {
        openSettingsName();
        return;
      }
      if (hash === "#settings/email") {
        openSettingsEmail();
        return;
      }
      if (hash === "#settings/password") {
        openSettingsPassword();
        return;
      }
      if (hash === "#settings/delete-account") {
        openSettingsDeleteAccount();
        return;
      }
      closeSettingsName();
      closeSettingsEmail();
      closeSettingsPassword();
      closeSettingsDeleteAccount();
      if (hash === "#settings") openSettings();
      else closeSettings();
    }

    settingsBtn.addEventListener("click", function () {
      location.hash = "settings";
    });
    if (settingsBackBtn) settingsBackBtn.addEventListener("click", function () { history.back(); });
    if (nameBackBtn) nameBackBtn.addEventListener("click", function () { history.back(); });
    if (emailBackBtn) emailBackBtn.addEventListener("click", function () { history.back(); });
    if (passwordBackBtn) passwordBackBtn.addEventListener("click", function () { history.back(); });
    if (deleteBackBtn) deleteBackBtn.addEventListener("click", function () { history.back(); });

    window.addEventListener("hashchange", route);

    // পেজ লোড হওয়ার সময় URL-এ আগে থেকেই #settings/... থাকলে
    if (
      location.hash === "#settings" ||
      location.hash === "#settings/name" ||
      location.hash === "#settings/email" ||
      location.hash === "#settings/password" ||
      location.hash === "#settings/delete-account"
    ) {
      route();
    }
  });
})();
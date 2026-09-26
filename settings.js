/* settings.js — প্রোফাইলের সেটিংস পেজ
   প্রোফাইল পেজের উপরের বারে (ডান পাশে) একটা গিয়ার আইকন থাকে (profile-settings-btn),
   যেটাতে চাপ দিলে এই ফাইলের নিয়ন্ত্রণে সেটিংস তালিকা খোলে — Full Story পেজের
   মতোই একই স্লাইড-ইন .detail-overlay কাঠামো ব্যবহার করা হয়েছে।
   তালিকায় থাকে: নাম পরিবর্তন করুন, পাসওয়ার্ড পরিবর্তন করুন — প্রতিটা নিজস্ব
   ফুল-স্ক্রিন পেজ হিসেবে খোলে (URL হ্যাশ দিয়ে রুট করা, তাই ব্যাক বাটন কাজ করে)। */
(function () {
  "use strict";

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

  // পাসওয়ার্ড ইনপুট + শো/হাইড বাটন (login.js-এর মতোই)
  function passwordFieldHtml(id, placeholder, autocomplete) {
    return (
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
      var row = document.getElementById("settings-theme-toggle");
      if (!row) return;
      var root = document.documentElement;

      function reflect() {
        row.dataset.on = String(isDarkNow());
      }
      reflect();

      row.addEventListener("click", function () {
        var next = isDarkNow() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("ar-theme", next); } catch (_) {}
        reflect();
      });
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
    function renderSettingsList() {
      settingsBody.innerHTML =
        '<div class="settings-list">' +
        '  <button type="button" class="settings-list-item" id="settings-theme-toggle">' +
        '    <span class="sli-icon">' + MOON_ICON + "</span>" +
        "    <span>ডার্ক মোড</span>" +
        '    <span class="switch"><span class="knob"></span></span>' +
        "  </button>" +
        '  <div class="settings-list-item" style="cursor:default">' +
        '    <span class="sli-icon">' + TEXT_SIZE_ICON + "</span>" +
        "    <span>ফন্ট সাইজ</span>" +
        '    <div class="fontsize-controls">' +
        '      <button type="button" id="settings-font-dec" aria-label="Decrease text size">A−</button>' +
        '      <span id="settings-font-level">3/5</span>' +
        '      <button type="button" id="settings-font-inc" aria-label="Increase text size">A+</button>' +
        "    </div>" +
        "  </div>" +
        '  <div class="settings-list-item lang-item" style="cursor:default">' +
        '    <span class="sli-icon">' + LANGUAGE_ICON + "</span>" +
        '    <div class="sli-text">' +
        "      <span>ভাষা পছন্দ</span>" +
        '      <span class="sli-desc">পোস্টের ভাষা এখান থেকে ভিন্ন হলে (যেমন ইংরেজি থেকে বাংলা), খোলার সাথে সাথেই অনুবাদ হয়ে যাবে</span>' +
        "    </div>" +
        '    <div class="lang-toggle" id="settings-lang-toggle">' +
        '      <button type="button" id="settings-lang-bn">বাংলা</button>' +
        '      <button type="button" id="settings-lang-en">English</button>' +
        "    </div>" +
        "  </div>" +
        '  <button type="button" class="settings-list-item" data-nav="name">' +
        '    <span class="sli-icon">' + PENCIL_ICON + "</span>" +
        "    <span>নাম পরিবর্তন করুন</span>" +
        '    <span class="sli-chevron">' + CHEVRON_ICON + "</span>" +
        "  </button>" +
        '  <button type="button" class="settings-list-item" data-nav="email">' +
        '    <span class="sli-icon">' + MAIL_ICON + "</span>" +
        "    <span>ইমেইল পরিবর্তন করুন</span>" +
        '    <span class="sli-chevron">' + CHEVRON_ICON + "</span>" +
        "  </button>" +
        '  <button type="button" class="settings-list-item" data-nav="password">' +
        '    <span class="sli-icon">' + LOCK_ICON + "</span>" +
        "    <span>পাসওয়ার্ড পরিবর্তন করুন</span>" +
        '    <span class="sli-chevron">' + CHEVRON_ICON + "</span>" +
        "  </button>" +
        '  <button type="button" class="settings-list-item" id="settings-clear-history-btn">' +
        '    <span class="sli-icon">' + TRASH_ICON + "</span>" +
        '    <span id="settings-clear-history-label">রিডিং হিস্ট্রি মুছে ফেলুন</span>' +
        "  </button>" +
        "</div>" +
        '<div class="settings-list settings-list-danger">' +
        '  <button type="button" class="settings-list-item danger" id="settings-logout-btn">' +
        '    <span class="sli-icon">' + LOGOUT_ICON + "</span>" +
        "    <span>লগআউট</span>" +
        "  </button>" +
        '  <button type="button" class="settings-list-item danger" data-nav="delete-account">' +
        '    <span class="sli-icon">' + ALERT_ICON + "</span>" +
        "    <span>একাউন্ট মুছে ফেলুন</span>" +
        '    <span class="sli-chevron">' + CHEVRON_ICON + "</span>" +
        "  </button>" +
        "</div>";

      bindThemeToggle();
      bindFontSizeControls();
      bindLanguageToggle();

      settingsBody.querySelectorAll(".settings-list-item[data-nav]").forEach(function (row) {
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
      nameBody.innerHTML =
        '<form id="settings-name-form" class="settings-form">' +
        '  <input type="text" id="settings-name-input" value="' + escHtml(user.displayName || "") + '" placeholder="আপনার নাম">' +
        '  <button type="submit" class="profile-save-btn" id="settings-name-submit">সংরক্ষণ করুন</button>' +
        '  <p class="profile-msg" id="settings-name-msg"></p>' +
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
        '<form id="settings-email-form" class="settings-form">' +
        '  <input type="email" id="settings-email-input" value="' + escHtml(user.email || "") + '" placeholder="নতুন ইমেইল" autocomplete="email">' +
        passwordFieldHtml("settings-email-password", "বর্তমান পাসওয়ার্ড", "current-password") +
        '  <button type="submit" class="profile-save-btn" id="settings-email-submit">সংরক্ষণ করুন</button>' +
        '  <p class="profile-msg" id="settings-email-msg"></p>' +
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
        passwordFieldHtml("settings-current-password", "বর্তমান পাসওয়ার্ড", "current-password") +
        passwordFieldHtml("settings-new-password", "নতুন পাসওয়ার্ড", "new-password") +
        passwordFieldHtml("settings-new-password2", "নতুন পাসওয়ার্ড আবার লিখুন", "new-password") +
        '  <button type="submit" class="profile-save-btn" id="settings-password-submit">পাসওয়ার্ড পরিবর্তন করুন</button>' +
        '  <p class="profile-msg" id="settings-password-msg"></p>' +
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
        '<div class="settings-warning">' +
        "এই কাজটি স্থায়ী এবং ফিরিয়ে আনা যাবে না। আপনার একাউন্ট মুছে ফেলা হলে:" +
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
        passwordFieldHtml("settings-delete-password", "বর্তমান পাসওয়ার্ড", "current-password") +
        '  <input type="text" id="settings-delete-confirm-input" placeholder="নিশ্চিত করতে লিখুন: ' + DELETE_CONFIRM_WORD + '">' +
        '  <button type="submit" class="profile-save-btn danger-btn" id="settings-delete-submit">একাউন্ট স্থায়ীভাবে মুছে ফেলুন</button>' +
        '  <p class="profile-msg" id="settings-delete-msg"></p>' +
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
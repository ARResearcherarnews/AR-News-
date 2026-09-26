/* login.js — AR News হেডার লগইন / সাইন-আপ
   হেডারের বাটনে ক্লিক করলে একটি মোডাল খোলে যেখানে থাকে:
   - Login (ইমেইল + পাসওয়ার্ড)
   - Sign Up (নাম + ইমেইল + পাসওয়ার্ড + পাসওয়ার্ড নিশ্চিতকরণ)
   - পাসওয়ার্ড ভুলে গেলে রিসেট লিংক পাঠানো
   - লগইন অবস্থায় ইউজারের তথ্য দেখানো ও লগআউট
   feed.html-এ আগে থেকেই লোড হওয়া Firebase (compat SDK) + config.js ব্যবহার করে
   firebase.auth() দিয়ে সব কাজ করা হয়। */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- পাসওয়ার্ড শো/হাইড আইকন ----------
  var EYE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 4.22-5.06M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  // পাসওয়ার্ড ইনপুট + শো/হাইড বাটন সহ একটি HTML স্নিপেট তৈরি করে
  function passwordFieldHtml(id, placeholder, autocomplete) {
    return (
      '<div class="login-password-wrap">' +
      '  <input type="password" id="' +
      id +
      '" placeholder="' +
      placeholder +
      '" autocomplete="' +
      autocomplete +
      '" minlength="6" required>' +
      '  <button type="button" class="login-toggle-pass" data-target="' +
      id +
      '" aria-label="পাসওয়ার্ড দেখান">' +
      EYE_ICON +
      "</button>" +
      "</div>"
    );
  }

  // মোডালের ভেতরের সব পাসওয়ার্ড টগল বাটনে ক্লিক-হ্যান্ডলার বসায়
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

  ready(function () {
    var loginBtn = document.getElementById("login-btn");
    var loginBtnText = loginBtn ? loginBtn.querySelector(".login-btn-text") : null;
    var loginBtnAvatar = document.getElementById("login-btn-avatar");
    var overlay = document.getElementById("login-overlay");
    var closeBtn = document.getElementById("login-close");
    var modalBody = document.getElementById("login-modal-body");

    if (!loginBtn || !overlay || !modalBody) return;

    var currentUser = null; // onAuthStateChanged থেকে আপডেট হয়

    // ---------- মোডাল খোলা/বন্ধ করা ----------
    function openModal() {
      overlay.classList.add("open");
      render(currentUser ? "account" : "login");
    }
    function closeModal() {
      overlay.classList.remove("open");
    }

    // লগইন করা থাকলে হেডারের অ্যাভাটারে ক্লিকে প্রোফাইল পেজ খুলবে (profile.js শোনে),
    // না হলে লগইন মোডাল খুলবে
    loginBtn.addEventListener("click", function () {
      if (currentUser) {
        document.dispatchEvent(new CustomEvent("ar:open-profile"));
      } else {
        openModal();
      }
    });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    // অন্য ফাইল (যেমন post.js) থেকে লগইন মোডাল খোলার জন্য
    document.addEventListener("ar:open-login", function () {
      if (!currentUser) openModal();
    });

    // ---------- এরর বার্তা বাংলায় ----------
    function friendlyError(error) {
      switch (error && error.code) {
        case "auth/invalid-email":
          return "সঠিক ইমেইল দিন।";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "ইমেইল বা পাসওয়ার্ড সঠিক নয়।";
        case "auth/email-already-in-use":
          return "এই ইমেইল দিয়ে আগে থেকেই একাউন্ট আছে, লগইন করুন।";
        case "auth/weak-password":
          return "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।";
        case "auth/too-many-requests":
          return "অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর চেষ্টা করুন।";
        case "auth/network-request-failed":
          return "ইন্টারনেট সংযোগ পরীক্ষা করুন।";
        default:
          return "কাজটি করা যায়নি। আবার চেষ্টা করুন।";
      }
    }

    function authReady() {
      return !!(window.firebase && firebase.auth);
    }

    // ---------- ভিউ রেন্ডারার ----------
    // mode: "login" | "signup" | "reset" | "account"
    function render(mode) {
      if (mode === "account" && currentUser) return renderAccount(currentUser);
      if (mode === "reset") return renderReset();
      return renderAuthForm(mode === "signup" ? "signup" : "login");
    }

    function renderAuthForm(mode) {
      var isSignup = mode === "signup";
      modalBody.innerHTML =
        '<div class="login-tabs">' +
        '  <button type="button" class="login-tab' + (!isSignup ? " active" : "") + '" data-mode="login">Login</button>' +
        '  <button type="button" class="login-tab' + (isSignup ? " active" : "") + '" data-mode="signup">Sign Up</button>' +
        "</div>" +
        '<form id="login-form">' +
        (isSignup
          ? '  <input type="text" id="login-name" placeholder="নাম" autocomplete="name">'
          : "") +
        '  <input type="email" id="login-email" placeholder="ইমেইল" autocomplete="username" required>' +
        passwordFieldHtml("login-password", "পাসওয়ার্ড", isSignup ? "new-password" : "current-password") +
        (isSignup ? passwordFieldHtml("login-password2", "পাসওয়ার্ড আবার লিখুন", "new-password") : "") +
        '  <button type="submit" class="login-submit" id="login-submit">' +
        (isSignup ? "একাউন্ট তৈরি করুন" : "প্রবেশ করুন") +
        "</button>" +
        (!isSignup
          ? '  <p class="login-forgot"><button type="button" id="login-forgot-btn">পাসওয়ার্ড ভুলে গেছেন?</button></p>'
          : "") +
        '  <p class="login-error" id="login-error"></p>' +
        "</form>";

      var tabs = modalBody.querySelectorAll(".login-tab");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          render(tab.dataset.mode);
        });
      });

      var forgotBtn = document.getElementById("login-forgot-btn");
      if (forgotBtn) forgotBtn.addEventListener("click", function () { render("reset"); });

      bindPasswordToggles(modalBody);
      bindAuthForm(mode);

      var emailInput = document.getElementById("login-email");
      if (emailInput) setTimeout(function () { emailInput.focus(); }, 50);
    }

    function bindAuthForm(mode) {
      var form = document.getElementById("login-form");
      var errorEl = document.getElementById("login-error");
      var submitBtn = document.getElementById("login-submit");
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          errorEl.textContent = "লগইন সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }

        var email = document.getElementById("login-email").value.trim();
        var password = document.getElementById("login-password").value;
        errorEl.textContent = "";

        if (mode === "signup") {
          var name = document.getElementById("login-name").value.trim();
          var password2 = document.getElementById("login-password2").value;
          if (password !== password2) {
            errorEl.textContent = "দুটি পাসওয়ার্ড মিলছে না।";
            return;
          }
          setLoading(submitBtn, "একাউন্ট তৈরি হচ্ছে...");
          firebase
            .auth()
            .createUserWithEmailAndPassword(email, password)
            .then(function (cred) {
              if (name && cred.user) return cred.user.updateProfile({ displayName: name });
            })
            .then(function () {
              closeModal();
            })
            .catch(function (error) {
              errorEl.textContent = friendlyError(error);
            })
            .finally(function () {
              resetLoading(submitBtn, "একাউন্ট তৈরি করুন");
            });
        } else {
          setLoading(submitBtn, "অপেক্ষা করুন...");
          firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
            .then(function () {
              closeModal();
            })
            .catch(function (error) {
              errorEl.textContent = friendlyError(error);
            })
            .finally(function () {
              resetLoading(submitBtn, "প্রবেশ করুন");
            });
        }
      });
    }

    function renderReset() {
      modalBody.innerHTML =
        '<button type="button" class="login-back" id="login-back-btn">← ফিরে যান</button>' +
        "<h2>পাসওয়ার্ড রিসেট</h2>" +
        '<p class="login-hint">আপনার ইমেইলে একটি রিসেট লিংক পাঠানো হবে।</p>' +
        '<form id="reset-form">' +
        '  <input type="email" id="reset-email" placeholder="ইমেইল" autocomplete="username" required>' +
        '  <button type="submit" class="login-submit" id="reset-submit">রিসেট লিংক পাঠান</button>' +
        '  <p class="login-error" id="reset-error"></p>' +
        '  <p class="login-success" id="reset-success"></p>' +
        "</form>";

      document.getElementById("login-back-btn").addEventListener("click", function () {
        render("login");
      });

      var form = document.getElementById("reset-form");
      var errorEl = document.getElementById("reset-error");
      var successEl = document.getElementById("reset-success");
      var submitBtn = document.getElementById("reset-submit");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!authReady()) {
          errorEl.textContent = "সিস্টেম প্রস্তুত নয়, একটু পর আবার চেষ্টা করুন।";
          return;
        }
        var email = document.getElementById("reset-email").value.trim();
        errorEl.textContent = "";
        successEl.textContent = "";
        setLoading(submitBtn, "পাঠানো হচ্ছে...");

        firebase
          .auth()
          .sendPasswordResetEmail(email)
          .then(function () {
            successEl.textContent = "রিসেট লিংক পাঠানো হয়েছে, ইমেইল চেক করুন।";
          })
          .catch(function (error) {
            errorEl.textContent = friendlyError(error);
          })
          .finally(function () {
            resetLoading(submitBtn, "রিসেট লিংক পাঠান");
          });
      });

      var emailInput = document.getElementById("reset-email");
      setTimeout(function () { emailInput.focus(); }, 50);
    }

    function renderAccount(user) {
      var name = user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী");
      var email = user.email || "";
      modalBody.innerHTML =
        "<h2>স্বাগতম, " + escHtml(name) + "</h2>" +
        (email ? '<p class="login-user-email">' + escHtml(email) + "</p>" : "") +
        '<button type="button" class="login-logout" id="login-logout">লগআউট</button>';

      document.getElementById("login-logout").addEventListener("click", function () {
        if (authReady()) {
          firebase.auth().signOut().then(closeModal);
        } else {
          closeModal();
        }
      });
    }

    function escHtml(str) {
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function setLoading(btn, text) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = text;
    }
    function resetLoading(btn, text) {
      btn.disabled = false;
      btn.textContent = text || btn.dataset.originalText || btn.textContent;
    }

    // ---------- হেডার বাটনের অবস্থা আপডেট ----------
    function reflectHeaderButton(user) {
      if (user) {
        loginBtn.classList.add("is-logged");
        var name = user.displayName || (user.email ? user.email.split("@")[0] : "");
        var letter = (name || "U").trim().charAt(0).toUpperCase();
        if (loginBtnAvatar) loginBtnAvatar.textContent = letter;
        if (loginBtnText) loginBtnText.textContent = name || "Account";
        loginBtn.setAttribute("aria-label", "প্রোফাইল দেখুন");
        // Realtime Database-এ সেভ করা প্রোফাইল ছবি থাকলে সেটা দেখানো
        if (window.rtdb && loginBtnAvatar) {
          window.rtdb
            .ref("users/" + user.uid + "/photoURL")
            .once("value")
            .then(function (snap) {
              var url = snap.val();
              if (url) {
                loginBtnAvatar.innerHTML = '<img src="' + url + '" alt="">';
              } else {
                loginBtnAvatar.textContent = letter;
              }
            })
            .catch(function () {});
        }
      } else {
        loginBtn.classList.remove("is-logged");
        if (loginBtnAvatar) loginBtnAvatar.textContent = "";
        if (loginBtnText) loginBtnText.textContent = "Login";
        loginBtn.setAttribute("aria-label", "লগইন");
      }
    }

    // শুরুতে ডিফল্ট লগইন ফর্ম দেখাই, firebase রেডি হলে auth state অনুযায়ী আপডেট হবে
    renderAuthForm("login");

    if (authReady()) {
      firebase.auth().onAuthStateChanged(function (user) {
        currentUser = user;
        reflectHeaderButton(user);
        if (overlay.classList.contains("open")) {
          render(user ? "account" : "login");
        }
      });
    }

    // profile.js থেকে নাম পরিবর্তনের পর হেডারের অ্যাভাটার/নাম রিফ্রেশ করার জন্য
    document.addEventListener("ar:profile-updated", function () {
      if (authReady() && firebase.auth().currentUser) {
        currentUser = firebase.auth().currentUser;
        reflectHeaderButton(currentUser);
      }
    });
  });
})();
/* profile.js — ইউজার প্রোফাইল পেজ
   হেডারে লগইন করা থাকলে অ্যাভাটার বাটনে ক্লিক করলে এই পেজ খোলে।
   feed.html-এর "Full Story" পেজের মতোই একই স্লাইড-ইন .detail-overlay কাঠামো
   ব্যবহার করা হয়েছে, শুধু আলাদা আইডি (#profile-overlay) দিয়ে।
   URL হ্যাশ (#profile) দিয়ে রুট করা হয়, তাই ব্যাক বাটন/ব্রাউজার-ব্যাক দুটোই কাজ করবে।
   ইউজারের তথ্য আগে থেকেই লোড হওয়া Firebase Auth (firebase.auth()) থেকে আসে। */
(function () {
  "use strict";

  var CAMERA_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>';
  var BIO_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';

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

    function escHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : str;
      return div.innerHTML;
    }

    function formatDate(iso) {
      try {
        var d = new Date(iso);
        return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
      } catch (e) {
        return "";
      }
    }

    // ---------- পঠিত/লাইক করা পোস্ট তালিকা ----------
    function postCardHtml(id, post) {
      var title = post ? post.title || "শিরোনামহীন" : "পোস্ট পাওয়া যায়নি (মুছে ফেলা হয়েছে)";
      var category = post ? post.category || "" : "";
      var img = post && post.imageUrl ? '<img src="' + escHtml(post.imageUrl) + '" alt="">' : "";
      return (
        '<a class="profile-post-card" href="#post/' + encodeURIComponent(id) + '">' +
        '<div class="ppc-thumb' + (img ? "" : " ppc-thumb-empty") + '">' + img + "</div>" +
        '<div class="ppc-info">' +
        '<div class="ppc-title">' + escHtml(title) + "</div>" +
        (category ? '<div class="ppc-cat">' + escHtml(category) + "</div>" : "") +
        "</div>" +
        "</a>"
      );
    }

    function loadPostList(uid, path, containerId, emptyText) {
      var el = document.getElementById(containerId);
      if (!el) return;
      if (!dbReady()) {
        el.innerHTML = '<p class="profile-list-empty">' + escHtml(emptyText) + "</p>";
        return;
      }

      function renderList(ids) {
        el = document.getElementById(containerId); // পেজ ততক্ষণে পুনরায় রেন্ডার হতে পারে
        if (!el) return;
        if (!ids.length) {
          el.innerHTML = '<p class="profile-list-empty">' + escHtml(emptyText) + "</p>";
          return;
        }
        var postsMap = window.postsById;
        if (!postsMap) {
          // মূল পোস্ট তালিকা এখনো লোড হয়নি, একবার অপেক্ষা করা হচ্ছে
          el.innerHTML = '<p class="profile-list-empty">লোড হচ্ছে...</p>';
          document.addEventListener("ar:posts-ready", function handler() {
            document.removeEventListener("ar:posts-ready", handler);
            renderList(ids);
          });
          return;
        }
        el.innerHTML = ids.map(function (id) { return postCardHtml(id, postsMap[id]); }).join("");
      }

      window.rtdb
        .ref("users/" + uid + "/" + path)
        .once("value")
        .then(function (snap) {
          var val = snap.val() || {};
          var ids = Object.keys(val).sort(function (a, b) { return (val[b] || 0) - (val[a] || 0); });
          renderList(ids);
        })
        .catch(function () {
          el.innerHTML = '<p class="profile-list-empty">লোড করা যায়নি।</p>';
        });
    }

    // ---------- প্রোফাইলের HTML তৈরি ও বাইন্ড করা ----------
    function renderProfile(user) {
      var name = user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী");
      var email = user.email || "";
      var letter = (name || "?").trim().charAt(0).toUpperCase();
      var joined =
        user.metadata && user.metadata.creationTime ? formatDate(user.metadata.creationTime) : "";

      body.innerHTML =
        '<div class="profile-head">' +
        '  <div class="profile-avatar-wrap">' +
        '    <div class="profile-avatar" id="profile-avatar">' +
        escHtml(letter) +
        "</div>" +
        '    <button type="button" class="profile-avatar-edit" id="profile-avatar-edit" aria-label="ছবি পরিবর্তন করুন">' +
        CAMERA_ICON +
        "</button>" +
        '    <input type="file" id="profile-photo-input" accept="image/*" hidden>' +
        "  </div>" +
        '  <div class="profile-head-info">' +
        '    <h1 id="profile-name">' +
        escHtml(name) +
        "</h1>" +
        (joined ? '<p class="profile-joined">যোগদান: ' + escHtml(joined) + "</p>" : "") +
        '<p class="profile-bio" id="profile-bio"></p>' +
        "  </div>" +
        '  <button type="button" class="profile-edit-btn" id="profile-bio-edit-btn" aria-label="বায়ো এডিট">' +
        BIO_ICON +
        '<span>এডিট</span></button>' +
        "</div>" +
        '<p class="profile-photo-msg" id="profile-photo-msg"></p>' +
        '<div class="profile-section">' +
        "  <h2>সেভ করা পোস্ট</h2>" +
        '  <div class="profile-post-list" id="profile-saved-list"><p class="profile-list-empty">লোড হচ্ছে...</p></div>' +
        "</div>" +
        '<div class="profile-section">' +
        "  <h2>আপনার পড়া পোস্ট</h2>" +
        '  <div class="profile-post-list" id="profile-read-list"><p class="profile-list-empty">লোড হচ্ছে...</p></div>' +
        "</div>" +
        '<div class="profile-section">' +
        "  <h2>লাইক করা পোস্ট</h2>" +
        '  <div class="profile-post-list" id="profile-liked-list"><p class="profile-list-empty">লোড হচ্ছে...</p></div>' +
        "</div>";

      bindEditButton();
      bindAvatarUpload(user, letter);
      loadBio(user.uid);
      loadPostList(user.uid, "savedPosts", "profile-saved-list", "এখনো কোনো পোস্ট সেভ করেননি।");
      loadPostList(user.uid, "readPosts", "profile-read-list", "এখনো কোনো পোস্ট পড়েননি।");
      loadPostList(user.uid, "likedPosts", "profile-liked-list", "এখনো কোনো পোস্ট লাইক দেননি।");
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

    function renderEditBio(user) {
      editBioBody.innerHTML =
        '<form id="profile-bio-form">' +
        '  <textarea id="profile-bio-input" maxlength="' + BIO_MAX_LEN + '" placeholder="নিজের সম্পর্কে কয়েক লাইন লিখুন..."></textarea>' +
        '  <p class="profile-bio-count" id="profile-bio-count">0/' + BIO_MAX_LEN + "</p>" +
        '  <button type="submit" class="profile-save-btn" id="profile-bio-submit">সংরক্ষণ করুন</button>' +
        '  <p class="profile-msg" id="profile-bio-msg"></p>' +
        "</form>";

      var form = document.getElementById("profile-bio-form");
      var input = document.getElementById("profile-bio-input");
      var countEl = document.getElementById("profile-bio-count");
      var msg = document.getElementById("profile-bio-msg");
      var saveBtn = document.getElementById("profile-bio-submit");

      function updateCount() {
        countEl.textContent = input.value.length + "/" + BIO_MAX_LEN;
      }
      input.addEventListener("input", updateCount);

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

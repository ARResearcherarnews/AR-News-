/* notifications.js — নোটিফিকেশন বেল আইকন
   হেডারে লগইন করা থাকলে প্রোফাইল/অ্যাভাটার বাটনের বাম পাশে বেল আইকন দেখা যায়
   (feed.html-এ #notif-btn, CSS-এ .visible ক্লাস দিয়ে toggle হয়)।
   চাপ দিলে Full Story পেজের মতোই একই .detail-overlay কাঠামোয় একটা ফুল-স্ক্রিন
   পেজ খোলে, দুটো সেকশন নিয়ে:
   1) আসল ব্যক্তিগত নোটিফিকেশন — কেউ আপনার মন্তব্যে উত্তর দিলে (post.js থেকে
      users/{uid}/notifications-এ লেখা হয়), লগইন করা থাকলেই দেখা যাবে।
   2) সাম্প্রতিক আপলোড হওয়া পোস্টের তালিকা (সবার জন্য)।
   কোনো একটায় চাপ দিলে সরাসরি সেই পোস্টের Full Story (#post/ID) খুলে যায়। */
(function () {
  "use strict";

  var LAST_SEEN_POSTS_KEY = "ar-notif-last-seen";
  var MAX_POSTS = 20;
  var MAX_NOTIFS = 30;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  ready(function () {
    var notifBtn = document.getElementById("notif-btn");
    var notifDot = document.getElementById("notif-dot");
    var overlay = document.getElementById("notif-overlay");
    var body = document.getElementById("notif-body");
    var backBtn = document.getElementById("notif-back");

    if (!notifBtn || !overlay || !body) return;

    var myNotifsRef = null;
    var myNotifsHandler = null;
    var myNotifsData = null; // { notifId: {...} }

    function authReady() {
      return !!(window.firebase && firebase.auth);
    }
    function dbReady() {
      return !!window.rtdb;
    }

    function formatWhen(ts) {
      if (window.formatDate) return window.formatDate(ts);
      try {
        return new Date(ts).toLocaleDateString("bn-BD");
      } catch (e) {
        return "";
      }
    }

    // ---------- সাম্প্রতিক পোস্ট (সবার জন্য) ----------
    function getLastSeenPosts() {
      try {
        return parseInt(localStorage.getItem(LAST_SEEN_POSTS_KEY), 10) || 0;
      } catch (e) {
        return 0;
      }
    }
    function setLastSeenPosts(ts) {
      try {
        localStorage.setItem(LAST_SEEN_POSTS_KEY, String(ts));
      } catch (e) {}
    }
    function sortedPosts() {
      var map = window.postsById || {};
      return Object.keys(map)
        .map(function (id) { return [id, map[id]]; })
        .sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); })
        .slice(0, MAX_POSTS);
    }

    // ---------- ব্যক্তিগত নোটিফিকেশন (শুধু লগইন করা থাকলে) ----------
    function unreadNotifCount() {
      if (!myNotifsData) return 0;
      return Object.keys(myNotifsData).filter(function (k) { return !myNotifsData[k].read; }).length;
    }

    function subscribeMyNotifications(uid) {
      unsubscribeMyNotifications();
      if (!dbReady()) return;
      myNotifsRef = window.rtdb.ref("users/" + uid + "/notifications").orderByChild("createdAt").limitToLast(MAX_NOTIFS);
      myNotifsHandler = function (snap) {
        myNotifsData = snap.val();
        refreshDot();
        if (overlay.classList.contains("open")) renderBody();
      };
      myNotifsRef.on("value", myNotifsHandler);
    }

    function unsubscribeMyNotifications() {
      if (myNotifsRef && myNotifsHandler) myNotifsRef.off("value", myNotifsHandler);
      myNotifsRef = null;
      myNotifsHandler = null;
      myNotifsData = null;
    }

    // মার্ক-অল-রিড: পেজ খোলার সময় বর্তমানে লোড হওয়া সব নোটিফিকেশন পড়া হয়ে গেছে ধরে নেওয়া হয়
    function markAllNotifsRead(uid) {
      if (!dbReady() || !myNotifsData) return;
      var updates = {};
      Object.keys(myNotifsData).forEach(function (k) {
        if (!myNotifsData[k].read) updates["users/" + uid + "/notifications/" + k + "/read"] = true;
      });
      if (Object.keys(updates).length) window.rtdb.ref().update(updates).catch(function () {});
    }

    // ---------- বেল আইকনের উপর লাল ডট ----------
    function refreshDot() {
      var unread = unreadNotifCount();
      var posts = sortedPosts();
      var newPostAvailable = posts.length && posts[0][1].createdAt > getLastSeenPosts();
      notifDot.classList.toggle("visible", unread > 0 || !!newPostAvailable);
    }

    // ---------- হেডারের বেল আইকন লগইন থাকলেই দেখাবে ----------
    function reflectVisibility(user) {
      notifBtn.classList.toggle("visible", !!user);
      if (user) {
        subscribeMyNotifications(user.uid);
      } else {
        unsubscribeMyNotifications();
      }
      refreshDot();
    }

    function notifItemHtml(key, n) {
      var when = n.createdAt ? formatWhen(n.createdAt) : "";
      var fromName = n.fromName || "কেউ একজন";
      var postTitle = n.postTitle || "একটি পোস্ট";
      return (
        '<a class="notif-item' + (n.read ? "" : " unread") + '" href="#post/' + encodeURIComponent(n.postId) + '" data-notif-key="' + escHtml(key) + '">' +
        '<div class="notif-avatar">' + escHtml(fromName.trim().charAt(0).toUpperCase()) + "</div>" +
        '<div class="notif-info">' +
        '<div class="notif-line"><strong>' + escHtml(fromName) + "</strong> আপনার মন্তব্যে উত্তর দিয়েছেন</div>" +
        '<div class="notif-text">' + escHtml(n.text || "") + "</div>" +
        '<div class="notif-meta">' + escHtml(postTitle) + (when ? " · " + escHtml(when) : "") + "</div>" +
        "</div>" +
        (n.read ? "" : '<span class="notif-unread-dot"></span>') +
        "</a>"
      );
    }

    function postCardHtml(entry) {
      var id = entry[0];
      var post = entry[1];
      var title = post.title || "শিরোনামহীন";
      var category = post.category || "সাধারণ";
      var date = window.formatDate ? window.formatDate(post.createdAt) : "";
      var img = post.imageUrl ? '<img src="' + escHtml(post.imageUrl) + '" alt="">' : "";
      return (
        '<a class="profile-post-card" href="#post/' + encodeURIComponent(id) + '">' +
        '<div class="ppc-thumb' + (img ? "" : " ppc-thumb-empty") + '">' + img + "</div>" +
        '<div class="ppc-info">' +
        '<div class="ppc-title">' + escHtml(title) + "</div>" +
        '<div class="ppc-cat">' + escHtml(category) + (date ? " · " + escHtml(date) : "") + "</div>" +
        "</div>" +
        "</a>"
      );
    }

    // ---------- পুরো পেজ রেন্ডার ----------
    function renderBody() {
      var user = authReady() ? firebase.auth().currentUser : null;
      var posts = sortedPosts();

      var notifSection = "";
      if (user) {
        var notifEntries = myNotifsData
          ? Object.keys(myNotifsData).map(function (k) { return [k, myNotifsData[k]]; })
          : [];
        notifEntries.sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); });
        notifSection =
          "<h2>আপনার নোটিফিকেশন</h2>" +
          (notifEntries.length
            ? '<div class="notif-list">' + notifEntries.map(function (e) { return notifItemHtml(e[0], e[1]); }).join("") + "</div>"
            : '<p class="profile-list-empty">এখনো কোনো নোটিফিকেশন নেই — কেউ আপনার মন্তব্যে উত্তর দিলে এখানে দেখাবে।</p>');
      }

      var postsSection =
        '<h2 class="notif-section-title">সাম্প্রতিক পোস্ট</h2>' +
        (posts.length
          ? '<div class="profile-post-list">' + posts.map(postCardHtml).join("") + "</div>"
          : '<p class="profile-list-empty">এখনো কোনো পোস্ট নেই।</p>');

      body.innerHTML = notifSection + postsSection;
    }

    function openNotifications() {
      renderBody();
      overlay.classList.add("open");
      overlay.scrollTop = 0;

      var user = authReady() ? firebase.auth().currentUser : null;
      if (user) markAllNotifsRead(user.uid);

      var posts = sortedPosts();
      if (posts.length) setLastSeenPosts(posts[0][1].createdAt || Date.now());
      notifDot.classList.remove("visible");
    }

    function closeNotifications() {
      overlay.classList.remove("open");
    }

    function route() {
      if (location.hash === "#notifications") openNotifications();
      else closeNotifications();
    }

    notifBtn.addEventListener("click", function () {
      location.hash = "notifications";
    });
    if (backBtn) backBtn.addEventListener("click", function () { history.back(); });
    window.addEventListener("hashchange", route);

    // পোস্ট তালিকা লোড/আপডেট হলে ডট রিফ্রেশ ও পেজ খোলা থাকলে বডি রিফ্রেশ
    document.addEventListener("ar:posts-ready", function () {
      refreshDot();
      if (overlay.classList.contains("open")) renderBody();
    });

    if (authReady()) {
      firebase.auth().onAuthStateChanged(function (user) {
        reflectVisibility(user);
      });
    }

    if (location.hash === "#notifications") route();
  });
})();
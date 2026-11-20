/* notifications.js — নোটিফিকেশন বেল আইকন
   হেডারে লগইন করা থাকলে প্রোফাইল/অ্যাভাটার বাটনের বাম পাশে বেল আইকন দেখা যায়
   (feed.html-এ #notif-btn, CSS-এ .visible ক্লাস দিয়ে toggle হয়)।
   চাপ দিলে Full Story পেজের মতোই একই .detail-overlay কাঠামোয় একটা ফুল-স্ক্রিন
   পেজ খোলে, দুটো সেকশন নিয়ে:
   1) আসল ব্যক্তিগত নোটিফিকেশন — কেউ আপনার মন্তব্যে উত্তর দিলে (post.js থেকে
      users/{uid}/notifications-এ লেখা হয়), লগইন করা থাকলেই দেখা যাবে।
   2) সাম্প্রতিক আপলোড হওয়া পোস্টের তালিকা (সবার জন্য)।
   কোনো একটায় চাপ দিলে সরাসরি সেই পোস্টের Full Story (#post/ID) খুলে যায়।
   ডিজাইন: দুটো তালিকা এক সময়-ক্রমের তালিকায় মিলিয়ে দেখানো হয়; ওপরে ফিল্টার (সব / কমেন্ট / নতুন পোস্ট)। */
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
    var activeFilter = "all"; // all | reply | post
    var seenAtOpen = 0;       // পেজ খোলার সময় শেষ দেখা পোস্টের সময় (নতুন পোস্টে লাল ডট দেখাতে)
    var unreadAtOpen = {};    // পেজ খোলার সময় যেগুলো অপঠিত ছিল (খোলা থাকা অবস্থায় ডট থাকে)

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

    function ic(d, fill) { return '<svg viewBox="0 0 24 24" fill="' + (fill || "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; }
    var ICON_LIKE = ic('<path d="M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.9-8 10.6-8 10.6z"/>', "currentColor");
    var ICON_CMT = ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/>');
    var ICON_FOLLOW = ic('<circle cx="9" cy="8" r="3.4"/><path d="M3 20c.5-3.6 3-5.5 6-5.5s5.5 1.9 6 5.5M18 8v6M15 11h6"/>');
    var ICON_BELL = ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4"/>');
    var ICON_CHEV = ic('<path d="m9 6 6 6-6 6"/>');
    var ICON_GEAR = ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>');

    // নোটিফিকেশনের ধরন (n.type): like | comment | reply | follow | system — না থাকলে "reply" (post.js যেটা লেখে)
    var TYPES = {
      like:    { cls: "lk", icon: ICON_LIKE,   filter: "like",    tail: "আপনার একটি পোস্টে লাইক করেছেন।" },
      comment: { cls: "cm", icon: ICON_CMT,    filter: "comment", tail: "আপনার পোস্টে কমেন্ট করেছেন।" },
      reply:   { cls: "cm", icon: ICON_CMT,    filter: "comment", tail: "আপনার মন্তব্যে উত্তর দিয়েছেন।" },
      follow:  { cls: "fl", icon: ICON_FOLLOW, filter: "follow",  tail: "আপনাকে ফলো করেছেন।" },
      system:  { cls: "sy", icon: ICON_BELL,   filter: "system",  tail: "" }
    };
    var FILTERS = [["all", "সব"], ["like", "পছন্দ"], ["comment", "কমেন্ট"], ["follow", "ফলো"], ["system", "সিস্টেম"]];

    function thumbHtml(postId, unread) {
      var p = postId ? (window.postsById || {})[postId] : null;
      var url = p && p.imageUrl;
      if (url) {
        return '<span class="notif-side"><img class="notif-thumb" src="' + escHtml(url) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          (unread ? '<span class="notif-unread-dot"></span>' : "") + "</span>";
      }
      return '<span class="notif-chev">' + ICON_CHEV + (unread ? '<span class="notif-unread-dot"></span>' : "") + "</span>";
    }

    function itemHtml(o) {
      // o: { cls, icon, avatar, avatarImg, name, tail, quote, when, postId, unread, key }
      var open = o.postId ? '<a class="notif-item" href="#post/' + encodeURIComponent(o.postId) + '"' : '<div class="notif-item"';
      var close = o.postId ? "</a>" : "</div>";
      return (
        open + (o.key ? ' data-notif-key="' + escHtml(o.key) + '"' : "") + ">" +
        '<span class="notif-type ' + o.cls + '">' + o.icon + "</span>" +
        '<span class="notif-avatar">' + (o.avatarImg ? '<img src="logo.png" alt="" onerror="this.remove()">' : "") + escHtml(o.avatar) + "</span>" +
        '<div class="notif-info">' +
        '<div class="notif-line"><strong>' + escHtml(o.name) + "</strong>" + (o.tail ? " " + escHtml(o.tail) : "") + "</div>" +
        (o.quote ? '<div class="notif-text">' + escHtml(o.quote) + "</div>" : "") +
        '<div class="notif-meta">' + escHtml(o.when) + "</div>" +
        "</div>" + thumbHtml(o.postId, o.unread) + close
      );
    }

    function personalItem(key, n) {
      var t = TYPES[n.type] || TYPES.reply;
      var system = t === TYPES.system;
      var name = n.fromName || (system ? "AR News" : "কেউ একজন");
      return {
        type: t.filter,
        ts: n.createdAt || 0,
        html: itemHtml({
          cls: t.cls, icon: t.icon, key: key,
          avatar: name.trim().charAt(0).toUpperCase(), avatarImg: system,
          name: name, tail: system ? (n.text || "") : t.tail,
          quote: !system && n.text ? "“" + n.text + "”" : "",
          when: n.createdAt ? formatWhen(n.createdAt) : "",
          postId: n.postId, unread: !n.read || !!unreadAtOpen[key]
        })
      };
    }

    // নতুন পোস্ট প্রকাশিত হয়েছে — "সিস্টেম" ধরনের
    function postItem(entry) {
      var id = entry[0], post = entry[1];
      var when = post.createdAt && window.formatDate ? window.formatDate(post.createdAt) : "";
      return {
        type: "system",
        ts: post.createdAt || 0,
        html: itemHtml({
          cls: "sy", icon: ICON_BELL, avatar: "A", avatarImg: true,
          name: "AR News", tail: "নতুন পোস্ট প্রকাশ করেছে।",
          quote: post.title || "শিরোনামহীন",
          when: (post.category || "সাধারণ") + (when ? " · " + when : ""),
          postId: id, unread: (post.createdAt || 0) > seenAtOpen
        })
      };
    }

    // প্রতি ৭–৮টি আইটেমের পর বিজ্ঞাপন (feed.html-এর window.arAds); না থাকলে শুধু আইটেম
    function withAds(htmlList) {
      return window.arAds && window.arAds.interleave ? window.arAds.interleave(htmlList) : htmlList.join("");
    }

    // ---------- পুরো পেজ রেন্ডার ----------
    function renderBody() {
      var user = authReady() ? firebase.auth().currentUser : null;
      var items = [];

      if (user && myNotifsData) {
        Object.keys(myNotifsData).forEach(function (k) { items.push(personalItem(k, myNotifsData[k])); });
      }
      sortedPosts().forEach(function (e) { items.push(postItem(e)); });
      items.sort(function (a, b) { return b.ts - a.ts; });

      var shown = items.filter(function (it) { return activeFilter === "all" || it.type === activeFilter; });

      body.innerHTML =
        '<div class="notif-head"><h1 class="notif-title">নোটিফিকেশন</h1>' +
        '<button type="button" class="notif-gear" aria-label="সেটিংস">' + ICON_GEAR + "</button></div>" +
        '<div class="notif-chips" role="tablist">' +
        FILTERS.map(function (c) {
          return '<button type="button" class="notif-chip' + (c[0] === activeFilter ? " active" : "") + '" data-filter="' + c[0] + '" role="tab" aria-selected="' + (c[0] === activeFilter) + '">' + c[1] + "</button>";
        }).join("") + "</div>" +
        (shown.length
          ? '<div class="notif-list">' + withAds(shown.map(function (it) { return it.html; })) + "</div>"
          : '<p class="notif-empty">এখনো কোনো নোটিফিকেশন নেই।</p>');
    }

    function openNotifications() {
      if (!overlay.classList.contains("open")) {
        seenAtOpen = getLastSeenPosts();
        unreadAtOpen = {};
        if (myNotifsData) Object.keys(myNotifsData).forEach(function (k) { if (!myNotifsData[k].read) unreadAtOpen[k] = true; });
      }
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

    body.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".notif-gear")) { location.hash = "settings"; return; }
      var chip = e.target.closest ? e.target.closest(".notif-chip") : null;
      if (!chip) return;
      activeFilter = chip.getAttribute("data-filter") || "all";
      renderBody();
    });
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

/* post.js — ফুল স্টোরি পেজের জন্য Like, Comment, View, Share অ্যাকশন বার
   এই বারটা ছবির ঠিক নিচে বসে (আগে যেই শেয়ার বাটন উপরের বারে ছিল, সেটা এখন এখানে সরানো হয়েছে)।
   Like ও View সংখ্যা Firebase Realtime Database-এ (window.rtdb) সংরক্ষিত থাকে,
   যেভাবে feed.html-এ আগে থেকেই stats/totalVisits গোনা হয়।
   কমেন্ট করতে লগইন থাকা আবশ্যক; না থাকলে লগইন করার অনুরোধ দেখানো হয়।

   feed.html-এর openDetail()/closeDetail() ফাংশন থেকে এই ফাইলের render(id, post)
   ও cleanup() হুক কল করা হয়, কারণ পোস্টের মূল HTML সেখানেই বসানো হয়। */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- আইকন ----------
  var ICON_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  var ICON_HEART_FILL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  var ICON_BOOKMARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg>';
  var ICON_BOOKMARK_FILL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/></svg>';
  var ICON_COMMENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.9-.9L3 21l1.9-5.6a8.4 8.4 0 0 1-.9-3.9 8.5 8.5 0 1 1 17 0Z"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>';
  var ICON_GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>';

  ready(function () {
    if (!document.getElementById("detail-overlay")) return;

    // ---------- অবস্থা (state) ----------
    var state = {
      postId: null,
      post: null,
      liked: false,
      saved: false,
      likeRef: null,
      statsRef: null,
      commentsRef: null,
      commentsData: null,
      commentsPageSize: 20,
      commentsTotal: null,
      statsHandler: null,
      commentsHandler: null,
      repliesRef: null,
      repliesData: null,
      repliesHandler: null,
      docClickHandler: null,
    };

    // মন্তব্য "Load More" — প্রথমে এতগুলো দেখানো হয়, বাটনে চাপলে আরও এতগুলো করে যোগ হবে
    var COMMENTS_PAGE_SIZE = 20;

    // ---------- স্প্যাম প্রতিরোধ: কমেন্ট/রিপ্লাইয়ের মাঝে কমপক্ষে এতক্ষণ (ms) অপেক্ষা করতে হবে ----------
    // এই একই cooldown কমেন্ট আর রিপ্লাই দুটোতেই প্রযোজ্য (একজন ইউজারের সামগ্রিক পোস্টিং রেট)।
    // শুধু ক্লায়েন্ট-সাইড UX guard এটা — আসল নিরাপত্তা database.rules.json-এ
    // users/{uid}/lastCommentAt চেক করে সার্ভার-সাইডে বলবৎ করা হয়েছে।
    var COMMENT_COOLDOWN_MS = 10000;
    var nextAllowedCommentAt = 0;

    function cooldownRemainingSec() {
      return Math.max(0, Math.ceil((nextAllowedCommentAt - Date.now()) / 1000));
    }

    function authReady() {
      return !!(window.firebase && firebase.auth);
    }
    function dbReady() {
      return !!window.rtdb;
    }

    // ---------- কমেন্ট মোডাল (লগইন মোডালের মতোই নিচ থেকে স্লাইড করে ওঠে) ----------
    var commentOverlay = document.getElementById("comment-overlay");
    var commentModalBody = document.getElementById("comment-modal-body");
    var commentCloseBtn = document.getElementById("comment-close");

    function openCommentModal() {
      if (!commentOverlay) return;
      commentOverlay.classList.add("open");
      var input = document.getElementById("comment-input");
      if (input) setTimeout(function () { input.focus(); }, 300);
    }
    function closeCommentModal() {
      if (commentOverlay) commentOverlay.classList.remove("open");
    }
    if (commentCloseBtn) commentCloseBtn.addEventListener("click", closeCommentModal);
    if (commentOverlay) {
      commentOverlay.addEventListener("click", function (e) {
        if (e.target === commentOverlay) closeCommentModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && commentOverlay && commentOverlay.classList.contains("open")) {
        closeCommentModal();
      }
    });
    function increment(n) {
      return firebase.database.ServerValue.increment(n);
    }

    function escHtml(str) {
      var div = document.createElement("div");
      div.textContent = str == null ? "" : String(str);
      return div.innerHTML;
    }

    function excerpt(text, len) {
      var t = (text || "").replace(/\s+/g, " ").trim();
      if (t.length <= (len || 140)) return t;
      return t.slice(0, len || 140).trim() + "…";
    }

    function formatDateTime(ts) {
      try {
        var d = new Date(ts);
        return d.toLocaleDateString("bn-BD", { year: "numeric", month: "short", day: "numeric" }) +
          " · " + d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        return "";
      }
    }

    // লাইক দিতে এখন লগইন বাধ্যতামূলক — লগইন করা না থাকলে null রিটার্ন করবে
    function getViewerId() {
      if (authReady() && firebase.auth().currentUser) return "u_" + firebase.auth().currentUser.uid;
      return null;
    }

    // ---------- ভিউ গণনা (সেশনে একবার প্রতি পোস্টে) + লগইন থাকলে "পঠিত" তালিকায় যোগ ----------
    // ভিউ গণনা — আগে sessionStorage ব্যবহার হতো যেটা ব্রাউজার/ট্যাব বন্ধ করলেই
    // রিসেট হয়ে যেত, তাই একই ইউজার বারবার দেখলে ভিউ বাড়তেই থাকতো। এখন:
    // - লগইন করা থাকলে: সার্ভারে (users/{uid}/readPosts) চেক করা হয় — স্থায়ী, যেকোনো ডিভাইস/ব্রাউজার থেকে একবারই গণনা হবে
    // - লগইন করা না থাকলে: localStorage ব্যবহার হয় (sessionStorage-এর মতো সেশন শেষে মুছে যায় না)
    function countViewOnce(id) {
      if (!dbReady()) return;
      var user = authReady() ? firebase.auth().currentUser : null;

      if (user) {
        var readRef = window.rtdb.ref("users/" + user.uid + "/readPosts/" + id);
        readRef
          .once("value")
          .then(function (snap) {
            var alreadyRead = snap.exists();
            readRef.set(firebase.database.ServerValue.TIMESTAMP).catch(function () {});
            if (!alreadyRead) {
              window.rtdb.ref("postStats/" + id + "/views").set(increment(1)).catch(function () {});
            }
          })
          .catch(function () {});
        return;
      }

      var lKey = "ar_viewed_" + id;
      var already = false;
      try {
        already = !!localStorage.getItem(lKey);
        localStorage.setItem(lKey, "1");
      } catch (e) {}
      if (!already) {
        window.rtdb.ref("postStats/" + id + "/views").set(increment(1)).catch(function () {});
      }
    }

    // ---------- লাইক বাটন ----------
    function likeButtonHtml() {
      return (
        '<button type="button" class="post-action-btn" id="post-like-btn" aria-label="লাইক">' +
        '<span id="post-like-icon">' + ICON_HEART + "</span>" +
        '<span class="post-action-count" id="post-like-count" data-count="0">0</span>' +
        "</button>"
      );
    }

    function updateLikeUI() {
      var btn = document.getElementById("post-like-btn");
      var icon = document.getElementById("post-like-icon");
      var countEl = document.getElementById("post-like-count");
      if (!btn || !icon || !countEl) return;
      btn.classList.toggle("liked", state.liked);
      icon.innerHTML = state.liked ? ICON_HEART_FILL : ICON_HEART;
      var n = parseInt(countEl.dataset.count || "0", 10) || 0;
      countEl.textContent = n;
    }

    function bindLikeButton(id) {
      var btn = document.getElementById("post-like-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        if (!dbReady()) return;
        var user = authReady() ? firebase.auth().currentUser : null;
        if (!user) {
          document.dispatchEvent(new CustomEvent("ar:open-login"));
          return;
        }
        var viewerId = getViewerId();
        var likeRef = window.rtdb.ref("postLikes/" + id + "/" + viewerId);
        var statsLikeRef = window.rtdb.ref("postStats/" + id + "/likes");
        var userLikeRef = window.rtdb.ref("users/" + user.uid + "/likedPosts/" + id);
        if (state.liked) {
          state.liked = false;
          likeRef.remove().catch(function () {});
          statsLikeRef.set(increment(-1)).catch(function () {});
          userLikeRef.remove().catch(function () {});
        } else {
          state.liked = true;
          likeRef.set(true).catch(function () {});
          statsLikeRef.set(increment(1)).catch(function () {});
          userLikeRef.set(firebase.database.ServerValue.TIMESTAMP).catch(function () {});
        }
        updateLikeUI();
      });

      // এই পোস্টে ভিউয়ার আগে লাইক দিয়েছে কিনা যাচাই (শুধু লগইন করা থাকলে)
      var viewerId = getViewerId();
      if (dbReady() && viewerId) {
        window.rtdb
          .ref("postLikes/" + id + "/" + viewerId)
          .once("value")
          .then(function (snap) {
            state.liked = !!snap.val();
            updateLikeUI();
          })
          .catch(function () {});
      }
    }

    // ---------- বুকমার্ক (সেভ) বাটন — পরে পড়ার জন্য, Like থেকে আলাদা ----------
    function bookmarkButtonHtml() {
      return (
        '<button type="button" class="post-action-btn icon-only" id="post-bookmark-btn" aria-label="সেভ করুন">' +
        '<span id="post-bookmark-icon">' + ICON_BOOKMARK + "</span>" +
        "</button>"
      );
    }

    function updateBookmarkUI() {
      var btn = document.getElementById("post-bookmark-btn");
      var icon = document.getElementById("post-bookmark-icon");
      if (!btn || !icon) return;
      btn.classList.toggle("saved", state.saved);
      icon.innerHTML = state.saved ? ICON_BOOKMARK_FILL : ICON_BOOKMARK;
      btn.setAttribute("aria-label", state.saved ? "সেভ করা হয়েছে" : "সেভ করুন");
    }

    function bindBookmarkButton(id) {
      var btn = document.getElementById("post-bookmark-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        if (!dbReady()) return;
        var user = authReady() ? firebase.auth().currentUser : null;
        if (!user) {
          document.dispatchEvent(new CustomEvent("ar:open-login"));
          return;
        }
        var savedRef = window.rtdb.ref("users/" + user.uid + "/savedPosts/" + id);
        if (state.saved) {
          state.saved = false;
          savedRef.remove().catch(function () {});
        } else {
          state.saved = true;
          savedRef.set(firebase.database.ServerValue.TIMESTAMP).catch(function () {});
        }
        updateBookmarkUI();
      });

      var user = authReady() ? firebase.auth().currentUser : null;
      if (dbReady() && user) {
        window.rtdb
          .ref("users/" + user.uid + "/savedPosts/" + id)
          .once("value")
          .then(function (snap) {
            state.saved = !!snap.val();
            updateBookmarkUI();
          })
          .catch(function () {});
      }
    }

    // ---------- কমেন্ট বাটন (স্ক্রল করে কমেন্ট সেকশনে নিয়ে যায়) ----------
    function commentButtonHtml() {
      return (
        '<button type="button" class="post-action-btn" id="post-comment-btn" aria-label="মন্তব্য">' +
        ICON_COMMENT +
        '<span class="post-action-count" id="post-comment-count">0</span>' +
        "</button>"
      );
    }

    function bindCommentButton() {
      var btn = document.getElementById("post-comment-btn");
      if (!btn) return;
      btn.addEventListener("click", openCommentModal);
    }

    // ---------- শেয়ার বাটন + ড্রপডাউন ----------
    function shareButtonHtml() {
      return (
        '<button type="button" class="post-action-btn icon-only" id="post-share-btn" aria-label="শেয়ার করুন">' +
        ICON_SHARE +
        "</button>"
      );
    }

    var SHARE_ICONS = {
      x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.7L4.5 22H1.3l8-9.2L1 2h7.1l4.9 6.2L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.6l.4-3h-3v-1.9c0-.87.24-1.46 1.5-1.46h1.6V4.35c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.42-3.9 4V10.4H7.8v3h2.6V21h3.1Z"/></svg>',
      whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.2.4.8 3-3.1-.8-.4.2A8.2 8.2 0 1 1 12 3.8Zm-3.1 4.4c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.1 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.6.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.9 1-.1.2-.3.2-.6.1-.3-.2-1.2-.5-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.9-2Z"/></svg>',
      telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.8 20c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13 1.9 11.5c-1-.3-1-1 .2-1.5L20.6 3.3c.8-.3 1.6.2 1.3 1Z"/></svg>',
      copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    };

    var shareSheetOverlay = document.getElementById("share-sheet-overlay");
    var shareSheetBody = document.getElementById("share-sheet-body");
    var shareSheetCloseBtn = document.getElementById("share-sheet-close");
    var currentShare = { url: "", title: "" };

    function openShareSheet() {
      if (!shareSheetOverlay) return;
      shareSheetOverlay.classList.add("open");
    }
    function closeShareSheet() {
      if (shareSheetOverlay) shareSheetOverlay.classList.remove("open");
    }
    if (shareSheetCloseBtn) shareSheetCloseBtn.addEventListener("click", closeShareSheet);
    if (shareSheetOverlay) {
      shareSheetOverlay.addEventListener("click", function (e) {
        if (e.target === shareSheetOverlay) closeShareSheet();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && shareSheetOverlay && shareSheetOverlay.classList.contains("open")) {
        closeShareSheet();
      }
    });

    // শেয়ার শিটের ক্লিক-ডেলিগেশন একবারই বসানো হয় (শেয়ার বাটন প্রতি পোস্টে নতুন
    // করে তৈরি হলেও #share-sheet-body স্থায়ী, তাই বারবার লিসেনার বসালে জমে যেত)
    if (shareSheetBody) {
      var shareToast = document.getElementById("share-toast");
      shareSheetBody.addEventListener("click", async function (e) {
        var b = e.target.closest("button[data-share]");
        if (!b) return;
        var shareUrl = currentShare.url;
        var shareTitle = currentShare.title;
        switch (b.dataset.share) {
          case "x":
            window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareTitle) + "&url=" + encodeURIComponent(shareUrl), "_blank", "noopener,width=560,height=480");
            break;
          case "facebook":
            window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl), "_blank", "noopener,width=560,height=480");
            break;
          case "whatsapp":
            window.open("https://wa.me/?text=" + encodeURIComponent(shareTitle + "\n" + shareUrl), "_blank", "noopener");
            break;
          case "telegram":
            window.open("https://t.me/share/url?url=" + encodeURIComponent(shareUrl) + "&text=" + encodeURIComponent(shareTitle), "_blank", "noopener,width=560,height=480");
            break;
          case "copy":
            try {
              if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(shareUrl);
              } else {
                var ta = document.createElement("textarea");
                ta.value = shareUrl;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                ta.remove();
              }
              if (shareToast) {
                shareToast.classList.add("show");
                setTimeout(function () { shareToast.classList.remove("show"); }, 1800);
              }
            } catch (_) {
              alert(shareUrl);
            }
            break;
        }
        closeShareSheet();
      });
    }

    function bindShareButton(id, post) {
      var btn = document.getElementById("post-share-btn");
      if (!btn || !shareSheetBody) return;

      var shareUrl = location.origin + location.pathname + "?post=" + encodeURIComponent(id);
      var shareTitle = post.title || "AR News";

      var items = [
        { key: "x", label: "Twitter / X" },
        { key: "facebook", label: "Facebook" },
        { key: "whatsapp", label: "WhatsApp" },
        { key: "telegram", label: "Telegram" },
        { key: "copy", label: "Copy Link" },
      ];

      btn.addEventListener("click", function () {
        currentShare.url = shareUrl;
        currentShare.title = shareTitle;
        shareSheetBody.innerHTML =
          "<h2>শেয়ার করুন</h2>" +
          '<div class="share-sheet-list">' +
          items
            .map(function (it) {
              return (
                '<button type="button" class="share-sheet-item" data-share="' + it.key + '">' +
                '<span class="ssi-icon">' + SHARE_ICONS[it.key] + "</span>" +
                "<span>" + it.label + "</span>" +
                "</button>"
              );
            })
            .join("") +
          "</div>";
        openShareSheet();
      });
    }

    // ---------- কমেন্ট/রিপ্লাই রিপোর্ট শিট ----------
    var REPORT_REASONS = [
      { key: "spam", label: "স্প্যাম" },
      { key: "abusive", label: "আপত্তিকর / হয়রানিমূলক" },
      { key: "misinformation", label: "ভুয়া তথ্য" },
      { key: "other", label: "অন্যান্য" },
    ];

    var reportSheetOverlay = document.getElementById("report-sheet-overlay");
    var reportSheetBody = document.getElementById("report-sheet-body");
    var reportSheetCloseBtn = document.getElementById("report-sheet-close");
    var currentReport = null; // { postId, commentId, replyId, text, authorUid, authorName }

    function openReportSheet() {
      if (!reportSheetOverlay) return;
      reportSheetOverlay.classList.add("open");
    }
    function closeReportSheet() {
      if (reportSheetOverlay) reportSheetOverlay.classList.remove("open");
    }
    if (reportSheetCloseBtn) reportSheetCloseBtn.addEventListener("click", closeReportSheet);
    if (reportSheetOverlay) {
      reportSheetOverlay.addEventListener("click", function (e) {
        if (e.target === reportSheetOverlay) closeReportSheet();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && reportSheetOverlay && reportSheetOverlay.classList.contains("open")) {
        closeReportSheet();
      }
    });

    function renderReportReasons(msg) {
      if (!reportSheetBody) return;
      reportSheetBody.innerHTML =
        "<h2>কেন রিপোর্ট করছেন?</h2>" +
        '<p class="report-sub">কারণ বেছে নিলেই রিপোর্ট পাঠানো হয়ে যাবে</p>' +
        '<div class="share-sheet-list">' +
        REPORT_REASONS.map(function (r) {
          return '<button type="button" class="share-sheet-item" data-reason="' + r.key + '">' + r.label + "</button>";
        }).join("") +
        "</div>" +
        (msg ? '<p class="profile-msg" style="margin-top:10px">' + escHtml(msg) + "</p>" : "");
    }

    // শিটের ভেতরের ক্লিক-ডেলিগেশন একবারই বসানো হয়
    if (reportSheetBody) {
      reportSheetBody.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-reason]");
        if (!b || !currentReport) return;
        if (!dbReady() || !authReady() || !firebase.auth().currentUser) return;
        var user = firebase.auth().currentUser;
        var reportKey =
          currentReport.commentId + (currentReport.replyId ? "_" + currentReport.replyId : "_c") + "_" + user.uid;

        window.rtdb
          .ref("reports/" + reportKey)
          .set({
            postId: currentReport.postId,
            postTitle: (state.post && state.post.title) || "",
            commentId: currentReport.commentId,
            replyId: currentReport.replyId || null,
            commentText: currentReport.text,
            commentAuthorUid: currentReport.authorUid,
            commentAuthorName: currentReport.authorName,
            reporterUid: user.uid,
            reporterName: user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী"),
            reason: b.dataset.reason,
            status: "pending",
            createdAt: firebase.database.ServerValue.TIMESTAMP,
          })
          .then(function () {
            renderReportReasons("রিপোর্ট পাঠানো হয়েছে, ধন্যবাদ।");
            setTimeout(closeReportSheet, 1200);
          })
          .catch(function (err) {
            renderReportReasons(
              err && err.code === "PERMISSION_DENIED"
                ? "আপনি ইতিমধ্যে এই মন্তব্যটি রিপোর্ট করেছেন।"
                : "রিপোর্ট পাঠানো যায়নি, আবার চেষ্টা করুন।"
            );
          });
      });
    }

    // ---------- ভিউ কাউন্ট ----------
    function viewsHtml() {
      return '<span class="post-action-views">' + ICON_EYE + '<span id="post-view-count">0</span></span>';
    }

    function translateButtonHtml() {
      return (
        '<button type="button" class="post-action-btn icon-only" id="translate-btn" aria-label="Translate">' +
        ICON_GLOBE +
        "</button>"
      );
    }

    // ---------- Like/View লাইভ সংখ্যা শোনা ----------
    function listenStats(id) {
      if (!dbReady()) return;
      state.statsRef = window.rtdb.ref("postStats/" + id);
      state.statsHandler = function (snap) {
        var val = snap.val() || {};
        var likeCountEl = document.getElementById("post-like-count");
        var viewCountEl = document.getElementById("post-view-count");
        if (likeCountEl) {
          likeCountEl.dataset.count = String(val.likes || 0);
          updateLikeUI();
        }
        if (viewCountEl) viewCountEl.textContent = val.views || 0;
        state.commentsTotal = val.comments || 0;
        renderComments();
      };
      state.statsRef.on("value", state.statsHandler);
    }

    // ---------- কমেন্ট সেকশন ----------
    function commentsSectionHtml() {
      var user = authReady() ? firebase.auth().currentUser : null;
      return (
        '<div class="post-comments">' +
        '<h2 id="comments-heading">মন্তব্য</h2>' +
        (user
          ? '<form class="comment-form" id="comment-form">' +
            '<input type="text" id="comment-input" placeholder="আপনার মন্তব্য লিখুন..." maxlength="500" required>' +
            '<button type="submit" id="comment-submit">পোস্ট করুন</button>' +
            '<p class="comment-form-msg" id="comment-form-msg"></p>' +
            "</form>"
          : '<p class="comment-login-hint">মন্তব্য করতে <button type="button" id="comment-login-btn">লগইন করুন</button></p>') +
        '<div class="comment-list" id="comment-list"><p class="comment-empty">মন্তব্য লোড হচ্ছে...</p></div>' +
        '<button type="button" class="comment-load-more" id="comment-load-more" hidden>আরও মন্তব্য দেখুন</button>' +
        "</div>"
      );
    }

    // ---------- মন্তব্যের মালিককে "আপনার মন্তব্যে উত্তর এসেছে" নোটিফিকেশন পাঠানো ----------
    function notifyCommentAuthorOfReply(commentKey, replyText, fromUser, fromName) {
      if (!dbReady()) return;
      var parentComment = state.commentsData && state.commentsData[commentKey];
      if (!parentComment || !parentComment.uid) return;
      if (parentComment.uid === fromUser.uid) return; // নিজের কমেন্টে নিজে রিপ্লাই দিলে নোটিফাই করার দরকার নেই

      var notifKey = window.rtdb.ref("users/" + parentComment.uid + "/notifications").push().key;
      window.rtdb
        .ref("users/" + parentComment.uid + "/notifications/" + notifKey)
        .set({
          type: "reply",
          postId: state.postId,
          postTitle: (state.post && state.post.title) || "",
          commentId: commentKey,
          fromUid: fromUser.uid,
          fromName: fromName,
          text: excerpt(replyText, 120),
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          read: false,
        })
        .catch(function () {}); // ব্যর্থ হলেও রিপ্লাই দেওয়ায় কোনো সমস্যা নেই, শুধু নোটিফিকেশন যাবে না
    }

    function bindCommentForm(id) {
      var loginBtn = document.getElementById("comment-login-btn");
      if (loginBtn) {
        loginBtn.addEventListener("click", function () {
          document.dispatchEvent(new CustomEvent("ar:open-login"));
        });
      }

      var form = document.getElementById("comment-form");
      if (form && dbReady() && authReady()) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var input = document.getElementById("comment-input");
          var submitBtn = document.getElementById("comment-submit");
          var msg = document.getElementById("comment-form-msg");
          var text = input.value.trim();
          if (!text) return;
          var user = firebase.auth().currentUser;
          if (!user) return;

          if (cooldownRemainingSec() > 0) {
            if (msg) msg.textContent = "একটু অপেক্ষা করুন (" + cooldownRemainingSec() + " সেকেন্ড), তারপর আবার চেষ্টা করুন।";
            return;
          }
          if (msg) msg.textContent = "";

          var name = user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী");
          var newKey = window.rtdb.ref("postComments/" + id).push().key;
          var updates = {};
          updates["postComments/" + id + "/" + newKey] = {
            uid: user.uid,
            name: name,
            text: text,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
          };
          updates["users/" + user.uid + "/lastCommentAt"] = firebase.database.ServerValue.TIMESTAMP;
          updates["postStats/" + id + "/comments"] = increment(1);

          submitBtn.disabled = true;
          window.rtdb
            .ref()
            .update(updates)
            .then(function () {
              input.value = "";
              nextAllowedCommentAt = Date.now() + COMMENT_COOLDOWN_MS;
            })
            .catch(function (err) {
              if (msg) {
                msg.textContent =
                  err && err.code === "PERMISSION_DENIED"
                    ? "একটু ধীরে — এত দ্রুত মন্তব্য করা যাবে না।"
                    : "মন্তব্য পোস্ট করা যায়নি, আবার চেষ্টা করুন।";
              }
            })
            .finally(function () {
              submitBtn.disabled = false;
            });
        });
      }

      // কমেন্ট-লিস্টে "উত্তর দিন" বাটন ও রিপ্লাই ফর্ম — লিস্ট re-render হলেও
      // এই লিসেনার একবারই বসানো হয় (event delegation), তাই সবসময় কাজ করবে
      var list = document.getElementById("comment-list");
      if (!list) return;

      list.addEventListener("click", function (e) {
        var replyBtn = e.target.closest(".c-reply-btn");
        if (replyBtn) {
          if (!authReady() || !firebase.auth().currentUser) {
            document.dispatchEvent(new CustomEvent("ar:open-login"));
            return;
          }
          var key = replyBtn.dataset.replyFor;
          var wrap = document.getElementById("reply-form-wrap-" + key);
          if (!wrap) return;
          wrap.hidden = !wrap.hidden;
          if (!wrap.hidden) {
            var input = wrap.querySelector("input");
            if (input) setTimeout(function () { input.focus(); }, 50);
          }
          return;
        }

        var deleteCommentBtn = e.target.closest("[data-delete-comment]");
        if (deleteCommentBtn) {
          if (!dbReady() || !authReady() || !firebase.auth().currentUser) return;
          if (!confirm("এই মন্তব্যটি মুছে ফেলতে চান?")) return;
          var commentKey = deleteCommentBtn.dataset.deleteComment;
          var delUpdates = {};
          delUpdates["postComments/" + id + "/" + commentKey] = null;
          delUpdates["postStats/" + id + "/comments"] = increment(-1);
          window.rtdb
            .ref()
            .update(delUpdates)
            .catch(function () {
              alert("মুছে ফেলা যায়নি, আবার চেষ্টা করুন।");
            });
          return;
        }

        var deleteReplyBtn = e.target.closest("[data-delete-reply]");
        if (deleteReplyBtn) {
          if (!dbReady() || !authReady() || !firebase.auth().currentUser) return;
          if (!confirm("এই উত্তরটি মুছে ফেলতে চান?")) return;
          var parts = deleteReplyBtn.dataset.deleteReply.split("|");
          window.rtdb.ref("commentReplies/" + id + "/" + parts[0] + "/" + parts[1]).remove().catch(function () {
            alert("মুছে ফেলা যায়নি, আবার চেষ্টা করুন।");
          });
          return;
        }

        var reportCommentBtn = e.target.closest("[data-report-comment]");
        if (reportCommentBtn) {
          if (!authReady() || !firebase.auth().currentUser) {
            document.dispatchEvent(new CustomEvent("ar:open-login"));
            return;
          }
          var rcKey = reportCommentBtn.dataset.reportComment;
          var rcData = state.commentsData && state.commentsData[rcKey];
          if (!rcData) return;
          currentReport = {
            postId: id,
            commentId: rcKey,
            replyId: null,
            text: rcData.text || "",
            authorUid: rcData.uid || "",
            authorName: rcData.name || "",
          };
          renderReportReasons();
          openReportSheet();
          return;
        }

        var reportReplyBtn = e.target.closest("[data-report-reply]");
        if (reportReplyBtn) {
          if (!authReady() || !firebase.auth().currentUser) {
            document.dispatchEvent(new CustomEvent("ar:open-login"));
            return;
          }
          var rrParts = reportReplyBtn.dataset.reportReply.split("|");
          var rrData = state.repliesData && state.repliesData[rrParts[0]] && state.repliesData[rrParts[0]][rrParts[1]];
          if (!rrData) return;
          currentReport = {
            postId: id,
            commentId: rrParts[0],
            replyId: rrParts[1],
            text: rrData.text || "",
            authorUid: rrData.uid || "",
            authorName: rrData.name || "",
          };
          renderReportReasons();
          openReportSheet();
          return;
        }

        var editCommentBtn = e.target.closest("[data-edit-comment]");
        if (editCommentBtn) {
          var ecKey = editCommentBtn.dataset.editComment;
          var ecWrap = document.getElementById("comment-edit-form-wrap-" + ecKey);
          if (!ecWrap) return;
          ecWrap.hidden = !ecWrap.hidden;
          if (!ecWrap.hidden) {
            var ecInput = ecWrap.querySelector("input");
            if (ecInput) setTimeout(function () { ecInput.focus(); ecInput.select(); }, 50);
          }
          return;
        }

        var cancelCommentEditBtn = e.target.closest("[data-edit-comment-cancel]");
        if (cancelCommentEditBtn) {
          var ccKey = cancelCommentEditBtn.dataset.editCommentCancel;
          var ccWrap = document.getElementById("comment-edit-form-wrap-" + ccKey);
          if (ccWrap) ccWrap.hidden = true;
          return;
        }

        var editReplyBtn = e.target.closest("[data-edit-reply]");
        if (editReplyBtn) {
          var erKey = editReplyBtn.dataset.editReply;
          var erWrap = document.getElementById("reply-edit-form-wrap-" + erKey);
          if (!erWrap) return;
          erWrap.hidden = !erWrap.hidden;
          if (!erWrap.hidden) {
            var erInput = erWrap.querySelector("input");
            if (erInput) setTimeout(function () { erInput.focus(); erInput.select(); }, 50);
          }
          return;
        }

        var cancelReplyEditBtn = e.target.closest("[data-edit-reply-cancel]");
        if (cancelReplyEditBtn) {
          var crKey = cancelReplyEditBtn.dataset.editReplyCancel;
          var crWrap = document.getElementById("reply-edit-form-wrap-" + crKey);
          if (crWrap) crWrap.hidden = true;
          return;
        }
      });

      list.addEventListener("submit", function (e) {
        var replyForm = e.target.closest(".c-reply-form");
        if (!replyForm) return;
        e.preventDefault();
        if (!dbReady()) return;
        var user = authReady() ? firebase.auth().currentUser : null;
        if (!user) {
          document.dispatchEvent(new CustomEvent("ar:open-login"));
          return;
        }
        var commentKey = replyForm.dataset.replyFormFor;
        var input = replyForm.querySelector("input");
        var btn = replyForm.querySelector("button");
        var text = input.value.trim();
        if (!text) return;

        if (cooldownRemainingSec() > 0) {
          alert("একটু অপেক্ষা করুন (" + cooldownRemainingSec() + " সেকেন্ড), তারপর আবার চেষ্টা করুন।");
          return;
        }

        var name = user.displayName || (user.email ? user.email.split("@")[0] : "ব্যবহারকারী");
        var newKey = window.rtdb.ref("commentReplies/" + id + "/" + commentKey).push().key;
        var updates = {};
        updates["commentReplies/" + id + "/" + commentKey + "/" + newKey] = {
          uid: user.uid,
          name: name,
          text: text,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
        };
        updates["users/" + user.uid + "/lastCommentAt"] = firebase.database.ServerValue.TIMESTAMP;

        btn.disabled = true;
        window.rtdb
          .ref()
          .update(updates)
          .then(function () {
            input.value = "";
            nextAllowedCommentAt = Date.now() + COMMENT_COOLDOWN_MS;
            var wrap = document.getElementById("reply-form-wrap-" + commentKey);
            if (wrap) wrap.hidden = true;
            notifyCommentAuthorOfReply(commentKey, text, user, name);
          })
          .catch(function (err) {
            alert(
              err && err.code === "PERMISSION_DENIED"
                ? "একটু ধীরে — এত দ্রুত উত্তর দেওয়া যাবে না।"
                : "উত্তর পাঠানো যায়নি, আবার চেষ্টা করুন।"
            );
          })
          .finally(function () {
            btn.disabled = false;
          });
      });

      list.addEventListener("submit", function (e) {
        var editCommentForm = e.target.closest("[data-edit-comment-form-for]");
        if (editCommentForm) {
          e.preventDefault();
          if (!dbReady() || !authReady() || !firebase.auth().currentUser) return;
          var ecKey = editCommentForm.dataset.editCommentFormFor;
          var ecInput = editCommentForm.querySelector("input");
          var ecBtn = editCommentForm.querySelector("button[type=submit]");
          var newText = ecInput.value.trim();
          if (!newText) return;

          ecBtn.disabled = true;
          window.rtdb
            .ref("postComments/" + id + "/" + ecKey)
            .update({ text: newText, editedAt: firebase.database.ServerValue.TIMESTAMP })
            .then(function () {
              var wrap = document.getElementById("comment-edit-form-wrap-" + ecKey);
              if (wrap) wrap.hidden = true;
            })
            .catch(function () {
              alert("এডিট করা যায়নি, আবার চেষ্টা করুন।");
            })
            .finally(function () {
              ecBtn.disabled = false;
            });
          return;
        }

        var editReplyForm = e.target.closest("[data-edit-reply-form-for]");
        if (editReplyForm) {
          e.preventDefault();
          if (!dbReady() || !authReady() || !firebase.auth().currentUser) return;
          var erKey = editReplyForm.dataset.editReplyFormFor;
          var erParts = erKey.split("|");
          var erInput = editReplyForm.querySelector("input");
          var erBtn = editReplyForm.querySelector("button[type=submit]");
          var newReplyText = erInput.value.trim();
          if (!newReplyText) return;

          erBtn.disabled = true;
          window.rtdb
            .ref("commentReplies/" + id + "/" + erParts[0] + "/" + erParts[1])
            .update({ text: newReplyText, editedAt: firebase.database.ServerValue.TIMESTAMP })
            .then(function () {
              var wrap = document.getElementById("reply-edit-form-wrap-" + erKey);
              if (wrap) wrap.hidden = true;
            })
            .catch(function () {
              alert("এডিট করা যায়নি, আবার চেষ্টা করুন।");
            })
            .finally(function () {
              erBtn.disabled = false;
            });
          return;
        }
      });
    }

    function renderReplyItem(commentKey, replyKey, rc, currentUid) {
      var name = rc.name || "ব্যবহারকারী";
      var letter = name.trim().charAt(0).toUpperCase();
      var when = rc.createdAt ? formatDateTime(rc.createdAt) : "";
      var isOwn = !!currentUid && rc.uid === currentUid;
      var editKey = commentKey + "|" + replyKey;
      return (
        '<div class="c-reply' + (isOwn ? " own" : "") + '">' +
        '<div class="c-head">' +
        '<span class="c-avatar small">' + escHtml(letter) + "</span>" +
        '<span class="c-name">' + escHtml(name) + (isOwn ? ' <span class="c-you">(আপনি)</span>' : "") + "</span>" +
        '<span class="c-time">' + escHtml(when) + (rc.editedAt ? ' <span class="c-edited">(এডিট করা হয়েছে)</span>' : "") + "</span>" +
        "</div>" +
        '<div class="c-text" id="reply-text-' + escHtml(editKey) + '">' + escHtml(rc.text || "") + "</div>" +
        (isOwn
          ? '<button type="button" class="c-edit-btn" data-edit-reply="' + escHtml(editKey) + '">এডিট</button>' +
            '<button type="button" class="c-delete-btn" data-delete-reply="' + escHtml(editKey) + '">মুছে ফেলুন</button>'
          : currentUid
          ? '<button type="button" class="c-report-btn" data-report-reply="' + escHtml(editKey) + '">রিপোর্ট</button>'
          : "") +
        (isOwn
          ? '<div class="c-edit-form-wrap" id="reply-edit-form-wrap-' + escHtml(editKey) + '" hidden>' +
            '<form class="c-edit-form" data-edit-reply-form-for="' + escHtml(editKey) + '">' +
            '<input type="text" value="' + escHtml(rc.text || "") + '" maxlength="500" required>' +
            "<button type=\"submit\">সংরক্ষণ</button>" +
            '<button type="button" class="c-edit-cancel" data-edit-reply-cancel="' + escHtml(editKey) + '">বাতিল</button>' +
            "</form>" +
            "</div>"
          : "") +
        "</div>"
      );
    }

    function renderCommentItem(key, c, currentUid) {
      var name = c.name || "ব্যবহারকারী";
      var letter = name.trim().charAt(0).toUpperCase();
      var when = c.createdAt ? formatDateTime(c.createdAt) : "";
      var isOwn = !!currentUid && c.uid === currentUid;

      var repliesObj = (state.repliesData && state.repliesData[key]) || null;
      var replyEntries = repliesObj
        ? Object.keys(repliesObj).map(function (k) { return [k, repliesObj[k]]; })
        : [];
      replyEntries.sort(function (a, b) { return (a[1].createdAt || 0) - (b[1].createdAt || 0); });

      return (
        '<div class="comment-item' + (isOwn ? " own" : "") + '" data-key="' + escHtml(key) + '">' +
        '<div class="c-head">' +
        '<span class="c-avatar">' + escHtml(letter) + "</span>" +
        '<span class="c-name">' + escHtml(name) + (isOwn ? ' <span class="c-you">(আপনি)</span>' : "") + "</span>" +
        '<span class="c-time">' + escHtml(when) + (c.editedAt ? ' <span class="c-edited">(এডিট করা হয়েছে)</span>' : "") + "</span>" +
        "</div>" +
        '<div class="c-text" id="comment-text-' + escHtml(key) + '">' + escHtml(c.text || "") + "</div>" +
        '<div class="c-actions">' +
        '<button type="button" class="c-reply-btn" data-reply-for="' + escHtml(key) + '">উত্তর দিন' +
        (replyEntries.length ? " (" + replyEntries.length + ")" : "") +
        "</button>" +
        (isOwn
          ? '<button type="button" class="c-edit-btn" data-edit-comment="' + escHtml(key) + '">এডিট</button>' +
            '<button type="button" class="c-delete-btn" data-delete-comment="' + escHtml(key) + '">মুছে ফেলুন</button>'
          : currentUid
          ? '<button type="button" class="c-report-btn" data-report-comment="' + escHtml(key) + '">রিপোর্ট</button>'
          : "") +
        "</div>" +
        (isOwn
          ? '<div class="c-edit-form-wrap" id="comment-edit-form-wrap-' + escHtml(key) + '" hidden>' +
            '<form class="c-edit-form" data-edit-comment-form-for="' + escHtml(key) + '">' +
            '<input type="text" value="' + escHtml(c.text || "") + '" maxlength="500" required>' +
            "<button type=\"submit\">সংরক্ষণ</button>" +
            '<button type="button" class="c-edit-cancel" data-edit-comment-cancel="' + escHtml(key) + '">বাতিল</button>' +
            "</form>" +
            "</div>"
          : "") +
        '<div class="c-reply-form-wrap" id="reply-form-wrap-' + escHtml(key) + '" hidden>' +
        '<form class="c-reply-form" data-reply-form-for="' + escHtml(key) + '">' +
        '<input type="text" placeholder="উত্তর লিখুন..." maxlength="500" required>' +
        '<button type="submit">পাঠান</button>' +
        "</form>" +
        "</div>" +
        (replyEntries.length
          ? '<div class="c-replies">' +
            replyEntries.map(function (e) { return renderReplyItem(key, e[0], e[1], currentUid); }).join("") +
            "</div>"
          : "") +
        "</div>"
      );
    }

    function renderComments() {
      var list = document.getElementById("comment-list");
      var heading = document.getElementById("comments-heading");
      var countEl = document.getElementById("post-comment-count");
      var loadMoreBtn = document.getElementById("comment-load-more");
      if (!list) return;

      var val = state.commentsData;
      var loadedCount = val ? Object.keys(val).length : 0;
      // পুরনো পোস্টে postStats/comments কাউন্টার নাও থাকতে পারে (নতুন ফিচার),
      // তাই লোড হওয়া কমেন্টের চেয়ে কম সংখ্যা কখনো দেখানো হবে না
      var total = Math.max(state.commentsTotal != null ? state.commentsTotal : 0, loadedCount);

      if (heading) heading.textContent = total > 0 ? "মন্তব্য (" + total + ")" : "মন্তব্য";
      if (countEl) countEl.textContent = String(total);

      if (!val) {
        list.innerHTML = '<p class="comment-empty">এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনিই করুন!</p>';
        if (loadMoreBtn) loadMoreBtn.hidden = true;
        return;
      }

      var entries = Object.keys(val).map(function (k) { return [k, val[k]]; });
      entries.sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); });

      var currentUid = authReady() && firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
      list.innerHTML = entries.map(function (e) { return renderCommentItem(e[0], e[1], currentUid); }).join("");

      if (loadMoreBtn) {
        var moreRemain = total - loadedCount;
        if (moreRemain > 0) {
          loadMoreBtn.hidden = false;
          loadMoreBtn.textContent = "আরও মন্তব্য দেখুন (" + moreRemain + ")";
        } else {
          loadMoreBtn.hidden = true;
        }
      }
    }

    function subscribeComments(id) {
      if (state.commentsRef && state.commentsHandler) {
        state.commentsRef.off("value", state.commentsHandler);
      }
      state.commentsRef = window.rtdb
        .ref("postComments/" + id)
        .orderByChild("createdAt")
        .limitToLast(state.commentsPageSize);
      state.commentsHandler = function (snap) {
        state.commentsData = snap.val();
        renderComments();
      };
      state.commentsRef.on("value", state.commentsHandler);
    }

    function bindLoadMoreComments(id) {
      var btn = document.getElementById("comment-load-more");
      if (!btn) return;
      btn.addEventListener("click", function () {
        state.commentsPageSize += COMMENTS_PAGE_SIZE;
        subscribeComments(id);
      });
    }

    function listenComments(id) {
      if (!dbReady()) return;
      subscribeComments(id);

      state.repliesRef = window.rtdb.ref("commentReplies/" + id);
      state.repliesHandler = function (snap) {
        state.repliesData = snap.val();
        renderComments();
      };
      state.repliesRef.on("value", state.repliesHandler);
    }

    // ---------- মূল রেন্ডার ----------
    function render(id, post) {
      cleanup(); // আগের পোস্টের লিসেনার/বাইন্ডিং সরিয়ে দেওয়া

      var actionsMount = document.getElementById("post-actions-mount");
      if (!actionsMount || !commentModalBody) return;

      state.postId = id;
      state.post = post;
      state.liked = false;
      state.saved = false;
      state.commentsPageSize = COMMENTS_PAGE_SIZE;
      state.commentsTotal = null;

      actionsMount.innerHTML =
        '<div class="post-actions">' +
        likeButtonHtml() +
        bookmarkButtonHtml() +
        commentButtonHtml() +
        shareButtonHtml() +
        translateButtonHtml() +
        viewsHtml() +
        "</div>";

      commentModalBody.innerHTML = commentsSectionHtml();

      bindLikeButton(id);
      bindBookmarkButton(id);
      bindCommentButton();
      bindShareButton(id, post);
      bindCommentForm(id);
      bindLoadMoreComments(id);
      listenStats(id);
      listenComments(id);
      countViewOnce(id);

      if (window.bindTranslateButton) {
        window.bindTranslateButton(
          document.getElementById("translate-btn"),
          post.title || "",
          post.description || post.body || ""
        );
      }
    }

    function cleanup() {
      if (state.statsRef && state.statsHandler) state.statsRef.off("value", state.statsHandler);
      if (state.commentsRef && state.commentsHandler) state.commentsRef.off("value", state.commentsHandler);
      if (state.repliesRef && state.repliesHandler) state.repliesRef.off("value", state.repliesHandler);
      if (state.docClickHandler) document.removeEventListener("click", state.docClickHandler);
      closeCommentModal();
      closeShareSheet();
      closeReportSheet();
      state.postId = null;
      state.post = null;
      state.statsRef = null;
      state.statsHandler = null;
      state.commentsRef = null;
      state.commentsData = null;
      state.commentsHandler = null;
      state.repliesRef = null;
      state.repliesData = null;
      state.repliesHandler = null;
      state.docClickHandler = null;
    }

    // যখনই লগইন/লগআউট হয়, কমেন্ট ফর্ম/হিন্ট রিফ্রেশ করার জন্য বর্তমান পোস্ট আবার রেন্ডার করা হয়
    document.addEventListener("ar:profile-updated", function () {
      if (state.postId && state.post) render(state.postId, state.post);
    });
    if (window.firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged(function () {
        if (state.postId && state.post) render(state.postId, state.post);
      });
    }

    window.PostActions = { render: render, cleanup: cleanup };
  });
})();
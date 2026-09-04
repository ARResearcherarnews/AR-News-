/* AR News — post feed rendering and authenticated interactions (Firebase Realtime Database)
 *
 * Comment rendering/handling now lives entirely in comment.js (window.ARComments).
 * Load order in the page: post.js AFTER comment.js.
 *
 * Architectural change from the previous version:
 *   The old code listened to `posts` with a single top-level `.on("value")`,
 *   so ANY change anywhere under a post (a single like, a single comment)
 *   re-rendered the *entire* feed — collapsing open comment sections,
 *   reverting translations, and re-registering listeners without ever
 *   calling `.off()` on the old ones (a growing memory/listener leak).
 *
 *   This version uses `child_added` / `child_changed` / `child_removed`
 *   and only touches a card's DOM when that specific post's *content*
 *   (title/body/image/category/author/published) actually changed —
 *   changes to nested likes/comments/reports are ignored for the purpose
 *   of deciding whether to rebuild a card, since those are handled by
 *   their own narrowly-scoped listeners.
 */
(function () {
  "use strict";

  const PREVIEW_LENGTH = 180;

  function tx(bn, en) {
    return (window.__arLanguage === "bn") ? bn : en;
  }

  // Public: lets the rest of the site actually control the bn/en toggle.
  // Previously `language` was a local variable nothing ever set, so the
  // Bengali strings in tx() were unreachable dead code.
  window.setARLanguage = function (lang) {
    window.__arLanguage = lang === "bn" ? "bn" : "en";
    document.querySelectorAll("#ar-feed .ar-post").forEach(refreshCardLabels);
  };

  const translateLabel = (source) => source === "en" ? "Translate to Bengali" : "Translate to English";

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function safeKey(value) {
    return String(value || "").replace(/[.#$\[\]/]/g, "_");
  }

  function getUser() {
    return window.auth && window.auth.currentUser ? window.auth.currentUser : null;
  }

  function trackVisit(user) {
    if (!window.rtdb || !user) return;
    const ref = window.rtdb.ref(`users/${safeKey(user.uid)}`);
    ref.once("value").then((snap) => {
      const profile = snap.val() || {};
      return ref.update({
        uid: user.uid,
        email: user.email || profile.email || "",
        role: profile.role || "user",
        createdAt: profile.createdAt || Date.now(),
        lastVisit: Date.now(),
        visitCount: Number(profile.visitCount || 0) + 1,
      });
    }).catch(() => {});
  }

  function ensureStyles() {
    if (document.getElementById("ar-post-interaction-styles")) return;
    const style = document.createElement("style");
    style.id = "ar-post-interaction-styles";
    style.textContent = `
      .ar-post-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid #e8edf3}
      .ar-action,.ar-read-more{border:0;background:transparent;color:#526173;cursor:pointer;font:inherit;transition:.2s ease}
      .ar-action{padding:7px 10px;border-radius:8px}.ar-action:hover,.ar-read-more:hover{color:#1769aa;background:#eef6fc}
      a.ar-action{display:inline-flex;align-items:center;gap:4px;text-decoration:none}
      .ar-like.is-liked{color:#d13b57;font-weight:600}.ar-read-more{display:block;color:#1769aa;font-weight:600;margin-top:5px;padding:4px 0}
      .ar-translation-area{display:flex;align-items:center;gap:9px;margin-top:8px}.ar-translate-button{border:0;background:transparent;color:#1769aa;cursor:pointer;font:inherit;font-size:.84rem;font-weight:600;padding:4px 0}.ar-translate-button:disabled{opacity:.55;cursor:wait}.ar-translation-status{color:#8a96a3;font-size:.78rem}
      .ar-loading-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#66726f;font-size:14px}.ar-spinner{width:38px;height:38px;border:4px solid #dcebe9;border-top-color:#0f766e;border-radius:50%;animation:ar-spin .8s linear infinite}@keyframes ar-spin{to{transform:rotate(360deg)}}
      .ar-feed-state{padding:32px 16px;text-align:center;color:#66726f}
    `;
    document.head.appendChild(style);
  }

  function loginMessage() {
    const message = tx("লাইক, কমেন্ট বা রিপোর্ট করতে আগে লগইন করুন।", "Please log in to like, comment, or report.");
    if (typeof window.showToast === "function") window.showToast(message);
    else window.alert(message);
  }

  function formatCount(value) {
    return Object.keys(value || {}).length;
  }

  function excerptFor(body) {
    const text = String(body || "").trim();
    return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH).trim()}…` : text;
  }

  function postText(post) {
    return String(
      post.body || post.content || post.description || post.details || post.text || post.article || ""
    ).trim();
  }

  function postAuthor(post) {
    const author = post.author;
    if (author && typeof author === "object") {
      return author.name || author.displayName || author.email || "এডমিন";
    }
    return String(
      post.authorName || post.createdByName || post.postedByName || post.postedBy || post.userName || post.adminName || post.admin || author || "এডমিন"
    ).trim() || "এডমিন";
  }

  // Fields that make up what the card actually displays. Deliberately
  // excludes likes/comments/reports — those live under the same post node
  // in Firebase but are handled by their own listeners, so a change to
  // them must never trigger a full card rebuild.
  function contentSignature(post) {
    return JSON.stringify({
      title: post.title || "",
      category: post.category || "",
      body: postText(post),
      imageUrl: post.imageUrl || "",
      author: postAuthor(post),
      createdAt: post.createdAt || 0,
      published: post.published !== false,
    });
  }

  function postCardHTML(id, post) {
    const key = safeKey(id);
    const title = escapeHtml(post.title || "শিরোনামহীন");
    const category = escapeHtml(post.category || "সাধারণ");
    const date = window.formatDate ? window.formatDate(post.createdAt) : "";
    const author = escapeHtml(postAuthor(post));
    const fullBody = postText(post);
    const preview = escapeHtml(excerptFor(fullBody));
    const hasMore = fullBody.length > PREVIEW_LENGTH;
    const bodyMarkup = fullBody
      ? `<p class="body ar-post-preview">${preview}</p>
         <p class="body ar-post-full" hidden>${escapeHtml(fullBody)}</p>
         ${hasMore ? `<button type="button" class="ar-read-more" data-action="read-more">${tx("আরও পড়ুন", "Read more")}</button>` : ""}`
      : `<p class="body ar-post-preview">${tx("বিস্তারিত তথ্য পাওয়া যায়নি।", "No details are available.")}</p>`;
    const img = post.imageUrl
      ? `<img class="ar-post-img" src="${escapeHtml(post.imageUrl)}" alt="${title}" loading="lazy" onerror="this.remove()">`
      : "";
    const sourceLang = /[\u0980-\u09FF]/.test(fullBody + (post.title || "")) ? "bn" : "en";

    return `
      <article class="ar-post" data-id="${escapeHtml(key)}">
        <div class="ar-post-meta">
          <span class="cat-dot"></span>
          <span class="cat-name">${category}</span>
          <span>·</span>
          <span>${escapeHtml(date)}</span>
          <span>·</span>
          <span class="ar-post-author">Posted by: <strong>${author}</strong></span>
        </div>
        <h3 class="ar-post-title">${title}</h3>
        ${img}
        ${bodyMarkup}
        <div class="ar-translation-area">
          <button type="button" class="ar-translate-button" data-action="translate" data-source-lang="${sourceLang}">${translateLabel(sourceLang)}</button>
          <span class="ar-translation-status" aria-live="polite"></span>
        </div>
        <div class="ar-post-actions" aria-label="Post actions">
          <button type="button" class="ar-action ar-like" data-action="like" aria-pressed="false"><span class="ar-like-label">♡ ${tx("লাইক", "Like")}</span> <span class="ar-like-count">0</span></button>
          <a class="ar-action ar-comments-link" href="post.html?id=${encodeURIComponent(key)}"><span class="ar-comments-label">${tx("কমেন্ট", "Comments")}</span> <span class="ar-comment-count">${formatCount(post.comments)}</span></a>
          <button type="button" class="ar-action ar-report" data-action="report"><span class="ar-report-label">⚑ ${tx("রিপোর্ট", "Report")}</span></button>
        </div>
      </article>
    `;
  }

  function buildCardElement(id, post) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = postCardHTML(id, post).trim();
    return wrapper.firstElementChild;
  }

  function refreshCardLabels(card) {
    const readMoreBtn = card.querySelector('[data-action="read-more"]');
    if (readMoreBtn) {
      const full = card.querySelector(".ar-post-full");
      const isOpen = full && !full.hidden;
      readMoreBtn.textContent = isOpen ? tx("কম পড়ুন", "Read less") : tx("আরও পড়ুন", "Read more");
    }
    const commentsLabel = card.querySelector(".ar-comments-label");
    if (commentsLabel) commentsLabel.textContent = tx("কমেন্ট", "Comments");
    const reportLabel = card.querySelector(".ar-report-label");
    if (reportLabel) reportLabel.textContent = `⚑ ${tx("রিপোর্ট", "Report")}`;
    const likeLabel = card.querySelector(".ar-like-label");
    if (likeLabel) {
      const liked = card.querySelector(".ar-like")?.getAttribute("aria-pressed") === "true";
      likeLabel.textContent = liked ? `♥ ${tx("আনলাইক", "Unlike")}` : `♡ ${tx("লাইক", "Like")}`;
    }
  }

  function interactionRef(postId, child) {
    return window.rtdb.ref(`posts/${safeKey(postId)}/${child}`);
  }

  function updateLikeUI(cardEl, likes) {
    const button = cardEl.querySelector(".ar-like");
    if (!button) return;
    const countEl = button.querySelector(".ar-like-count");
    if (countEl) countEl.textContent = formatCount(likes);
    const user = getUser();
    const liked = !!(user && likes[user.uid]);
    button.setAttribute("aria-pressed", String(liked));
    button.classList.toggle("is-liked", liked);
    const label = button.querySelector(".ar-like-label");
    if (label) label.textContent = liked ? `♥ ${tx("আনলাইক", "Unlike")}` : `♡ ${tx("লাইক", "Like")}`;
  }

  async function translatePost(card, button) {
    const title = card.querySelector(".ar-post-title");
    const preview = card.querySelector(".ar-post-preview");
    const full = card.querySelector(".ar-post-full");
    const status = card.querySelector(".ar-translation-status");
    const from = button.dataset.sourceLang || "bn";
    const to = from === "bn" ? "en" : "bn";

    if (button.dataset.translated === "true") {
      title.textContent = button.dataset.originalTitle;
      if (preview) preview.textContent = button.dataset.originalPreview;
      if (full) full.textContent = button.dataset.originalFull;
      button.dataset.translated = "false";
      button.textContent = translateLabel(from); // was translateLabel() with no arg — always showed "Translate to English"
      status.textContent = "";
      return;
    }

    const sourceTitle = title.textContent;
    const sourceBody = full ? full.textContent : (preview ? preview.textContent : "");
    button.disabled = true;
    status.textContent = tx("অনুবাদ হচ্ছে…", "Translating…");
    try {
      const request = async (text) => {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
        if (!response.ok) throw new Error("translation_failed");
        const data = await response.json();
        return data.responseData.translatedText;
      };
      button.dataset.originalTitle = sourceTitle;
      button.dataset.originalPreview = preview ? preview.textContent : "";
      button.dataset.originalFull = full ? full.textContent : "";
      title.textContent = await request(sourceTitle);
      const translatedBody = await request(sourceBody);
      if (full) full.textContent = translatedBody;
      // Was: preview.textContent = translatedBody (the FULL body), so the
      // "collapsed" preview silently became the entire article after
      // translating. Re-truncate it like the original preview was.
      if (preview) preview.textContent = excerptFor(translatedBody);
      button.dataset.translated = "true";
      button.textContent = from === "bn" ? "View Bengali" : "View English";
      status.textContent = tx("অনুবাদ সম্পন্ন", "Translation complete");
    } catch (_) {
      status.textContent = tx("অনুবাদ করা যায়নি। পরে আবার চেষ্টা করুন।", "Translation failed. Please try again.");
    } finally {
      button.disabled = false;
    }
  }

  function bindEvents(container) {
    container.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const card = button.closest(".ar-post");
      if (!card) return;
      const action = button.dataset.action;

      if (action === "read-more") {
        const preview = card.querySelector(".ar-post-preview");
        const full = card.querySelector(".ar-post-full");
        const open = full.hidden;
        preview.hidden = open;
        full.hidden = !open;
        button.textContent = open ? tx("কম পড়ুন", "Read less") : tx("আরও পড়ুন", "Read more");
        return;
      }

      if (action === "translate") {
        await translatePost(card, button);
        return;
      }

      const user = getUser();
      if (!user) return loginMessage();

      if (action === "like") {
        const likeRef = interactionRef(card.dataset.id, `likes/${safeKey(user.uid)}`);
        const current = button.getAttribute("aria-pressed") === "true";
        await likeRef.set(current ? null : { likedAt: Date.now() })
          .catch(() => window.alert("Could not like the post. Check Firebase Rules."));
      }

      if (action === "report") {
        const reason = window.prompt("Please enter a reason for reporting:");
        if (!reason || !reason.trim()) return;
        await interactionRef(card.dataset.id, "reports").push({
          userId: user.uid,
          userName: user.displayName || user.email || "User",
          reason: reason.trim().slice(0, 500),
          createdAt: Date.now(),
          status: "new",
        }).then(() => window.alert("Your report has been sent to the administrator."))
          .catch(() => window.alert("Could not send the report. Please try again."));
      }
    });
  }

  function initFeed() {
    const container = document.getElementById("ar-feed");
    if (!container) return;
    ensureStyles();
    container.innerHTML = `<div class="ar-loading-state" role="status" aria-live="polite"><span class="ar-spinner" aria-hidden="true"></span><span>Loading news…</span></div>`;
    if (!window.rtdb) {
      container.innerHTML = `<div class="ar-feed-state">Could not connect. Please try again later.</div>`;
      return;
    }

    bindEvents(container);

    const postsRef = window.rtdb.ref("posts");
    const cards = new Map(); // postId -> { el, signature, likesRef, likesHandler }
    let loadingCleared = false;

    function clearLoadingState() {
      if (loadingCleared) return;
      loadingCleared = true;
      container.innerHTML = "";
    }

    function updateEmptyState() {
      let placeholder = container.querySelector(".ar-feed-state");
      if (cards.size === 0) {
        if (!placeholder) {
          placeholder = document.createElement("div");
          placeholder.className = "ar-feed-state";
          placeholder.innerHTML = `${tx("এখনো কোনো খবর প্রকাশিত হয়নি।", "No news has been published yet.")}<br>${tx("নতুন খবর শীঘ্রই আসছে।", "New stories are coming soon.")}`;
          container.appendChild(placeholder);
        }
      } else if (placeholder) {
        placeholder.remove();
      }
    }

    function insertAtTop(el) {
      const placeholder = container.querySelector(".ar-feed-state");
      if (placeholder) placeholder.remove();
      container.prepend(el);
    }

    function attachLikes(postId, el) {
      const ref = interactionRef(postId, "likes");
      const handler = (snap) => updateLikeUI(el, snap.val() || {});
      ref.on("value", handler);
      return { likesRef: ref, likesHandler: handler };
    }

    function detachCard(postId) {
      const entry = cards.get(postId);
      if (!entry) return;
      if (entry.likesRef) entry.likesRef.off("value", entry.likesHandler);
      return entry;
    }

    function removeCard(postId) {
      const entry = detachCard(postId);
      if (!entry) return;
      entry.el.remove();
      cards.delete(postId);
      updateEmptyState();
    }

    function upsertCard(postId, post) {
      const published = post.published !== false;
      const existing = cards.get(postId);

      if (!published) {
        if (existing) removeCard(postId);
        return;
      }

      const signature = contentSignature(post);

      if (existing) {
        if (existing.signature === signature) return; // only likes/comments/reports changed — leave the DOM alone
        detachCard(postId);
        const fresh = buildCardElement(postId, post);
        existing.el.replaceWith(fresh);
        const likes = attachLikes(postId, fresh);
        cards.set(postId, { el: fresh, signature, ...likes });
        return;
      }

      clearLoadingState();
      const el = buildCardElement(postId, post);
      insertAtTop(el);
      const likes = attachLikes(postId, el);
      cards.set(postId, { el, signature, ...likes });
      updateEmptyState();
    }

    postsRef.orderByChild("createdAt").once("value").then((snap) => {
      clearLoadingState();
      if (!snap.exists()) updateEmptyState();
    }).catch(() => {
      container.innerHTML = `<div class="ar-feed-state">Could not load news.</div>`;
    });

    // orderByChild ensures child_added fires oldest-first; each new card is
    // prepended, so the feed ends up newest-first without needing to
    // re-sort or re-render everything on every change.
    postsRef.orderByChild("createdAt").on("child_added", (snap) => {
      clearLoadingState();
      upsertCard(snap.key, snap.val() || {});
    });
    postsRef.on("child_changed", (snap) => upsertCard(snap.key, snap.val() || {}));
    postsRef.on("child_removed", (snap) => removeCard(snap.key));

    if (window.auth && typeof window.auth.onAuthStateChanged === "function") {
      window.auth.onAuthStateChanged((user) => trackVisit(user));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initFeed);
  else initFeed();

  // Shared with post-detail.js (the standalone post/comments page) so both
  // pages render a post identically instead of maintaining two copies.
  window.ARPost = {
    tx, escapeHtml, safeKey, getUser, interactionRef, formatCount,
    postText, postAuthor, excerptFor, contentSignature,
    postCardHTML, buildCardElement, updateLikeUI, translatePost,
    bindEvents, ensureStyles, loginMessage, translateLabel,
    PREVIEW_LENGTH,
  };
})();

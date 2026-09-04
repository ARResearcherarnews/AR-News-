/* AR News — English post detail page
 * Load order: config.js, comment.js, post.js, post-detail.js
 * Requires #ar-post-detail and optionally #ar-related-posts in the page.
 */
(function () {
  "use strict";

  const DETAIL_ID = "ar-post-detail-controller";
  const PREVIEW_LENGTH = 180;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
  function safeKey(value) { return String(value || "").replace(/[.#$\[\]/]/g, "_"); }
  function postText(post) { return String(post.body || post.content || post.description || post.details || post.text || post.article || "").trim(); }
  function postTitle(post) { return String(post.title || "Untitled post").trim(); }
  function postAuthor(post) {
    const author = post.author;
    if (author && typeof author === "object") return author.name || author.displayName || author.email || "Admin";
    return String(post.authorName || post.createdByName || post.postedByName || post.postedBy || post.userName || post.adminName || post.admin || author || "Admin").trim() || "Admin";
  }
  function date(value) {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch (_) { return ""; }
  }
  function getPostId() { const params = new URLSearchParams(location.search); return params.get("id") || params.get("post") || ""; }
  function notify(message) { if (typeof window.showToast === "function") window.showToast(message); else window.alert(message); }
  function postUrl(id) { return `${location.origin}${location.pathname.replace(/[^/]+$/, "post.html")}?id=${encodeURIComponent(id)}`; }

  function addStyles() {
    if (document.getElementById(DETAIL_ID)) return;
    const style = document.createElement("style");
    style.id = DETAIL_ID;
    style.textContent = `
      .ar-detail-shell{max-width:760px;margin:0 auto;padding:24px 18px 70px}.ar-detail-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.ar-detail-btn{border:1px solid #d8e1ea;background:#fff;color:#1769aa;border-radius:8px;padding:8px 12px;cursor:pointer;font:inherit;font-weight:600;transition:.2s ease}.ar-detail-btn:hover{background:#eef6fc;border-color:#1769aa}.ar-back-button{display:inline-flex;align-items:center;gap:7px;border-color:transparent;background:#eef6fc;color:#1769aa;border-radius:999px;padding:9px 16px}.ar-back-button:hover{background:#dceffb}.ar-detail-card{border-bottom:1px solid #e5eaf0;padding-bottom:22px}.ar-detail-meta{display:flex;gap:8px;flex-wrap:wrap;color:#66726f;font-size:13px;margin-bottom:10px}.ar-detail-title{font-family:Georgia,"Times New Roman",serif;font-size:clamp(28px,5vw,42px);line-height:1.3;margin:0 0 14px;color:#14181a}.ar-detail-image{width:100%;max-height:460px;object-fit:cover;border-radius:12px;margin:12px 0 18px;background:#f2f4f3}.ar-detail-body{font-size:17px;line-height:1.9;white-space:pre-line;color:#2b3234}.ar-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;padding-top:14px;border-top:1px solid #e8edf3}.ar-related{margin-top:28px}.ar-related h2{font-family:Georgia,"Times New Roman",serif;font-size:23px}.ar-related-list{display:grid;gap:10px}.ar-related-item{display:block;border:1px solid #e5e8e6;border-radius:10px;padding:12px;background:#fff}.ar-related-item:hover{border-color:#0f766e;background:#f7fbfa}.ar-related-item strong{display:block;color:#14181a}.ar-related-item small{color:#66726f}.ar-detail-loading{min-height:300px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#66726f}.ar-detail-spinner{width:40px;height:40px;border:4px solid #dcebe9;border-top-color:#0f766e;border-radius:50%;animation:ar-detail-spin .8s linear infinite}@keyframes ar-detail-spin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(style);
  }

  function translateButton(post, detail) {
    const title = detail.querySelector(".ar-detail-title");
    const body = detail.querySelector(".ar-detail-body");
    const button = detail.querySelector("[data-detail-action=translate]");
    const status = detail.querySelector(".ar-detail-translation-status");
    const source = /[\u0980-\u09FF]/.test(postTitle(post) + postText(post)) ? "bn" : "en";
    const target = source === "bn" ? "en" : "bn";
    button.textContent = source === "bn" ? "Translate to English" : "Translate to Bengali";
    button.onclick = async () => {
      if (button.dataset.translated === "true") {
        title.textContent = button.dataset.originalTitle;
        body.textContent = button.dataset.originalBody;
        button.dataset.translated = "false";
        button.textContent = source === "bn" ? "Translate to English" : "Translate to Bengali";
        status.textContent = "";
        return;
      }
      button.disabled = true; status.textContent = "Translating…";
      try {
        const request = async (text) => {
          const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`);
          if (!response.ok) throw new Error("translation_failed");
          const data = await response.json();
          return data.responseData.translatedText;
        };
        button.dataset.originalTitle = title.textContent;
        button.dataset.originalBody = body.textContent;
        title.textContent = await request(title.textContent);
        body.textContent = await request(body.textContent);
        button.dataset.translated = "true";
        button.textContent = source === "bn" ? "View Bengali" : "View English";
        status.textContent = "Translation complete";
      } catch (_) { status.textContent = "Translation failed. Please try again."; }
      finally { button.disabled = false; }
    };
  }

  function renderRelated(posts, current, container) {
    if (!container) return;
    const entries = Object.entries(posts || {}).filter(([id, post]) => id !== current && post && post.published !== false && (!posts[current]?.category || post.category === posts[current].category)).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0)).slice(0, 5);
    container.innerHTML = entries.length ? `<h2>Related stories</h2><div class="ar-related-list">${entries.map(([id, post]) => `<a class="ar-related-item" href="post.html?id=${encodeURIComponent(id)}"><strong>${escapeHtml(postTitle(post))}</strong><small>${escapeHtml(post.category || "News")} · ${date(post.createdAt)}</small></a>`).join("")}</div>` : "";
  }

  function mountComments(container, postId) {
    if (!window.ARComments || typeof window.ARComments.mount !== "function") return;
    const section = document.createElement("section");
    section.className = "ar-comments";
    section.innerHTML = "";
    container.appendChild(section);
    window.ARComments.mount(container, postId);
  }

  async function init() {
    const container = document.getElementById("ar-post-detail");
    if (!container) return;
    addStyles();
    const postId = getPostId();
    if (!postId) { container.innerHTML = `<div class="ar-feed-state">Post not found.</div>`; return; }
    if (!window.rtdb) { container.innerHTML = `<div class="ar-feed-state">Could not connect. Please try again later.</div>`; return; }
      container.innerHTML = `<div class="ar-detail-loading" role="status"><span class="ar-detail-spinner"></span><span>Loading post…</span></div>`;
    try {
      const snap = await window.rtdb.ref(`posts/${safeKey(postId)}`).once("value");
      const post = snap.val();
      if (!post || post.published === false) { container.innerHTML = `<div class="ar-feed-state">This post could not be found or has been removed.</div>`; return; }
      const image = post.imageUrl ? `<img class="ar-detail-image" src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(postTitle(post))}" onerror="this.remove()">` : "";
      container.innerHTML = `<div class="ar-detail-toolbar"><button class="ar-detail-btn ar-back-button" data-detail-action="back">← Back to feed</button><button class="ar-detail-btn" data-detail-action="share">Share</button><button class="ar-detail-btn" data-detail-action="copy">Copy link</button></div><article class="ar-detail-card"><div class="ar-detail-meta"><span>${escapeHtml(post.category || "News")}</span><span>·</span><span>${date(post.createdAt)}</span><span>·</span><span>Posted by: <strong>${escapeHtml(postAuthor(post))}</strong></span></div><h1 class="ar-detail-title">${escapeHtml(postTitle(post))}</h1>${image}<div class="ar-detail-body">${escapeHtml(postText(post))}</div><div class="ar-detail-actions"><button class="ar-detail-btn" data-detail-action="translate">Translate</button><span class="ar-detail-translation-status" aria-live="polite"></span></div></article>`;
      const detail = container.querySelector(".ar-detail-card");
      translateButton(post, detail);
      container.querySelector('[data-detail-action="back"]').onclick = () => history.length > 1 ? history.back() : (location.href = "index.html");
      container.querySelector('[data-detail-action="copy"]').onclick = async () => { try { await navigator.clipboard.writeText(postUrl(postId)); notify("Post link copied."); } catch (_) { notify("Could not copy the link."); } };
      container.querySelector('[data-detail-action="share"]').onclick = async () => { const data = { title: postTitle(post), text: postText(post).slice(0, 160), url: postUrl(postId) }; try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); notify("Post link copied."); } } catch (_) {} };
      mountComments(container, postId);
      const related = document.getElementById("ar-related-posts");
      if (related) { const all = await window.rtdb.ref("posts").once("value"); renderRelated(all.val() || {}, postId, related); }
    } catch (_) { container.innerHTML = `<div class="ar-feed-state">Could not load this post. Please try again.</div>`; }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
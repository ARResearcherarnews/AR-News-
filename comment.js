/* AR News — standalone comment system (Firebase Realtime Database)
 * Public API: window.ARComments.mount(card, postId, options)
 *             window.ARComments.unmount(card)
 *
 * Usage from post.js:
 *   if (action === "toggle-comments") {
 *     const section = card.querySelector(".ar-comments");
 *     section.hidden = !section.hidden;
 *     if (!section.hidden) window.ARComments.mount(card, card.dataset.id);
 *   }
 *   // when a post card is removed from the DOM (e.g. before a feed re-render):
 *   window.ARComments.unmount(card);
 */
(function () {
  "use strict";

  const PAGE_SIZE = 20;
  const MAX_LENGTH = 500;
  const MIN_POST_INTERVAL_MS = 3000; // simple client-side spam throttle

  // Keeps track of active Firebase listeners / state per mounted card so we
  // can cleanly tear them down (fixes the listener-leak issue in post.js).
  const instances = new WeakMap();

  function tx(bn, en) {
    return (window.__arLanguage === "bn") ? bn : en;
  }

  function notify(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else window.alert(message);
  }

  function confirmAction(message) {
    // Swap for a custom modal if/when one exists; centralised here so only
    // one place needs to change.
    return window.confirm(message);
  }

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

  function userName(user) {
    return (user && (user.displayName || user.email)) || tx("ব্যবহারকারী", "User");
  }

  function commentTime(timestamp) {
    if (!timestamp) return tx("এইমাত্র", "just now");
    try {
      const locale = tx("bn-BD", "en-US");
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
    } catch (_) {
      return "";
    }
  }

  function avatarMarkup(name, photoUrl) {
    const initial = escapeHtml(String(name || tx("ব", "U")).trim().charAt(0).toUpperCase());
    if (!photoUrl) {
      return `<span class="ar-avatar ar-avatar-fallback" aria-hidden="true">${initial}</span>`;
    }
    // Fallback handled via a real event listener (see wireImageFallback),
    // not an inline onerror string — avoids HTML-attribute quoting bugs.
    return `<img class="ar-avatar" data-fallback-initial="${initial}" src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name || "")}">`;
  }

  function wireImageFallbacks(root) {
    root.querySelectorAll("img.ar-avatar[data-fallback-initial]").forEach((img) => {
      img.addEventListener("error", () => {
        const span = document.createElement("span");
        span.className = "ar-avatar ar-avatar-fallback";
        span.setAttribute("aria-hidden", "true");
        span.textContent = img.dataset.fallbackInitial || "";
        img.replaceWith(span);
      }, { once: true });
    });
  }

  function ensureStyles() {
    if (document.getElementById("ar-comment-styles")) return;
    const style = document.createElement("style");
    style.id = "ar-comment-styles";
    style.textContent = `
      .ar-comments{margin-top:14px;padding:14px;background:#f8fafc;border:1px solid #e7edf3;border-radius:12px}
      .ar-comment-thread{padding:12px 0;border-bottom:1px solid #e5eaf0}.ar-comment-thread:last-child{border-bottom:0}
      .ar-comment{display:flex;gap:10px;align-items:flex-start}.ar-comment-content{min-width:0;flex:1}
      .ar-comment-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ar-comment-head strong{color:#243447;font-size:.94rem}.ar-comment-head time{color:#8a96a3;font-size:.78rem}
      .ar-comment-head .ar-edited-tag{color:#8a96a3;font-size:.74rem;font-style:italic}
      .ar-comment p{margin:4px 0;color:#394858;line-height:1.55;overflow-wrap:anywhere;white-space:pre-wrap}
      .ar-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;object-fit:cover}
      .ar-avatar-fallback{display:grid;place-items:center;background:#dcecf8;color:#1769aa;font-weight:700}
      .ar-replies{margin:10px 0 0 44px;padding-left:12px;border-left:2px solid #dce8f2}.ar-reply{margin-top:10px}
      @media(max-width:520px){.ar-replies{margin-left:28px}}
      .ar-comment-tools{display:flex;gap:10px;margin-top:4px}
      .ar-comment-tools button{border:0;background:transparent;color:#1769aa;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;padding:2px 4px;border-radius:5px}
      .ar-comment-tools button.ar-delete-button{color:#c0394f}
      .ar-comment-tools button:hover{background:#eef6fc}
      .ar-comment-tools button:disabled{opacity:.5;cursor:not-allowed}
      .ar-reply-banner{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 10px;background:#eef6fc;border-radius:8px;font-size:.84rem;color:#1769aa}
      .ar-reply-banner button{margin-left:auto;border:0;background:transparent;color:#526173;cursor:pointer;font:inherit;font-weight:600}
      .ar-comment-form{display:flex;flex-direction:column;gap:6px;margin-top:14px}
      .ar-comment-input-row{display:flex;gap:8px}
      .ar-comment-form input{min-width:0;flex:1;padding:10px 12px;border:1px solid #d8e1ea;border-radius:8px;background:#fff;font:inherit;outline:none}
      .ar-comment-form input:focus{border-color:#5ca5d8;box-shadow:0 0 0 3px #e9f4fc}
      .ar-comment-form button[type="submit"]{border:0;border-radius:8px;padding:0 14px;background:#1769aa;color:#fff;cursor:pointer;font:inherit;font-weight:600;min-width:78px}
      .ar-comment-form button[type="submit"]:disabled{opacity:.6;cursor:wait}
      .ar-comment-form button.ar-cancel-edit{border:0;background:transparent;color:#526173;cursor:pointer;font:inherit}
      .ar-char-count{align-self:flex-end;font-size:.76rem;color:#8a96a3}
      .ar-char-count.is-near-limit{color:#c0394f}
      .ar-load-more{display:block;width:100%;margin-top:10px;padding:9px;border:1px dashed #cbd9e6;border-radius:8px;background:transparent;color:#1769aa;font:inherit;font-weight:600;cursor:pointer}
      .ar-load-more:hover{background:#eef6fc}
      .ar-comment-edit-input{width:100%;padding:8px 10px;border:1px solid #d8e1ea;border-radius:8px;font:inherit;margin-top:4px}
      .ar-muted{color:#8a96a3;font-size:.9rem}
    `;
    document.head.appendChild(style);
  }

  function interactionRef(postId, child) {
    return window.rtdb.ref(`posts/${safeKey(postId)}/${child}`);
  }

  function nestedCommentCount(comments) {
    return comments.reduce((total, c) => total + 1 + Object.keys(c.replies || {}).length, 0);
  }

  function renderCharCount(section, remaining) {
    const el = section.querySelector(".ar-char-count");
    if (!el) return;
    el.textContent = `${remaining}`;
    el.classList.toggle("is-near-limit", remaining <= 30);
  }

  function commentRowHTML(comment, { isReply = false } = {}) {
    const user = getUser();
    const own = user && comment.userId === user.uid;
    const editedTag = comment.editedAt ? `<span class="ar-edited-tag">${tx("(সম্পাদিত)", "(edited)")}</span>` : "";
    return `
      <div class="ar-comment${isReply ? " ar-reply" : ""}" data-comment-id="${escapeHtml(comment.id)}" data-parent-id="${escapeHtml(comment.parentId || "")}">
        <div class="ar-comment-avatar">${avatarMarkup(comment.userName, comment.photoUrl)}</div>
        <div class="ar-comment-content">
          <div class="ar-comment-head">
            <strong>${escapeHtml(comment.userName || tx("ব্যবহারকারী", "User"))}</strong>
            <time>${commentTime(comment.createdAt)}</time>
            ${editedTag}
          </div>
          <p class="ar-comment-text">${escapeHtml(comment.text)}</p>
          <div class="ar-comment-tools">
            ${!isReply ? `<button type="button" data-action="reply">${tx("উত্তর দিন", "Reply")}</button>` : ""}
            ${own ? `<button type="button" data-action="edit">${tx("সম্পাদনা", "Edit")}</button>` : ""}
            ${own ? `<button type="button" class="ar-delete-button" data-action="delete">${tx("মুছুন", "Delete")}</button>` : ""}
          </div>
        </div>
      </div>`;
  }

  function threadHTML(comment) {
    const replies = Object.entries(comment.replies || {})
      .map(([id, reply]) => ({ id, ...reply, parentId: comment.id }))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return `
      <div class="ar-comment-thread">
        ${commentRowHTML(comment)}
        ${replies.length ? `<div class="ar-replies">${replies.map((r) => commentRowHTML(r, { isReply: true })).join("")}</div>` : ""}
      </div>`;
  }

  function commentsSectionHTML(postId) {
    return `
      <div class="ar-comment-list" aria-live="polite"><span class="ar-muted">${tx("কমেন্ট লোড হচ্ছে…", "Loading comments…")}</span></div>
      <div class="ar-reply-banner" hidden>
        <span class="ar-reply-target-label"></span>
        <button type="button" data-action="cancel-reply">${tx("বাতিল", "Cancel")}</button>
      </div>
      <form class="ar-comment-form" data-mode="create" data-parent-id="" data-edit-id="">
        <div class="ar-comment-input-row">
          <label class="sr-only" for="comment-input-${safeKey(postId)}">${tx("কমেন্ট লিখুন", "Write a comment")}</label>
          <input id="comment-input-${safeKey(postId)}" name="comment" maxlength="${MAX_LENGTH}" placeholder="${tx("আপনার মতামত লিখুন…", "Write your comment…")}" required autocomplete="off">
          <button type="submit">${tx("পোস্ট করুন", "Post")}</button>
        </div>
        <span class="ar-char-count">${MAX_LENGTH}</span>
      </form>`;
  }

  // ---- data loading -------------------------------------------------

  function loadPage(state, section, { append = false } = {}) {
    const list = section.querySelector(".ar-comment-list");
    const query = interactionRef(state.postId, "comments")
      .orderByChild("createdAt")
      .limitToLast(state.pageSize);

    if (state.rootRef) state.rootRef.off("value", state.rootHandler);

    state.rootRef = query;
    state.rootHandler = (snap) => {
      const comments = Object.entries(snap.val() || {})
        .map(([id, comment]) => ({ id, ...comment }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      state.loadedCount = comments.length;
      list.innerHTML = comments.length
        ? comments.map(threadHTML).join("")
        : `<span class="ar-muted">${tx("এখনো কোনো কমেন্ট নেই।", "No comments yet.")}</span>`;
      wireImageFallbacks(list);

      const moreAvailable = state.totalCount == null || state.loadedCount < state.totalCount;
      let moreBtn = section.querySelector(".ar-load-more");
      if (moreAvailable && state.loadedCount >= state.pageSize) {
        if (!moreBtn) {
          moreBtn = document.createElement("button");
          moreBtn.type = "button";
          moreBtn.className = "ar-load-more";
          moreBtn.dataset.action = "load-more";
          list.after(moreBtn);
        }
        moreBtn.textContent = tx("আরও কমেন্ট দেখুন", "Load more comments");
      } else if (moreBtn) {
        moreBtn.remove();
      }

      const countBadge = section.closest(".ar-post")?.querySelector(".ar-comment-count");
      if (countBadge) countBadge.textContent = nestedCommentCount(comments);
    };

    state.rootRef.on("value", state.rootHandler, () => {
      list.innerHTML = `<span class="ar-muted">${tx("কমেন্ট লোড করা যায়নি।", "Could not load comments.")}</span>`;
    });
  }

  function loadMore(state, section) {
    state.pageSize += PAGE_SIZE;
    loadPage(state, section, { append: true });
  }

  // ---- form handling --------------------------------------------------

  function resetForm(section) {
    const form = section.querySelector(".ar-comment-form");
    const input = form.elements.comment;
    form.dataset.mode = "create";
    form.dataset.parentId = "";
    form.dataset.editId = "";
    input.value = "";
    input.placeholder = tx("আপনার মতামত লিখুন…", "Write your comment…");
    section.querySelector(".ar-reply-banner").hidden = true;
    renderCharCount(section, MAX_LENGTH);
  }

  function beginReply(section, commentId, targetName) {
    const form = section.querySelector(".ar-comment-form");
    form.dataset.mode = "create";
    form.dataset.parentId = commentId;
    form.dataset.editId = "";
    const banner = section.querySelector(".ar-reply-banner");
    banner.hidden = false;
    banner.querySelector(".ar-reply-target-label").textContent = tx(
      `উত্তর দিচ্ছেন ${targetName}-কে`,
      `Replying to ${targetName}`
    );
    const input = form.elements.comment;
    input.placeholder = tx("আপনার উত্তর লিখুন…", "Write your reply…");
    input.focus();
  }

  function beginEdit(row, section) {
    const commentId = row.dataset.commentId;
    const parentId = row.dataset.parentId;
    const textEl = row.querySelector(".ar-comment-text");
    const original = textEl.textContent;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <textarea class="ar-comment-edit-input" maxlength="${MAX_LENGTH}" rows="2">${escapeHtml(original)}</textarea>
      <div class="ar-comment-tools">
        <button type="button" data-action="save-edit">${tx("সংরক্ষণ", "Save")}</button>
        <button type="button" data-action="cancel-edit">${tx("বাতিল", "Cancel")}</button>
      </div>`;
    textEl.replaceWith(wrapper);
    wrapper.querySelector("textarea").focus();
    wrapper.dataset.commentId = commentId;
    wrapper.dataset.parentId = parentId || "";
    wrapper.className = "ar-comment-edit-box";
  }

  async function saveEdit(state, section, editBox) {
    const textarea = editBox.querySelector("textarea");
    const text = textarea.value.trim().slice(0, MAX_LENGTH);
    if (!text) return;
    const commentId = editBox.dataset.commentId;
    const parentId = editBox.dataset.parentId;
    const path = parentId
      ? `comments/${safeKey(parentId)}/replies/${safeKey(commentId)}`
      : `comments/${safeKey(commentId)}`;
    const buttons = editBox.querySelectorAll("button");
    buttons.forEach((b) => (b.disabled = true));
    try {
      await interactionRef(state.postId, path).update({
        text,
        editedAt: Date.now(),
      });
    } catch (_) {
      notify(tx("কমেন্ট সম্পাদনা করা যায়নি।", "Could not edit the comment."));
      buttons.forEach((b) => (b.disabled = false));
    }
    // The live "value" listener will re-render the thread with the update.
  }

  async function deleteComment(state, row) {
    const commentId = row.dataset.commentId;
    const parentId = row.dataset.parentId;
    if (!confirmAction(tx("আপনার কমেন্টটি মুছে ফেলবেন?", "Delete your comment?"))) return;
    const path = parentId
      ? `comments/${safeKey(parentId)}/replies/${safeKey(commentId)}`
      : `comments/${safeKey(commentId)}`;
    try {
      await interactionRef(state.postId, path).remove();
    } catch (_) {
      notify(tx("কমেন্ট মুছে ফেলা যায়নি।", "Could not delete the comment."));
    }
  }

  async function submitComment(state, section, form) {
    const user = getUser();
    if (!user) {
      notify(tx("কমেন্ট করতে আগে লগইন করুন।", "Please log in to comment."));
      return;
    }

    const now = Date.now();
    if (now - state.lastPostedAt < MIN_POST_INTERVAL_MS) {
      notify(tx("একটু ধীরে! কিছুক্ষণ পর আবার চেষ্টা করুন।", "You're posting too fast. Please wait a moment."));
      return;
    }

    const input = form.elements.comment;
    const text = input.value.trim().slice(0, MAX_LENGTH);
    if (!text) return;

    const parentId = form.dataset.parentId;
    const targetRef = parentId
      ? interactionRef(state.postId, `comments/${safeKey(parentId)}/replies`)
      : interactionRef(state.postId, "comments");

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    input.disabled = true;
    try {
      await targetRef.push({
        userId: user.uid,
        userName: userName(user),
        photoUrl: user.photoURL || "",
        text,
        createdAt: now,
      });
      state.lastPostedAt = now;
      resetForm(section);
    } catch (_) {
      notify(tx("কমেন্ট পোস্ট করা যায়নি। আবার চেষ্টা করুন।", "Could not post the comment. Please try again."));
    } finally {
      submitBtn.disabled = false;
      input.disabled = false;
    }
  }

  // ---- mount / unmount --------------------------------------------------

  function bindSectionEvents(state, section) {
    section.addEventListener("click", async (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === "load-more") return loadMore(state, section);

      if (action === "reply") {
        const row = btn.closest(".ar-comment");
        const name = row.querySelector(".ar-comment-head strong")?.textContent || tx("ব্যবহারকারী", "User");
        beginReply(section, row.dataset.commentId, name);
        return;
      }

      if (action === "cancel-reply") return resetForm(section);

      if (action === "edit") {
        const user = getUser();
        if (!user) return notify(tx("অনুগ্রহ করে লগইন করুন।", "Please log in."));
        beginEdit(btn.closest(".ar-comment"), section);
        return;
      }

      if (action === "save-edit") return saveEdit(state, section, btn.closest(".ar-comment-edit-box"));

      if (action === "cancel-edit") {
        // Live listener re-render will restore original markup; just no-op here
        // by forcing a refresh of the current page.
        loadPage(state, section);
        return;
      }

      if (action === "delete") {
        const user = getUser();
        if (!user) return notify(tx("অনুগ্রহ করে লগইন করুন।", "Please log in."));
        // The Edit/Delete buttons are only rendered for the comment's own
        // author (see commentRowHTML's `own` check), but that's a UX nicety
        // only — real enforcement must live in Firebase Rules, since anyone
        // could call the SDK directly and bypass this UI.
        return deleteComment(state, btn.closest(".ar-comment"));
      }
    });

    const form = section.querySelector(".ar-comment-form");
    const input = form.elements.comment;
    input.addEventListener("input", () => {
      renderCharCount(section, MAX_LENGTH - input.value.length);
    });
    renderCharCount(section, MAX_LENGTH);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitComment(state, section, form);
    });
  }

  function mount(card, postId, options = {}) {
    ensureStyles();
    const section = card.querySelector(".ar-comments");
    if (!section) return;

    // Avoid double-mounting the same section.
    if (instances.has(section)) return;

    section.innerHTML = commentsSectionHTML(postId);

    const state = {
      postId,
      pageSize: options.pageSize || PAGE_SIZE,
      loadedCount: 0,
      totalCount: null,
      lastPostedAt: 0,
      rootRef: null,
      rootHandler: null,
    };
    instances.set(section, state);

    bindSectionEvents(state, section);
    loadPage(state, section);
  }

  function unmount(card) {
    const section = card.querySelector(".ar-comments");
    if (!section) return;
    const state = instances.get(section);
    if (!state) return;
    if (state.rootRef) state.rootRef.off("value", state.rootHandler);
    instances.delete(section);
  }

  window.ARComments = { mount, unmount };
})();

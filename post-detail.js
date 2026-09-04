/* AR News — standalone post + comments page.
 * Relies on window.ARPost (post.js) and window.ARComments (comment.js),
 * both of which must be loaded before this file.
 */
(function () {
  "use strict";

  function getPostIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || params.get("post") || "";
  }

  function showMessage(container, message) {
    container.innerHTML = `<div class="ar-feed-state">${message}</div>`;
  }

  function initPostDetail() {
    const container = document.getElementById("ar-post-detail");
    if (!container) return;

    const AP = window.ARPost;
    if (!AP) {
      showMessage(container, "Could not load the page (post.js missing).");
      return;
    }
    AP.ensureStyles();

    const postId = getPostIdFromUrl();
    if (!postId) {
      showMessage(container, AP.tx("পোস্ট খুঁজে পাওয়া যায়নি।", "Post not found."));
      return;
    }

    if (!window.rtdb) {
      showMessage(container, "Could not connect. Please try again later.");
      return;
    }

    const postRef = window.rtdb.ref(`posts/${AP.safeKey(postId)}`);
    let cardEl = null;
    let signature = null;
    let likesRef = null;
    let likesHandler = null;

    function attachLikes(el) {
      if (likesRef) likesRef.off("value", likesHandler);
      likesRef = AP.interactionRef(postId, "likes");
      likesHandler = (snap) => AP.updateLikeUI(el, snap.val() || {});
      likesRef.on("value", likesHandler);
    }

    function render(post) {
      const newSignature = AP.contentSignature(post);
      if (cardEl && signature === newSignature) return; // only likes/comments/reports changed — leave it alone
      signature = newSignature;

      const fresh = AP.buildCardElement(postId, post);
      // On the dedicated page the "Comments" link would just point back to
      // this same page — remove it, comments are always shown below.
      fresh.querySelector(".ar-comments-link")?.remove();

      if (cardEl) cardEl.replaceWith(fresh);
      else container.appendChild(fresh);
      cardEl = fresh;
      attachLikes(cardEl);
    }

    postRef.once("value").then((snap) => {
      const post = snap.val();
      if (!post || post.published === false) {
        showMessage(container, AP.tx("এই পোস্টটি পাওয়া যায়নি বা মুছে ফেলা হয়েছে।", "This post could not be found or has been removed."));
        return;
      }

      container.innerHTML = "";
      render(post);

      // `container` holds both the post card and this section as direct
      // children, so it satisfies ARComments.mount's expectation of a
      // "card" element with a `.ar-comments` descendant — no post-card
      // wrapping needed just for the comment thread.
      const commentsSection = document.createElement("section");
      commentsSection.className = "ar-comments";
      container.appendChild(commentsSection);
      window.ARComments.mount(container, postId);

      AP.bindEvents(container);

      // Keep the header (title/body/image/etc) in sync with live edits,
      // without disturbing the comment thread mounted separately below.
      postRef.on("value", (liveSnap) => {
        const livePost = liveSnap.val();
        if (!livePost || livePost.published === false) {
          if (likesRef) likesRef.off("value", likesHandler);
          window.ARComments.unmount(container);
          showMessage(container, AP.tx("এই পোস্টটি সরিয়ে ফেলা হয়েছে।", "This post has been removed."));
          return;
        }
        render(livePost);
      });
    }).catch(() => {
      showMessage(container, AP.tx("পোস্ট লোড করা যায়নি।", "Could not load the post."));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPostDetail);
  else initPostDetail();
})();

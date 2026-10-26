// AR News — Cloudflare Worker (স্ট্যাটিক অ্যাসেটসহ একই "ar-news" Worker প্রজেক্টে চলে)
// নীতি: মানুষ ও গুগল-সহ সব বট একই কন্টেন্ট পায় — কোনো ইউজার-এজেন্ট ভিত্তিক আলাদা আচরণ নেই (ক্লোকিং নয়)
// ১) /news/ID.html — ফাইল থাকলে সেটাই; না থাকলে (নতুন পোস্ট) Firebase থেকে একই টেমপ্লেটে বানিয়ে দেয়
// ২) পুরোনো /feed.html?post=ID লিংক — স্থায়ী (301) রিডাইরেক্ট /news/ID.html-এ, সবার জন্য
// ৩) বাকি সবকিছু env.ASSETS (আপনার সাইটের ফাইল) থেকে যায়

const SITE = "https://arnews.info";
const DB = "https://ar-news-ai-default-rtdb.firebaseio.com";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isPublished = (p) => p && (p.status === "published" || p.published === true);

const fmtDate = (ms) =>
  new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(Number(ms)));

async function getPost(id) {
  if (!/^[\w-]+$/.test(id)) return null;
  const res = await fetch(`${DB}/posts/${id}.json`);
  if (!res.ok) return null;
  const p = await res.json();
  return isPublished(p) ? p : null;
}

function pageHTML(id, p, related = "") {
  const url = `${SITE}/news/${id}.html`;
  const title = p.title || "AR News";
  const body = p.description || p.body || "";
  const desc = body.replace(/\s+/g, " ").trim().slice(0, 160);
  const img = p.imageUrl || `${SITE}/logo.png`;
  const published = p.createdAt ? new Date(Number(p.createdAt)).toISOString() : undefined;
  const modified = p.updatedAt ? new Date(Number(p.updatedAt)).toISOString() : published;
  const category = p.category || "সাধারণ";
  const author = p.authorName || "AR News";

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title.slice(0, 110),
    description: desc,
    image: [img],
    datePublished: published,
    dateModified: modified,
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: "AR News",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    mainEntityOfPage: url,
  };

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<script>
(function(){try{var t=localStorage.getItem("ar-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);var i=parseInt(localStorage.getItem("ar-fontsize-idx"),10),F=[14,15.5,17,18.5,20];if(i>=0&&i<F.length)document.documentElement.style.setProperty("--article-font-size",F[i]+"px");}catch(e){}})();
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${esc(title)} | AR News</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/logo.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AR News">
<meta property="og:locale" content="bn_BD">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/news-actions.css?v=20261025">
</head>
<body>
<div class="detail-top">
  <a class="detail-back" href="/feed.html" aria-label="ফিরে যান">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  </a>
  <span>Full Story</span>
</div>
<main class="detail-body">
  <article>
    ${p.imageUrl ? `<img class="cover" src="${esc(p.imageUrl)}" alt="${esc(title)}" onerror="this.remove()">` : ""}
    <div id="post-actions-mount"></div>
    <div class="post-meta"><span class="dot"></span><span>${esc(category)}</span><span>·</span><span class="date">${p.createdAt ? esc(fmtDate(p.createdAt)) : ""}</span></div>
    <h1 id="detail-title">${esc(title)}</h1>
    <p class="body-text" id="detail-text">${esc(body)}</p>
    <div class="author">Posted by: <strong>${esc(author)}</strong></div>
  </article>
  ${related}
</main>
<footer class="site-foot">
  <a href="/about.html">About Us</a>
  <a href="/contact.html">Contact Us</a>
  <a href="/privacy.html">Privacy Policy</a>
</footer>
<script src="/news-actions.js?v=20261025" data-post-id="${esc(id)}" defer></script>
</body>
</html>
`;
}

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=300",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // পুরোনো শেয়ার লিংক: /feed.html?post=ID → আসল নিউজ পেজে (301)
    const postId = url.pathname === "/feed.html" ? url.searchParams.get("post") : null;
    if (postId && /^[\w-]+$/.test(postId)) {
      return Response.redirect(`${SITE}/news/${postId}.html`, 301);
    }

    // /news/ID  বা  /news/ID.html — সবার জন্য একই
    const m = url.pathname.match(/^\/news\/([\w-]+?)(?:\.html)?\/?$/);
    if (m) {
      const res = await env.ASSETS.fetch(request);
      if (res.status !== 404) return res;
      try {
        const post = await getPost(m[1]);
        if (post) return htmlResponse(pageHTML(m[1], post));
      } catch (e) {
        // Firebase সমস্যা হলে আসল ৪০৪ই যাবে
      }
      return res;
    }

    return env.ASSETS.fetch(request);
  },
};

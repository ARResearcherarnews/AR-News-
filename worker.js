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
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(Number(ms)));

async function getPost(id) {
  if (!/^[\w-]+$/.test(id)) return null;
  const res = await fetch(`${DB}/posts/${id}.json`);
  if (!res.ok) return null;
  const p = await res.json();
  return isPublished(p) ? p : null;
}

function pageHTML(id, p) {
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

  const paras = body
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<p>${esc(t)}</p>`)
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | AR News</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/logo.png">
<link rel="stylesheet" href="/news-actions.css?v=20261024">
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
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{--bg:#fff;--ink:#151515;--muted:#6b6b6b;--line:#e6e6e6;--brand:#0f766e}
  @media(prefers-color-scheme:dark){:root{--bg:#101312;--ink:#eef1f0;--muted:#9aa3a0;--line:#2a302e;--brand:#2dd4bf}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:'Hind Siliguri',system-ui,sans-serif;line-height:1.85}
  header{border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
  header a{color:var(--brand);font-weight:700;font-size:20px;text-decoration:none}
  main{max-width:720px;margin:0 auto;padding:24px 20px 48px}
  .meta{color:var(--muted);font-size:14px}
  .meta b{color:var(--brand)}
  h1{font-size:30px;line-height:1.35;margin:8px 0 16px}
  img.hero{width:100%;height:auto;border-radius:12px;margin:8px 0 18px;display:block}
  p{font-size:18px;margin:0 0 16px}
  .more{display:inline-block;margin-top:18px;padding:10px 18px;border-radius:999px;background:var(--brand);color:#fff;text-decoration:none;font-weight:600}
  footer{border-top:1px solid var(--line);padding:18px 20px;text-align:center;font-size:14px;color:var(--muted)}
  footer a{color:var(--muted);margin:0 8px}
</style>
</head>
<body>
<header><a href="/feed.html">AR News</a></header>
<main>
  <article>
    <div class="meta"><b>${esc(category)}</b>${p.createdAt ? " · " + esc(fmtDate(p.createdAt)) : ""}</div>
    <h1>${esc(title)}</h1>
    ${p.imageUrl ? `<img class="hero" src="${esc(p.imageUrl)}" alt="${esc(title)}">` : ""}
    <div id="post-actions-mount"></div>
    ${paras}
  </article>
  <a class="more" href="/feed.html">আরও খবর পড়ুন</a>
</main>
<footer>
  <a href="/about.html">About Us</a>
  <a href="/contact.html">Contact Us</a>
  <a href="/privacy.html">Privacy Policy</a>
</footer>
<script src="/news-actions.js?v=20261024" data-post-id="${esc(id)}" defer></script>
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

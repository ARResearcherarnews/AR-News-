// AR News — Firebase থেকে প্রতিটি published পোস্টের জন্য স্ট্যাটিক HTML পেজ + sitemap.xml তৈরি করে।
// পেজে নিউজের লেখা সরাসরি HTML-এ থাকে (গুগল ইনডেক্সের জন্য); Like/Comment/Share যোগ করে /news-actions.js।
// চালানো: node build-news.mjs   (Node 18+)

import { mkdir, rm, writeFile } from "node:fs/promises";

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

function relatedHTML(id, p, all) {
  const others = all.filter(([oid]) => oid !== id);
  if (!others.length) return "";
  const cat = p.category || "সাধারণ";
  const same = others.filter(([, o]) => (o.category || "সাধারণ") === cat);
  const rest = others.filter(([oid]) => !same.some(([sid]) => sid === oid));
  const picks = [...same, ...rest].slice(0, 3);
  const cards = picks
    .map(([oid, o]) => {
      const t = esc(o.title || "শিরোনামহীন");
      const im = o.imageUrl
        ? `<img src="${esc(o.imageUrl)}" alt="${t}" loading="lazy" onerror="this.remove()">`
        : "";
      return `<a class="related-card" href="/news/${encodeURIComponent(oid)}.html">${im}<div class="related-meta">${esc(o.category || "সাধারণ")}</div><h4>${t}</h4></a>`;
    })
    .join("\n      ");
  return `<div class="related-posts">
    <h2>Related Posts</h2>
    <div class="related-grid">
      ${cards}
    </div>
  </div>`;
}

async function main() {
  const res = await fetch(`${DB}/posts.json`);
  if (!res.ok) throw new Error(`Firebase read failed: ${res.status}`);
  const data = (await res.json()) || {};

  const posts = Object.entries(data)
    .filter(([id, p]) => /^[\w-]+$/.test(id) && isPublished(p))
    .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  // আনপাবলিশ/মুছে ফেলা পোস্টের পুরোনো পেজ বাদ দিতে প্রতিবার নতুন করে বানাই
  await rm("news", { recursive: true, force: true });
  await mkdir("news", { recursive: true });

  const urls = [
    `  <url>\n    <loc>${SITE}/feed.html</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
  ];

  for (const [id, p] of posts) {
    await writeFile(`news/${id}.html`, pageHTML(id, p, relatedHTML(id, p, posts)));
    const last = p.updatedAt || p.createdAt;
    urls.push(
      `  <url>\n    <loc>${SITE}/news/${id}.html</loc>` +
        (last ? `\n    <lastmod>${new Date(Number(last)).toISOString()}</lastmod>` : "") +
        `\n  </url>`
    );
  }

  await writeFile(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
  );

  console.log(`Done: ${posts.length} posts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

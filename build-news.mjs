// AR News — Firebase থেকে প্রতিটি published পোস্টের জন্য স্ট্যাটিক HTML পেজ + sitemap.xml তৈরি করে।
// চালানো: node scripts/build-news.mjs   (Node 18+)

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
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(Number(ms)));

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
  header{border-bottom:1px solid var(--line);padding:14px 20px}
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
    ${paras}
  </article>
  <a class="more" href="/feed.html">আরও খবর পড়ুন</a>
</main>
<footer>
  <a href="/about.html">About Us</a>
  <a href="/contact.html">Contact Us</a>
  <a href="/privacy.html">Privacy Policy</a>
</footer>
</body>
</html>
`;
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
    await writeFile(`news/${id}.html`, pageHTML(id, p));
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

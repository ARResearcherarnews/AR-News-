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

// ============================================================
// AI ড্রাফট সিস্টেম — শুধু অ্যাডমিনের জন্য (/api/ai/draft, /api/ai/image)
// দরকারি সেটিং (Cloudflare ড্যাশবোর্ড → Worker → Settings):
//   Secret : GEMINI_API_KEY
//   Text   : FIREBASE_API_KEY (আপনার config.js-এর apiKey)
//   ঐচ্ছিক : ADMIN_UIDS (UID কমা দিয়ে) — না দিলে ডাটাবেসের users/UID/role === "admin" দেখে অ্যাডমিন চেনা হয়
//   ঐচ্ছিক : REPORT_LIMIT (দৈনিক রিপোর্ট, ডিফল্ট ১০), REPORT_TIMEOUT_MIN (মিনিট, ডিফল্ট ১০)
//   Text   : GEMINI_MODEL (ঐচ্ছিক; কমা দিয়ে একাধিক মডেল দিলে আগেরটা না চললে পরেরটা চেষ্টা হয়)
//   Binding: Workers AI → ভেরিয়েবল নাম AI (ছবির জন্য)
// ============================================================

const DEFAULT_CATEGORIES = [
  "জাতীয়", "আন্তর্জাতিক", "রাজনীতি", "অর্থনীতি", "খেলা",
  "বিনোদন", "প্রযুক্তি", "শিক্ষা", "স্বাস্থ্য", "সাধারণ",
];

const jsonRes = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" },
  });

// Firebase লগইন টোকেন যাচাই + অ্যাডমিন UID তালিকায় আছে কি না
async function requireAdmin(request, env) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !env.FIREBASE_API_KEY) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const u = data.users && data.users[0];
  if (!u) return null;
  const allowed = String(env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes(u.localId)) return u;
  // ADMIN_UIDS না থাকলে বা তালিকায় না মিললে: ডাটাবেসে users/UID/role === "admin" কি না দেখা (সাইটের রুলসের মতোই)
  try {
    if (env.FIREBASE_SA) {
      const role = await fb(env, "GET", `users/${encodeURIComponent(u.localId)}/role`);
      if (role === "admin") return u;
    }
  } catch (e) { /* অনুমতি নেই ধরা হবে */ }
  return null;
}

// মডেল-তালিকা: আগেরটা না চললে (৪০৪ = নেই, ৪২৯ = কোটা শেষ, ৫০৩ = ব্যস্ত) পরেরটা চেষ্টা করে।
// কোটা মডেল-ভিত্তিক, তাই এক মডেলে শেষ হলেও অন্যটায় চলতে পারে। নিজের তালিকা দিতে GEMINI_MODEL-এ কমা দিয়ে লিখুন।
// ফ্রি-টিয়ার (AI Studio → Rate limit পেজ অনুযায়ী):
//  • Google Search সহ কল (যাচাই/রিপোর্ট): সার্চ-গ্রাউন্ডিং শুধু Gemini 2.x-এ চলে ("Gemini 3 and newer" = 0), তাই শুধু ২.৫ মডেল।
//    ২.৫ Flash / Flash Lite — প্রতিটি দিনে ২০টি, মিনিটে ৫/১০টি।
//  • সার্চ ছাড়া কল (লেখা): Flash Lite-এ দিনে ৫০০টি, মিনিটে ১৫টি — তাই আগে ওগুলো।
const SEARCH_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
const WRITE_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];

const listFrom = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

class QuotaError extends Error {
  constructor(msg) { super(msg); this.name = "QuotaError"; this.quota = true; }
}

async function callGemini(env, body, signal) {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY সেট করা নেই");
  const useSearch = !!(body && body.tools && body.tools.length);
  const models = useSearch
    ? (env.GEMINI_MODEL ? listFrom(env.GEMINI_MODEL) : SEARCH_MODELS)
    : (env.GEMINI_WRITE_MODEL ? listFrom(env.GEMINI_WRITE_MODEL) : WRITE_MODELS);
  const failed = [];
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify(body),
        signal,
      }
    );
    if (res.ok) return res.json();
    const txt = await res.text();
    const toolUnsupported = res.status === 400 && /search|grounding|tool/i.test(txt);
    if ([404, 429, 503].includes(res.status) || toolUnsupported) {
      failed.push(`${model}: ${res.status}`);
      continue;
    }
    throw new Error(`Gemini (${model}) ${res.status}: ${txt.slice(0, 300)}`);
  }
  const quota = failed.some((f) => f.endsWith(": 429"));
  const msg =
    (quota ? "Gemini-র কোটা শেষ বা এই মডেলে সার্চ-যাচাই বন্ধ" : "কোনো Gemini মডেল পাওয়া যায়নি") +
    ` (${failed.join(", ")}) — AI Studio-র Rate limit পেজ দেখুন`;
  throw quota ? new QuotaError(msg) : new Error(msg);
}

const geminiText = (d) =>
  ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [])
    .map((p) => p.text || "")
    .join("");

function parseJSONLoose(t) {
  const s = t.replace(/```json|```/g, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("AI-এর উত্তর পড়া যায়নি");
  return JSON.parse(s.slice(a, b + 1));
}

// লিংক থেকে সাদামাটা লেখা বের করা
async function textFromUrl(u) {
  if (!/^https?:\/\//i.test(u)) throw new Error("লিংক সঠিক নয়");
  const res = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 ARNewsBot" }, redirect: "follow" });
  if (!res.ok) throw new Error("লিংকটি খোলা যায়নি");
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

// ধাপ ১: শিরোনাম + বিভাগ + বিস্তারিত + ছবির বর্ণনা
async function writeDraft(env, source, categories) {
  const prompt =
    `তুমি একজন অভিজ্ঞ বাংলা নিউজ সম্পাদক। নিচের সূত্র-তথ্য থেকে একটি খবরের খসড়া লেখো।\n` +
    `কঠোর নিয়ম:\n` +
    `- শুধু সূত্রে থাকা তথ্য ব্যবহার করো। নিজে থেকে কোনো নাম, সংখ্যা, তারিখ বা উক্তি যোগ করবে না।\n` +
    `- নিরপেক্ষ ভাষা; শিরোনাম ক্লিকবেইট নয়, ১২০ অক্ষরের মধ্যে।\n` +
    `- বিভাগ (category) এই তালিকা থেকে ঠিক একটি: ${categories.join(", ")}\n` +
    `- body: ৩ থেকে ৬ অনুচ্ছেদ, অনুচ্ছেদের মাঝে ফাঁকা লাইন।\n` +
    `- imagePrompt: ইংরেজিতে, প্রতীকী দৃশ্যের বর্ণনা; ছবিতে কোনো লেখা বা বাস্তব ব্যক্তির মুখ থাকবে না।\n` +
    `শুধু এই JSON দাও: {"title":"","category":"","body":"","imagePrompt":""}\n\n` +
    `সূত্র-তথ্য:\n${source}`;
  const d = await callGemini(env, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
  });
  const draft = parseJSONLoose(geminiText(d));
  if (!categories.includes(draft.category)) draft.category = categories[categories.length - 1];
  return {
    title: String(draft.title || "").trim(),
    category: draft.category,
    body: String(draft.body || "").trim(),
    imagePrompt: String(draft.imagePrompt || "").trim(),
  };
}

// ধাপ ২: Google Search গ্রাউন্ডিং দিয়ে সত্যতা যাচাই
async function factCheck(env, draft) {
  const prompt =
    `তুমি একজন ফ্যাক্ট-চেকার। ওয়েবে সার্চ করে নিচের খবরের মূল দাবিগুলো যাচাই করো।\n` +
    `শুধু এই JSON দাও (বাংলায়):\n` +
    `{"verdict":"verified|doubtful|unverified","summary":"২-৩ বাক্যে সারকথা","claims":[{"claim":"","status":"verified|doubtful|unverified","note":""}]}\n` +
    `- verified = একাধিক নির্ভরযোগ্য সূত্রে মিলেছে; doubtful = সূত্রের সাথে অমিল বা সন্দেহজনক; unverified = যাচাইয়ের মতো সূত্র পাওয়া যায়নি।\n` +
    `- claims সর্বোচ্চ ৬টি।\n\n` +
    `শিরোনাম: ${draft.title}\n\n${draft.body}`;
  const d = await callGemini(env, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1 },
  });
  const result = parseJSONLoose(geminiText(d));
  const chunks =
    (d.candidates && d.candidates[0] && d.candidates[0].groundingMetadata &&
      d.candidates[0].groundingMetadata.groundingChunks) || [];
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    if (c.web && c.web.uri && !seen.has(c.web.uri)) {
      seen.add(c.web.uri);
      sources.push({ title: c.web.title || c.web.uri, url: c.web.uri });
    }
  }
  return {
    verdict: ["verified", "doubtful", "unverified"].includes(result.verdict) ? result.verdict : "unverified",
    summary: String(result.summary || ""),
    claims: Array.isArray(result.claims) ? result.claims.slice(0, 6) : [],
    sources: sources.slice(0, 8),
  };
}

// ============================================================
// অটো-ড্রাফট: শনাক্ত → যাচাই → মৌলিক লেখা → অ্যাডমিন রিভিউ
// দৈনিক সীমা (ডিফল্ট): ২০টি ঘটনা শনাক্ত, ১০টি যাচাই, ৫টি সম্পূর্ণ ড্রাফট
// সীমা বদলাতে Cloudflare Variables: DETECT_LIMIT, VERIFY_LIMIT, DAILY_LIMIT
// ড্রাফট যায় Firebase-এর `drafts` নোডে। reviewStatus = pending_review বা review_required।
// অ্যাডমিন অনুমোদন (approved) ছাড়া কিছুই `posts`-এ যায় না।
// নীতি: সংবাদমাধ্যম শুধু "আবিষ্কারের উৎস" — শিরোনাম+লিংক নেওয়া হয়; লেখা সম্পূর্ণ নতুন করে লেখা হয়।
// অতিরিক্ত সেটিং: Secret FIREBASE_SA (সার্ভিস অ্যাকাউন্ট JSON); ঐচ্ছিক: CATEGORIES (কমা দিয়ে), FEEDS_JSON, PER_RUN
// ============================================================

const gnews = (site, lang = "bn") =>
  `https://news.google.com/rss/search?q=${encodeURIComponent("site:" + site + " when:1d")}&` +
  (lang === "bn" ? "hl=bn&gl=BD&ceid=BD:bn" : "hl=en&gl=BD&ceid=BD:en");

const DEFAULT_FEEDS = [
  { name: "প্রথম আলো", url: gnews("prothomalo.com") },
  { name: "বিডিনিউজ২৪", url: gnews("bdnews24.com") },
  { name: "যুগান্তর", url: gnews("jugantor.com") },
  { name: "জাগো নিউজ", url: gnews("jagonews24.com") },
  { name: "বাংলা ট্রিবিউন", url: gnews("banglatribune.com") },
  { name: "দ্য ডেইলি স্টার", url: gnews("thedailystar.net", "en") },
  { name: "টিবিএস নিউজ", url: gnews("tbsnews.net", "en") },
  { name: "বিএসএস", url: gnews("bssnews.net", "en") },
  { name: "যমুনা টিভি", url: gnews("jamuna.tv") },
  { name: "চ্যানেল ২৪", url: gnews("channel24bd.tv") },
];

const limits = (env) => ({
  detect: Number(env.DETECT_LIMIT || 20),
  verify: Number(env.VERIFY_LIMIT || 6),
  draft: Number(env.DAILY_LIMIT || 5),
});

const dhakaDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function sha1(s) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 20);
}

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// সার্ভিস অ্যাকাউন্ট দিয়ে Firebase Realtime Database-এর অ্যাক্সেস টোকেন (রুলস পার হয়ে লিখতে পারে)
let _fbTok = null;
async function fbToken(env) {
  if (_fbTok && _fbTok.exp > Date.now() + 60000) return _fbTok.value;
  if (!env.FIREBASE_SA) throw new Error("FIREBASE_SA সেট করা নেই");
  const sa = JSON.parse(env.FIREBASE_SA);
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned =
    enc({ alg: "RS256", typ: "JWT" }) +
    "." +
    enc({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const b64 = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  const key = await crypto.subtle.importKey("pkcs8", der.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + unsigned + "." + b64url(sig),
  });
  if (!res.ok) throw new Error("Firebase টোকেন পাওয়া যায়নি: " + (await res.text()).slice(0, 200));
  const j = await res.json();
  _fbTok = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return _fbTok.value;
}

async function fb(env, method, path, body, query = "") {
  const t = await fbToken(env);
  const res = await fetch(`${DB}/${path}.json?${query}access_token=${t}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firebase ${method} ${path} ${res.status}`);
  return res.json();
}

const unxml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

// সাধারণ RSS পার্সার (title, link, pubDate)
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const pick = (blk, tag) => {
    const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? unxml(m[1]) : "";
  };
  for (const b of blocks) {
    const title = pick(b, "title").replace(/\s+-\s+[^-]{2,40}$/, "").trim(); // গুগল নিউজের শেষের " - সাইটের নাম" বাদ
    const link = pick(b, "link");
    const t = Date.parse(pick(b, "pubDate"));
    if (title && link) items.push({ title, link, time: isNaN(t) ? Date.now() : t });
  }
  return items.sort((a, b) => b.time - a.time).slice(0, 15);
}

// শিরোনামের শব্দ-সেট (বাংলা স্বরচিহ্নসহ) ও মিল মাপা — একই ঘটনার একাধিক খবর এক করতে
const tokens = (s) => new Set(String(s).toLowerCase().match(/[\p{L}\p{M}\p{N}]{2,}/gu) || []);
function sim(a, b) {
  let i = 0;
  for (const t of a) if (b.has(t)) i++;
  const u = a.size + b.size - i;
  return u ? i / u : 0;
}

const V_STATUS = ["verified", "partially_verified", "unverified", "false_misleading"];
const normStatus = (s) => (V_STATUS.includes(s) ? s : "unverified");
const strArr = (a) => (Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean).slice(0, 8) : []);
const makeSlug = (s, id) =>
  (String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "news") + "-" + id.slice(-5);

// ধাপ ১: নতুন খবর শনাক্ত ও একই ঘটনার লিংক এক করা (Gemini লাগে না)
async function detectStage(env, st, feeds, lim) {
  const lists = await Promise.all(
    feeds.map(async (f) => {
      try {
        const r = await fetch(f.url, { headers: { "user-agent": "Mozilla/5.0 ARNewsBot" } });
        if (!r.ok) return [];
        return parseFeed(await r.text()).map((it) => ({ ...it, source: f.name }));
      } catch (e) {
        return [];
      }
    })
  );
  const items = lists.flat().filter((it) => it.time >= Date.now() - 36 * 3600 * 1000).sort((a, b) => b.time - a.time);

  const since = Date.now() - 48 * 3600 * 1000;
  const loaded = (await fb(env, "GET", "events", undefined, `orderBy=%22firstSeen%22&startAt=${since}&`)) || {};
  const events = {};
  const knownUrls = new Set();
  for (const [id, ev] of Object.entries(loaded)) {
    events[id] = { ...ev, id, sources: Array.isArray(ev.sources) ? ev.sources.filter(Boolean) : Object.values(ev.sources || {}) };
    for (const s of events[id].sources) knownUrls.add(s.url);
  }

  const dirty = new Set();
  for (const it of items) {
    if (knownUrls.has(it.link)) continue;
    knownUrls.add(it.link);
    const tk = tokens(it.title);
    let best = null;
    let bestSim = 0;
    for (const ev of Object.values(events)) {
      const s = sim(tk, new Set(String(ev.tok || "").split(" ")));
      if (s > bestSim) { bestSim = s; best = ev; }
    }
    const src = { name: it.source, title: it.title, url: it.link, time: it.time };
    if (best && bestSim >= 0.4) {
      best.sources.push(src);
      dirty.add(best.id);
    } else if (st.detected < lim.detect) {
      const id = "e" + (await sha1(it.link)).slice(0, 12);
      events[id] = { id, headline: it.title, tok: [...tk].join(" "), sources: [src], firstSeen: Date.now(), stage: "detected" };
      st.detected += 1;
      dirty.add(id);
    }
  }
  if (dirty.size) {
    const patch = {};
    for (const id of dirty) {
      const { id: _drop, ...rest } = events[id];
      patch[id] = rest;
    }
    await fb(env, "PATCH", "events", patch);
  }
  return events;
}

// ধাপ ২: গুগল সার্চ দিয়ে দাবি-ভিত্তিক যাচাই (প্রমাণ ছাড়া Verified নয়)
async function verifyEvent(env, ev) {
  const lines = ev.sources.slice(0, 8).map((s) => `- ${s.name}: ${s.title}`).join("\n");
  const prompt =
    `আজকের তারিখ: ${dhakaDate()}। তুমি একজন কঠোর ফ্যাক্ট-চেকার।\n` +
    `নিচের সংবাদমাধ্যমগুলো একই ঘটনা নিয়ে এই শিরোনামে খবর দিয়েছে:\n${lines}\n\n` +
    `ওয়েবে সার্চ করে ঘটনাটির মূল দাবিগুলো যাচাই করো। মূল বিবৃতি, সরকারি/প্রতিষ্ঠানের ঘোষণা, নথি বা একাধিক স্বাধীন উৎস খোঁজো।\n` +
    `কঠোর নিয়ম:\n` +
    `- প্রমাণ ছাড়া কোনো দাবিকে verified বলবে না। নিজের আত্মবিশ্বাস বা স্কোরকে প্রমাণ ধরবে না।\n` +
    `- একই মূল সূত্র/সংবাদ সংস্থা থেকে নেওয়া একাধিক খবরকে একটি উৎস গণনা করো (স্বাধীন নয়)।\n` +
    `- কোনো উৎস বিরোধিতা করলে conflicts-এ লেখো। যা নিশ্চিত নয় তা uncertainties-এ লেখো।\n` +
    `- ঘটনাটি আসলে পুরোনো (৪৮ ঘণ্টার বেশি আগের) হলে isOld: true দাও।\n` +
    `- claims সর্বোচ্চ ৬টি। supportedBy/contradictedBy-তে সংবাদমাধ্যম বা প্রতিষ্ঠানের নাম লেখো।\n` +
    `- primarySource: true শুধু তখনই, যখন মূল বিবৃতি/সরকারি নথি/প্রতিষ্ঠানের ঘোষণা নিজে পেয়েছ।\n` +
    `- enough: true শুধু তখনই, যখন লেখার মতো যথেষ্ট প্রমাণ আছে।\n` +
    `শুধু এই JSON দাও (বাংলায়):\n` +
    `{"isOld":false,"verdict":"verified|partially_verified|unverified|false_misleading","enough":false,"primarySource":false,"independentSources":0,` +
    `"claims":[{"claim":"","status":"verified|partially_verified|unverified|false_misleading","evidence":"","supportedBy":[""],"contradictedBy":[""]}],` +
    `"conflicts":[""],"uncertainties":[""],"sharedOriginNote":""}`;
  const d = await callGemini(env, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1 },
  });
  const chunks =
    (d.candidates && d.candidates[0] && d.candidates[0].groundingMetadata && d.candidates[0].groundingMetadata.groundingChunks) || [];
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    if (c.web && c.web.uri && !seen.has(c.web.uri)) {
      seen.add(c.web.uri);
      sources.push({ title: c.web.title || c.web.uri, url: c.web.uri });
    }
  }
  let r;
  try {
    r = parseJSONLoose(geminiText(d));
  } catch (e) {
    return { isOld: false, verdict: "unverified", enough: false, primarySource: false, independentSources: 0, claims: [], conflicts: [], uncertainties: ["AI-এর যাচাই-ফল পড়া যায়নি"], sources: sources.slice(0, 10) };
  }
  return {
    isOld: r.isOld === true,
    verdict: normStatus(r.verdict),
    enough: r.enough === true,
    primarySource: r.primarySource === true,
    independentSources: Number(r.independentSources) || 0,
    claims: (Array.isArray(r.claims) ? r.claims : []).slice(0, 6).map((c) => ({
      claim: String(c.claim || ""),
      status: normStatus(c.status),
      evidence: String(c.evidence || ""),
      supportedBy: strArr(c.supportedBy),
      contradictedBy: strArr(c.contradictedBy),
    })),
    conflicts: strArr(r.conflicts),
    uncertainties: strArr(r.uncertainties),
    sharedOriginNote: String(r.sharedOriginNote || ""),
    sources: sources.slice(0, 10),
  };
}

// লেখার মতো যথেষ্ট প্রমাণ আছে কি না
const hasEnoughEvidence = (v) =>
  v.enough && (v.verdict === "verified" || v.verdict === "partially_verified") && (v.primarySource || v.independentSources >= 2);

const reviewReason = (v) =>
  v.verdict === "false_misleading"
    ? "সম্ভাব্য ভুল বা বিভ্রান্তিকর খবর — সাবধানে দেখুন"
    : v.conflicts.length
    ? "সূত্রগুলোর মধ্যে পরস্পরবিরোধী তথ্য আছে"
    : "যাচাইয়ের প্রমাণ অপর্যাপ্ত — লেখা তৈরি করা হয়নি";

// ধাপ ৩: শুধু যাচাই-করা দাবি থেকে সম্পূর্ণ নতুন ভাষায় সংবাদ লেখা (সার্চ ছাড়া, যাতে নতুন তথ্য না ঢোকে)
async function writeArticle(env, ev, v, categories) {
  const facts = v.claims
    .filter((c) => c.status === "verified" || c.status === "partially_verified")
    .map((c, i) => `${i + 1}. ${c.claim} (প্রমাণ: ${c.evidence}) [${c.status}]`)
    .join("\n");
  const prompt =
    `তুমি একজন অভিজ্ঞ বাংলা নিউজ সম্পাদক। নিচের যাচাই-করা তথ্য থেকে সম্পূর্ণ মৌলিক সংবাদ লেখো।\n` +
    `যাচাই-করা দাবি:\n${facts}\n\nঅনিশ্চিত/অযাচাইকৃত বিষয়:\n${v.uncertainties.join("; ") || "নেই"}\n\n` +
    `কঠোর নিয়ম:\n` +
    `- শুধু উপরের দাবিগুলো ব্যবহার করো। নিজে থেকে কোনো নাম, সংখ্যা, তারিখ, পরিসংখ্যান, উদ্ধৃতি বা সূত্র যোগ করবে না।\n` +
    `- কোনো সংবাদমাধ্যমের শিরোনাম, বাক্য বা কাঠামো নকল করবে না; শুধু শব্দ বদলানোও চলবে না। নিজস্ব ভাষা ও কাঠামো।\n` +
    `- partially_verified তথ্য "এখনো পুরোপুরি নিশ্চিত নয়" বলে স্পষ্ট করো।\n` +
    `- content-এর কাঠামো (সাধারণ অনুচ্ছেদ, মাঝে ফাঁকা লাইন; মার্কডাউন বা তারকাচিহ্ন নয়): ১) সংক্ষিপ্ত ভূমিকা ২) মূল ঘটনার বিবরণ ৩) যাচাই-করা গুরুত্বপূর্ণ তথ্য ৪) প্রয়োজনীয় প্রেক্ষাপট ৫) "তথ্যের সীমাবদ্ধতা:" দিয়ে শুরু করা অনুচ্ছেদ।\n` +
    `- title তথ্যভিত্তিক, ক্লিকবেইট নয়, ১২০ অক্ষরের মধ্যে। summary ২০০ অক্ষরের মধ্যে।\n` +
    `- seoTitle ৬০ অক্ষরের মধ্যে; metaDescription ১৫৫ অক্ষরের মধ্যে; keywords ৫-৮টি; slug ইংরেজি ছোট হাতের অক্ষরে, হাইফেন দিয়ে।\n` +
    `- category এই তালিকা থেকে ঠিক একটি: ${categories.join(", ")}\n` +
    `- imagePrompt ইংরেজিতে, প্রতীকী দৃশ্য; লেখা বা বাস্তব ব্যক্তির মুখ নয়। socialPost ২৬০ অক্ষরের মধ্যে।\n` +
    `শুধু এই JSON দাও: {"title":"","summary":"","content":"","category":"","seoTitle":"","metaDescription":"","keywords":[""],"slug":"","imagePrompt":"","socialPost":""}`;
  const d = await callGemini(env, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const a = parseJSONLoose(geminiText(d));
  if (!a.title || !a.content) throw new Error("AI লেখা তৈরি করতে পারেনি");
  return {
    title: String(a.title).trim().slice(0, 180),
    summary: String(a.summary || "").trim().slice(0, 300),
    content: String(a.content).trim(),
    category: categories.includes(a.category) ? a.category : categories[categories.length - 1],
    seoTitle: String(a.seoTitle || a.title).trim().slice(0, 70),
    metaDescription: String(a.metaDescription || a.summary || "").trim().slice(0, 170),
    keywords: strArr(a.keywords),
    slug: String(a.slug || ""),
    imagePrompt: String(a.imagePrompt || "").trim(),
    socialPost: String(a.socialPost || "").trim().slice(0, 300),
  };
}

// একবার চলে: শনাক্ত → (সীমা থাকলে) কয়েকটি ঘটনা যাচাই ও ড্রাফট
async function runAuto(env) {
  const lim = limits(env);
  const today = dhakaDate();
  let st = (await fb(env, "GET", "autoState")) || {};
  if (st.date !== today) st = { date: today, detected: 0, verified: 0, drafted: 0, reviewRequired: 0 };

  // আগের বার কোটা শেষ হয়ে থাকলে বিরতি শেষ না হওয়া পর্যন্ত Gemini-কে একবারও ডাকা হবে না
  if (st.pauseUntil && Date.now() < st.pauseUntil) {
    return { paused: true, resumeAt: new Date(st.pauseUntil).toISOString(), note: "Gemini কোটা শেষ — বিরতিতে", limits: lim, results: [] };
  }

  let feeds = DEFAULT_FEEDS;
  if (env.FEEDS_JSON) {
    try { feeds = JSON.parse(env.FEEDS_JSON); } catch (e) { /* ডিফল্টই থাকবে */ }
  }
  const categories = env.CATEGORIES
    ? String(env.CATEGORIES).split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_CATEGORIES;
  const perRun = Number(env.PER_RUN || 1);
  const results = [];

  try {
    const events = await detectStage(env, st, feeds, lim);

    const cands = Object.values(events)
      .filter((e) => e.stage === "detected" && e.firstSeen >= Date.now() - 36 * 3600 * 1000)
      .sort((a, b) => new Set(b.sources.map((s) => s.name)).size - new Set(a.sources.map((s) => s.name)).size || b.firstSeen - a.firstSeen);

    for (const ev of cands) {
      if (results.length >= perRun || st.verified >= lim.verify || st.drafted >= lim.draft) break;

      const v = await verifyEvent(env, ev);
      st.verified += 1;

      if (v.isOld) {
        await fb(env, "PATCH", `events/${ev.id}`, { stage: "skipped_old" });
        results.push({ event: ev.headline, outcome: "skipped_old" });
        continue;
      }

      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const base = {
        sources: v.sources,
        claims: v.claims,
        verificationStatus: v.verdict,
        independentSources: v.independentSources,
        primarySource: v.primarySource,
        uncertainties: v.uncertainties,
        warnings: [...v.conflicts, ...(v.sharedOriginNote ? [v.sharedOriginNote] : [])],
        event: { id: ev.id, headline: ev.headline, outlets: ev.sources.slice(0, 8) },
        auto: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (!hasEnoughEvidence(v)) {
        await fb(env, "PUT", `drafts/${id}`, {
          ...base,
          title: ev.headline,
          category: categories[categories.length - 1],
          reviewStatus: "review_required",
          reviewNote: reviewReason(v),
        });
        await fb(env, "PATCH", `events/${ev.id}`, { stage: "review_required", draftId: id });
        st.reviewRequired += 1;
        results.push({ event: ev.headline, outcome: "review_required", verdict: v.verdict, draftId: id });
        continue;
      }

      const art = await writeArticle(env, ev, v, categories);
      await fb(env, "PUT", `drafts/${id}`, {
        ...base,
        ...art,
        slug: makeSlug(art.slug, id),
        reviewStatus: "pending_review",
      });
      await fb(env, "PATCH", `events/${ev.id}`, { stage: "drafted", draftId: id });
      st.drafted += 1;
      results.push({ event: ev.headline, outcome: "drafted", verdict: v.verdict, title: art.title, draftId: id });
    }

    if (!cands.length && !results.length) results.push({ note: "যাচাইয়ের জন্য নতুন কোনো ঘটনা নেই" });
  } catch (e) {
    if (e && e.quota) {
      // ৩ ঘণ্টা বিরতি (মিনিট-সীমা হলে এটুকুই যথেষ্ট; দিনের সীমা হলে পরের চেষ্টাও একবারই হবে)
      st.pauseUntil = Date.now() + 3 * 3600 * 1000;
      results.push({ note: "Gemini কোটা শেষ — ৩ ঘণ্টা বিরতি", error: e.message });
    } else {
      throw e;
    }
  } finally {
    st.lastRun = Date.now();
    await fb(env, "PUT", "autoState", st).catch(() => {});
  }

  // দিনে একবার: ৩ দিনের পুরোনো ঘটনার রেকর্ড মুছে ফেলা
  if (st.pruned !== today) {
    try {
      const old = (await fb(env, "GET", "events", undefined, `orderBy=%22firstSeen%22&endAt=${Date.now() - 72 * 3600 * 1000}&limitToFirst=100&`)) || {};
      const nulls = {};
      for (const k of Object.keys(old)) nulls[k] = null;
      if (Object.keys(nulls).length) await fb(env, "PATCH", "events", nulls);
      st.pruned = today;
      await fb(env, "PATCH", "autoState", { pruned: today });
    } catch (e) { /* পরের বার আবার চেষ্টা */ }
  }

  return { detected: st.detected, verified: st.verified, drafted: st.drafted, reviewRequired: st.reviewRequired, limits: lim, results };
}

// ============================================================
// টাইটেল থেকে গবেষণা-রিপোর্ট (/api/ai/report)
// অ্যাডমিন একটি শিরোনাম/বিষয় দেয় → Gemini মাত্র ১ বার (Google Search সহ) ডাকা হয়:
// তথ্য সংগ্রহ + দাবি যাচাই + রিপোর্ট + আরও ভালো শিরোনামের বিকল্প + সংবাদের খসড়া।
// ফল `drafts`-এ যায় (reviewStatus = pending_review / review_required) — অ্যাডমিন অনুমোদন ছাড়া কিছু প্রকাশ হয় না।
// অযথা Gemini কল এড়াতে:
//   • একই বিষয় ২৪ ঘণ্টার মধ্যে আবার দিলে আগের রিপোর্টই খোলে (নতুন কল নয়; force:true দিলে নতুন)
//   • দৈনিক সীমা REPORT_LIMIT (ডিফল্ট ১০)
//   • সময়সীমা REPORT_TIMEOUT_MIN মিনিট (ডিফল্ট ১০) — এর মধ্যে না হলে বাতিল
// ============================================================

const normTopic = (s) =>
  String(s || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

const cleanTitles = (a) =>
  (Array.isArray(a) ? a : [])
    .map((o) => (typeof o === "string" ? { title: o, why: "" } : { title: String((o && o.title) || ""), why: String((o && o.why) || "") }))
    .map((o) => ({ title: o.title.trim().slice(0, 150), why: o.why.trim().slice(0, 200) }))
    .filter((o) => o.title)
    .slice(0, 5);

async function researchReport(env, topic, categories, preferred, signal) {
  const prompt =
    `আজকের তারিখ: ${dhakaDate()}। তুমি একজন কঠোর ফ্যাক্ট-চেকার এবং অভিজ্ঞ বাংলা নিউজ সম্পাদক।\n` +
    `অ্যাডমিন এই বিষয়/শিরোনামে একটি যাচাই-করা রিপোর্ট চান:\n"${topic}"\n\n` +
    `কাজ (একবারেই): ওয়েবে সার্চ করে বিষয়টি নিয়ে বিস্তারিত তথ্য সংগ্রহ করো, মূল দাবিগুলো যাচাই করো, তারপর রিপোর্ট ও সংবাদের খসড়া দাও।\n` +
    `কঠোর নিয়ম:\n` +
    `- প্রমাণ ছাড়া কোনো দাবিকে verified বলবে না। নিজের আত্মবিশ্বাস বা স্কোরকে প্রমাণ ধরবে না।\n` +
    `- একই মূল সূত্র/সংবাদ সংস্থা থেকে নেওয়া একাধিক খবরকে একটি উৎস গণনা করো (স্বাধীন নয়)।\n` +
    `- কোনো উৎস বিরোধিতা করলে conflicts-এ লেখো। যা নিশ্চিত নয় তা uncertainties-এ লেখো।\n` +
    `- primarySource: true শুধু তখনই, যখন মূল বিবৃতি/সরকারি নথি/প্রতিষ্ঠানের ঘোষণা নিজে পেয়েছ। enough: true শুধু তখনই, যখন লেখার মতো যথেষ্ট প্রমাণ আছে।\n` +
    `- claims সর্বোচ্চ ৮টি। supportedBy/contradictedBy-তে সংবাদমাধ্যম বা প্রতিষ্ঠানের নাম লেখো।\n` +
    `- report.summary ৩-৪ বাক্য; keyFindings ৩-৮টি যাচাই-করা পয়েন্ট; background সংক্ষিপ্ত প্রেক্ষাপট; unclear = যা এখনো স্পষ্ট নয়।\n` +
    `- titleOptions: ৩-৫টি আরও ভালো শিরোনাম (প্রতিটি ১২০ অক্ষরের মধ্যে, তথ্যভিত্তিক, ক্লিকবেইট নয়); why-তে এক বাক্যে কেন ভালো।\n` +
    `- content: enough সত্য হলে ৪-৬ অনুচ্ছেদের সম্পূর্ণ মৌলিক সংবাদ — শুধু যাচাই-করা তথ্য; নিজে থেকে কোনো নাম, সংখ্যা, তারিখ, উদ্ধৃতি যোগ করবে না; কোনো সংবাদমাধ্যমের বাক্য নকল করবে না; অনুচ্ছেদের মাঝে ফাঁকা লাইন; মার্কডাউন বা তারকাচিহ্ন নয়; শেষ অনুচ্ছেদ "তথ্যের সীমাবদ্ধতা:" দিয়ে শুরু। enough মিথ্যা হলে content "" রাখো।\n` +
    `- category: ${preferred ? `অ্যাডমিন "${preferred}" বেছেছেন, সেটাই দাও` : "এই তালিকা থেকে ঠিক একটি"} (তালিকা: ${categories.join(", ")})\n` +
    `- imagePrompt ইংরেজিতে, প্রতীকী দৃশ্য; ছবিতে লেখা বা বাস্তব ব্যক্তির মুখ নয়। socialPost ২৬০ অক্ষরের মধ্যে। slug ইংরেজি ছোট হাতের অক্ষর ও হাইফেনে।\n` +
    `শুধু এই JSON দাও (বাংলায়; JSON-এর বাইরে কিছু নয়):\n` +
    `{"isOld":false,"verdict":"verified|partially_verified|unverified|false_misleading","enough":false,"primarySource":false,"independentSources":0,` +
    `"claims":[{"claim":"","status":"verified|partially_verified|unverified|false_misleading","evidence":"","supportedBy":[""],"contradictedBy":[""]}],` +
    `"conflicts":[""],"uncertainties":[""],"sharedOriginNote":"",` +
    `"report":{"summary":"","keyFindings":[""],"background":"","unclear":[""]},` +
    `"titleOptions":[{"title":"","why":""}],` +
    `"title":"","summary":"","content":"","category":"","seoTitle":"","metaDescription":"","keywords":[""],"slug":"","imagePrompt":"","socialPost":""}`;

  const d = await callGemini(
    env,
    { contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } },
    signal
  );

  const chunks =
    (d.candidates && d.candidates[0] && d.candidates[0].groundingMetadata && d.candidates[0].groundingMetadata.groundingChunks) || [];
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    if (c.web && c.web.uri && !seen.has(c.web.uri)) {
      seen.add(c.web.uri);
      sources.push({ title: c.web.title || c.web.uri, url: c.web.uri });
    }
  }

  let r;
  try {
    r = parseJSONLoose(geminiText(d));
  } catch (e) {
    r = { uncertainties: ["AI-এর উত্তর পড়া যায়নি, আবার চেষ্টা করুন"] };
  }
  const rep = r.report || {};
  return {
    verdict: normStatus(r.verdict),
    enough: r.enough === true,
    primarySource: r.primarySource === true,
    independentSources: Number(r.independentSources) || 0,
    claims: (Array.isArray(r.claims) ? r.claims : []).slice(0, 8).map((c) => ({
      claim: String(c.claim || ""),
      status: normStatus(c.status),
      evidence: String(c.evidence || ""),
      supportedBy: strArr(c.supportedBy),
      contradictedBy: strArr(c.contradictedBy),
    })),
    conflicts: strArr(r.conflicts),
    uncertainties: strArr(r.uncertainties),
    sharedOriginNote: String(r.sharedOriginNote || ""),
    report: {
      summary: String(rep.summary || "").trim().slice(0, 900),
      keyFindings: strArr(rep.keyFindings),
      background: String(rep.background || "").trim().slice(0, 1500),
      unclear: strArr(rep.unclear),
    },
    titleOptions: cleanTitles(r.titleOptions),
    title: String(r.title || "").trim().slice(0, 180),
    summary: String(r.summary || rep.summary || "").trim().slice(0, 300),
    content: String(r.content || "").trim(),
    category: categories.includes(preferred) ? preferred : categories.includes(r.category) ? r.category : categories[categories.length - 1],
    seoTitle: String(r.seoTitle || "").trim().slice(0, 70),
    metaDescription: String(r.metaDescription || "").trim().slice(0, 170),
    keywords: strArr(r.keywords),
    slug: String(r.slug || ""),
    imagePrompt: String(r.imagePrompt || "").trim(),
    socialPost: String(r.socialPost || "").trim().slice(0, 300),
    sources: sources.slice(0, 10),
  };
}

async function createReport(env, topic, input) {
  const categories = env.CATEGORIES
    ? String(env.CATEGORIES).split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_CATEGORIES;
  const preferred = String(input.category || "").trim();
  const key = "r" + (await sha1(normTopic(topic)));

  // ১) আগে করা রিপোর্ট থাকলে Gemini ডাকা হয় না
  if (!input.force) {
    const hit = await fb(env, "GET", `reports/${key}`);
    if (hit && hit.draftId && Date.now() - Number(hit.at || 0) < 24 * 3600 * 1000) {
      const still = await fb(env, "GET", `drafts/${hit.draftId}/createdAt`);
      if (still) return { draftId: hit.draftId, cached: true };
    }
  }

  // ২) দৈনিক সীমা
  const today = dhakaDate();
  const rs = (await fb(env, "GET", "reportState")) || {};
  const used = rs.date === today ? Number(rs.count || 0) : 0;
  const cap = Number(env.REPORT_LIMIT || 5);
  if (used >= cap) throw new Error(`আজকের রিপোর্টের সীমা (${cap}টি) শেষ — কাল আবার চেষ্টা করুন`);

  // ৩) একবারই Gemini, সর্বোচ্চ REPORT_TIMEOUT_MIN মিনিট
  const mins = Number(env.REPORT_TIMEOUT_MIN || 10);
  let v;
  try {
    v = await researchReport(env, topic, categories, preferred, AbortSignal.timeout(mins * 60000));
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new Error(`নির্ধারিত সময় (${mins} মিনিট) শেষ হয়ে গেছে — আবার চেষ্টা করুন`);
    }
    throw e;
  }

  // ৪) ড্রাফট সংরক্ষণ (অ্যাডমিন রিভিউয়ের জন্য)
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const enough = hasEnoughEvidence(v) && v.content;
  const base = {
    topic,
    sources: v.sources,
    claims: v.claims,
    verificationStatus: v.verdict,
    independentSources: v.independentSources,
    primarySource: v.primarySource,
    uncertainties: v.uncertainties,
    warnings: [...v.conflicts, ...(v.sharedOriginNote ? [v.sharedOriginNote] : [])],
    report: v.report,
    titleOptions: v.titleOptions,
    imagePrompt: v.imagePrompt,
    socialPost: v.socialPost,
    auto: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const doc = enough
    ? {
        ...base,
        title: v.title || topic,
        summary: v.summary,
        content: v.content,
        category: v.category,
        seoTitle: v.seoTitle,
        metaDescription: v.metaDescription,
        keywords: v.keywords,
        slug: makeSlug(v.slug, id),
        reviewStatus: "pending_review",
      }
    : {
        ...base,
        title: topic,
        category: v.category,
        reviewStatus: "review_required",
        reviewNote: reviewReason(v),
      };
  await fb(env, "PUT", `drafts/${id}`, doc);
  await fb(env, "PUT", `reports/${key}`, { draftId: id, at: Date.now() });
  await fb(env, "PUT", "reportState", { date: today, count: used + 1 });
  return { draftId: id, cached: false, verdict: v.verdict, enough: !!enough, titleOptions: v.titleOptions.length };
}

// ---------- CORS: অ্যাডমিন প্যানেল আলাদা ঠিকানায় (GitHub Pages) থাকলে সেখান থেকে API ডাকার অনুমতি ----------
const ALLOWED_ORIGINS = [
  "https://arresearcherarnews.github.io", // অ্যাডমিন প্যানেল
  "https://arnews.info",
];

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function withCors(request, res) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(request))) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

async function handleAI(request, env, url) {
  if (request.method !== "POST") return jsonRes({ error: "POST ব্যবহার করুন" }, 405);
  const admin = await requireAdmin(request, env);
  if (!admin) return jsonRes({ error: "অনুমতি নেই" }, 401);

  const input = await request.json().catch(() => ({}));

  try {
    // হাতে একবার অটো-ড্রাফট চালিয়ে দেখা (টেস্টের জন্য)
    if (url.pathname === "/api/ai/auto-run") return jsonRes(await runAuto(env));

    // টাইটেল থেকে গবেষণা-রিপোর্ট
    if (url.pathname === "/api/ai/report") {
      const topic = String(input.title || input.topic || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (topic.length < 8) return jsonRes({ error: "শিরোনাম বা বিষয়টি একটু বিস্তারিত লিখুন (কমপক্ষে ৮ অক্ষর)" }, 400);
      return jsonRes(await createReport(env, topic, input));
    }

    if (url.pathname === "/api/ai/draft") {
      let source = String(input.text || "").trim();
      if (input.url) source += "\n" + (await textFromUrl(String(input.url).trim()));
      source = source.trim().slice(0, 14000);
      if (source.length < 30) return jsonRes({ error: "তথ্য বা লিংক দিন (অন্তত কয়েক বাক্য)" }, 400);

      const categories =
        Array.isArray(input.categories) && input.categories.length
          ? input.categories.map(String).slice(0, 30)
          : DEFAULT_CATEGORIES;

      const draft = await writeDraft(env, source, categories);
      let check;
      try {
        check = await factCheck(env, draft);
      } catch (e) {
        check = { verdict: "unverified", summary: "সত্যতা যাচাই করা যায়নি, নিজে দেখে নিন।", claims: [], sources: [] };
      }
      return jsonRes({ draft, factCheck: check });
    }

    if (url.pathname === "/api/ai/image") {
      if (!env.AI) return jsonRes({ error: "Workers AI (AI) বাইন্ডিং যোগ করা নেই" }, 500);
      const prompt = String(input.prompt || "").trim().slice(0, 500);
      if (!prompt) return jsonRes({ error: "ছবির বর্ণনা দিন" }, 400);
      const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: prompt + ", editorial illustration, no text, no letters, no real people",
        steps: 4,
      });
      if (!r || !r.image) throw new Error("ছবি তৈরি হয়নি");
      return jsonRes({ image: "data:image/jpeg;base64," + r.image });
    }
  } catch (e) {
    return jsonRes({ error: String((e && e.message) || e) }, 500);
  }
  return jsonRes({ error: "পাওয়া যায়নি" }, 404);
}

export default {
  // ক্রন ট্রিগারে নিজে নিজে চলে (Cloudflare → Settings → Triggers → Cron)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      runAuto(env).catch(async (e) => {
        try {
          await fb(env, "PUT", "autoLog", { at: Date.now(), error: String((e && e.message) || e) });
        } catch (_) { /* লগ লেখা না গেলেও সমস্যা নেই */ }
      })
    );
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    // AI অ্যাডমিন API (লগইন করা অ্যাডমিন ছাড়া কাজ করে না)
    if (url.pathname.startsWith("/api/ai/")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
      return withCors(request, await handleAI(request, env, url));
    }

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

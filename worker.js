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

  // তথ্যসূত্র ও যাচাইয়ের লিংক (এআই-সহায়তার খবরে পোস্টের সাথে সংরক্ষিত sources থেকে)
  const srcList = (Array.isArray(p.sources) ? p.sources : Object.values(p.sources || {}))
    .filter((x) => x && /^https?:\/\//i.test(String(x.url || "")))
    .slice(0, 10);
  const sourcesHtml = srcList.length
    ? `<section class="src-list" style="margin:20px 0 6px;font-size:14px;line-height:1.8"><h2 style="font-size:15px;margin:0 0 6px">তথ্যসূত্র ও যাচাইয়ের লিংক</h2><ul style="margin:0;padding-left:18px">` +
      srcList.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="nofollow noopener noreferrer">${esc(x.title || x.url)}</a></li>`).join("") +
      `</ul></section>`
    : "";

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
    ${sourcesHtml}
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
// AI ড্রাফট সিস্টেম — শুধু অ্যাডমিনের জন্য: অ্যাডমিন শিরোনাম দিলে তবেই কাজ শুরু (অটো-পোস্ট নেই)
// এন্ডপয়েন্ট: /api/ai/report (শিরোনাম → যাচাই → সংবাদ), /api/ai/draft, /api/ai/image (চাইলে), /api/ai/status
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
const WRITE_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];

const listFrom = (v) => String(v).split(",").map((s) => s.trim()).filter(Boolean);

// ---------- ব্যবহার-হিসাব (অ্যাডমিন প্যানেলে দেখানোর জন্য): Firebase `aiStatus` ----------
// এটা শুধু এই Worker-এর নিজের গোনা কল; Google-এর আসল কোটা দেখতে AI Studio → Rate limit পেজ।
const GEMINI_FREE_LIMITS = {
  "gemini-3.1-flash-lite": { rpd: 500, rpm: 15 },
  "gemini-3.5-flash-lite": { rpd: 500, rpm: 15 },
  "gemini-3.8-flash": { rpd: 20, rpm: 5 },
  "gemini-3.6-flash": { rpd: 20, rpm: 5 },
};
let _u = { gemini: {}, workers: { ok: 0, fail: 0, inTok: 0, outTok: 0 } };
function noteGemini(model, status, meta) {
  const m = _u.gemini[model] || (_u.gemini[model] = { ok: 0, e429: 0, e404: 0, eOther: 0, inTok: 0, outTok: 0 });
  if (status === "ok") {
    m.ok += 1;
    m.inTok += Number(meta && meta.promptTokenCount) || 0;
    m.outTok += Number(meta && meta.candidatesTokenCount) || 0;
  } else if (status === 429) m.e429 += 1;
  else if (status === 404) m.e404 += 1;
  else m.eOther += 1;
}

async function flushStatus(env, entry) {
  try {
    const today = dhakaDate();
    let cur = (await fb(env, "GET", "aiStatus")) || {};
    const oldLog = Array.isArray(cur.log) ? cur.log : Object.values(cur.log || {});
    if (cur.date !== today) cur = { date: today, usage: {} };
    const usage = cur.usage || {};
    const g = usage.gemini || {};
    for (const [model, v] of Object.entries(_u.gemini)) {
      const o = g[model] || { ok: 0, e429: 0, e404: 0, eOther: 0, inTok: 0, outTok: 0 };
      for (const k of Object.keys(o)) o[k] = (Number(o[k]) || 0) + (v[k] || 0);
      g[model] = o;
    }
    const w = usage.workers || { ok: 0, fail: 0, inTok: 0, outTok: 0 };
    for (const k of Object.keys(w)) w[k] = (Number(w[k]) || 0) + (_u.workers[k] || 0);
    _u = { gemini: {}, workers: { ok: 0, fail: 0, inTok: 0, outTok: 0 } };
    const log = entry ? [{ at: Date.now(), ...entry }, ...oldLog].slice(0, 30) : oldLog.slice(0, 30);
    await fb(env, "PUT", "aiStatus", { date: today, usage: { gemini: g, workers: w }, log });
  } catch (e) { /* হিসাব লেখা না গেলেও মূল কাজ চলবে */ }
}

class QuotaError extends Error {
  constructor(msg) { super(msg); this.name = "QuotaError"; this.quota = true; }
}

async function callGemini(env, body, signal) {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY সেট করা নেই");
  const models = env.GEMINI_MODEL ? listFrom(env.GEMINI_MODEL) : WRITE_MODELS;
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
    if (res.ok) {
      const j = await res.json();
      noteGemini(model, "ok", j && j.usageMetadata);
      return j;
    }
    noteGemini(model, res.status);
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
    (quota ? "Gemini-র কোটা শেষ" : "কোনো Gemini মডেল পাওয়া যায়নি") +
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

// ---------- AI কল: আগে Gemini (সার্চ ছাড়া), ব্যর্থ হলে Cloudflare Workers AI ----------
// Workers AI চালু করতে: Worker → Settings → Bindings-এ AI (আছে) + Variable AI_MODEL = মডেলের নাম (যেমন @cf/...)
async function aiText(env, prompt, { temperature = 0.3, json = false, signal } = {}) {
  let gErr = null;
  try {
    const d = await callGemini(
      env,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, ...(json ? { responseMimeType: "application/json" } : {}) },
      },
      signal
    );
    const t = geminiText(d);
    if (t) return t;
    gErr = new Error("Gemini খালি উত্তর দিয়েছে");
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) throw e;
    gErr = e;
  }
  if (env.AI && env.AI_MODEL) {
    try {
      const r = await env.AI.run(String(env.AI_MODEL).trim(), {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature,
      });
      _u.workers.ok += 1;
      _u.workers.inTok += Number(r && r.usage && r.usage.prompt_tokens) || 0;
      _u.workers.outTok += Number(r && r.usage && r.usage.completion_tokens) || 0;
      let out = r && (r.response ?? (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) ?? (r.result && r.result.response));
      if (out && typeof out === "object") out = JSON.stringify(out);
      if (out && String(out).trim()) return String(out);
      throw new Error("Workers AI খালি উত্তর দিয়েছে");
    } catch (e2) {
      _u.workers.fail += 1;
      const msg = `Gemini: ${(gErr && gErr.message) || gErr} | Workers AI: ${(e2 && e2.message) || e2}`;
      throw gErr && gErr.quota ? new QuotaError(msg) : new Error(msg);
    }
  }
  throw gErr;
}

async function aiJSON(env, prompt, opts = {}) {
  return parseJSONLoose(await aiText(env, prompt, { json: true, ...opts }));
}

// ---------- সূত্র সংগ্রহ (সার্চ ছাড়া): সংবাদ পেজের লেখা + শিরোনাম ----------
async function pageText(u) {
  try {
    const res = await fetch(u, {
      headers: { "user-agent": "Mozilla/5.0 ARNewsBot" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    let host = "";
    try { host = new URL(res.url).hostname; } catch (e) { /* ignore */ }
    if (/(^|\.)google\.com$/.test(host)) return ""; // গুগল-নিউজের মাঝের পেজ — আসল লেখা নয়
    const html = await res.text();
    const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 40);
    const t = paras.join("\n").slice(0, 3500);
    return t.length >= 300 ? t : "";
  } catch (e) {
    return "";
  }
}

// items: [{name, title, url}] → {headlines (নম্বরসহ), pages, outlets}
async function gatherEvidence(items, maxPages = 4) {
  const all = items.slice(0, 12).map((it, i) => ({ ...it, n: i + 1 }));
  const seen = new Set();
  const uniq = [];
  for (const it of all) {
    const k = it.name || it.url;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(it);
  }
  const pages = (
    await Promise.all(
      uniq.slice(0, maxPages).map(async (it) => ({ ...it, text: await pageText(it.url) }))
    )
  ).filter((p) => p.text);
  return { headlines: all, pages, outlets: uniq.length };
}

function evidenceBlock(ev, extraText = "") {
  const h = ev.headlines.map((s) => `[${s.n}] ${s.name || "?"}: ${s.title}`).join("\n");
  const p = ev.pages.map((s) => `[${s.n}] ${s.name || "সূত্র"} — ${s.title}\n${s.text}`).join("\n\n");
  return (
    `সংবাদমাধ্যমের শিরোনাম (প্রতিটির নম্বর আছে):\n${h || "নেই"}\n\n` +
    `পেজ থেকে পড়া লেখা:\n${p || "পাওয়া যায়নি"}` +
    (extraText ? `\n\nঅ্যাডমিনের দেওয়া তথ্য:\n${extraText}` : "")
  );
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
  const draft = await aiJSON(env, prompt, { temperature: 0.3 });
  if (!categories.includes(draft.category)) draft.category = categories[categories.length - 1];
  return {
    title: String(draft.title || "").trim(),
    category: draft.category,
    body: String(draft.body || "").trim(),
    imagePrompt: String(draft.imagePrompt || "").trim(),
  };
}

// ধাপ ২: খসড়ার দাবিগুলো অ্যাডমিনের দেওয়া সূত্র-তথ্যের সাথে মেলানো (ওয়েব সার্চ নয়)
async function factCheck(env, draft, source) {
  const prompt =
    `তুমি একজন ফ্যাক্ট-চেকার। নিচের খসড়ার প্রতিটি মূল দাবি শুধু "সূত্র-তথ্য" দেখে মিলিয়ে দেখো; নিজের জানা বা অনুমান ব্যবহার করবে না।\n` +
    `শুধু এই JSON দাও (বাংলায়):\n` +
    `{"verdict":"verified|doubtful|unverified","summary":"২-৩ বাক্যে সারকথা","claims":[{"claim":"","status":"verified|doubtful|unverified","note":""}]}\n` +
    `- verified = সূত্র-তথ্যে স্পষ্ট আছে; doubtful = সূত্রের সাথে অমিল; unverified = সূত্রে এর প্রমাণ নেই।\n` +
    `- claims সর্বোচ্চ ৬টি।\n\n` +
    `খসড়া শিরোনাম: ${draft.title}\n\n${draft.body}\n\n---\nসূত্র-তথ্য:\n${String(source || "").slice(0, 9000)}`;
  const result = await aiJSON(env, prompt, { temperature: 0.1 });
  return {
    verdict: ["verified", "doubtful", "unverified"].includes(result.verdict) ? result.verdict : "unverified",
    summary: String(result.summary || ""),
    claims: Array.isArray(result.claims) ? result.claims.slice(0, 6) : [],
    sources: [],
  };
}

// ============================================================
// সাধারণ সহায়ক: তারিখ, হ্যাশ, Firebase (সার্ভিস অ্যাকাউন্ট), RSS পার্সার
// Secret FIREBASE_SA (সার্ভিস অ্যাকাউন্ট JSON) দরকার — ড্রাফট ও ব্যবহার-হিসাব রাখতে
// ============================================================

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
    if (title && link) items.push({ title, link, outlet: pick(b, "source"), time: isNaN(t) ? Date.now() : t });
  }
  return items.sort((a, b) => b.time - a.time).slice(0, 15);
}

const V_STATUS = ["verified", "partially_verified", "unverified", "false_misleading"];
const normStatus = (s) => (V_STATUS.includes(s) ? s : "unverified");
const strArr = (a) => (Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean).slice(0, 8) : []);
const makeSlug = (s, id) =>
  (String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "news") + "-" + id.slice(-5);

// লেখার মতো যথেষ্ট প্রমাণ আছে কি না
const hasEnoughEvidence = (v) =>
  v.enough && (v.verdict === "verified" || v.verdict === "partially_verified") && (v.primarySource || v.independentSources >= 2);

const reviewReason = (v) =>
  v.verdict === "false_misleading"
    ? "সম্ভাব্য ভুল বা বিভ্রান্তিকর খবর — সাবধানে দেখুন"
    : v.conflicts.length
    ? "সূত্রগুলোর মধ্যে পরস্পরবিরোধী তথ্য আছে"
    : "যাচাইয়ের প্রমাণ অপর্যাপ্ত — লেখা তৈরি করা হয়নি";

// ============================================================
// টাইটেল থেকে গবেষণা-রিপোর্ট (/api/ai/report)
// অ্যাডমিন একটি শিরোনাম/বিষয় দেয় (সাথে চাইলে লিংক/তথ্য: input.url, input.text) → Worker গুগল-নিউজে সূত্র খুঁজে AI মাত্র ১ বার ডাকে (সার্চ-টুল ছাড়া):
// তথ্য সংগ্রহ + দাবি যাচাই + রিপোর্ট + আরও ভালো শিরোনামের বিকল্প + সংবাদের খসড়া।
// ফল `drafts`-এ যায় (reviewStatus = pending_review / review_required) — অ্যাডমিন অনুমোদন ছাড়া কিছু প্রকাশ হয় না।
// অযথা Gemini কল এড়াতে:
//   • একই বিষয় ২৪ ঘণ্টার মধ্যে আবার দিলে আগের রিপোর্টই খোলে (নতুন কল নয়; force:true দিলে নতুন)
//   • দৈনিক সীমা REPORT_LIMIT (ডিফল্ট ৩০)
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

async function researchReport(env, topic, categories, preferred, signal, evd, extraText) {
  const prompt =
    `আজকের তারিখ: ${dhakaDate()}। তুমি একজন কঠোর ফ্যাক্ট-চেকার এবং অভিজ্ঞ পেশাদার বাংলা সংবাদ-সম্পাদক।\n` +
    `অ্যাডমিন এই শিরোনাম/বিষয়ে একটি যাচাই-করা সংবাদ চান:\n"${topic}"\n` +
    `শিরোনামটাকে সত্য ধরে নেবে না — শিরোনামের নিজস্ব দাবিও নিচের সূত্র-তথ্যের সাথে মিলিয়ে দেখো।\n\n` +
    `কাজ (একবারেই): সূত্র-তথ্য থেকে মূল দাবিগুলো মিলিয়ে দেখো, তারপর রিপোর্ট ও পেশাদার সংবাদ লেখো। শুধু এই সূত্র-তথ্য ব্যবহার করবে; নিজের জানা বা অনুমান থেকে নির্দিষ্ট কোনো তথ্য যোগ করবে না।\n\n` +
    `${evidenceBlock(evd, extraText)}\n\n` +
    `যাচাইয়ের নিয়ম:\n` +
    `- প্রমাণ ছাড়া কোনো দাবিকে verified বলবে না। নিজের আত্মবিশ্বাস বা স্কোরকে প্রমাণ ধরবে না।\n` +
    `- একই মূল সূত্র/সংবাদ সংস্থা থেকে নেওয়া একাধিক খবরকে একটি উৎস গণনা করো (স্বাধীন নয়)।\n` +
    `- কোনো উৎস বিরোধিতা করলে conflicts-এ লেখো। যা নিশ্চিত নয় তা uncertainties-এ লেখো।\n` +
    `- primarySource সবসময় false। enough: true শুধু তখনই, যখন লেখার মতো যথেষ্ট প্রমাণ আছে।\n` +
    `- claims সর্বোচ্চ ৮টি। supportedBy ও contradictedBy-তে শুধু সূত্রের নম্বর দাও (যেমন [1,3]) — যে নম্বরগুলো উপরের [ ] ভেতরে আছে।\n` +
    `- report.summary ৩-৪ বাক্য; keyFindings ৩-৮টি যাচাই-করা পয়েন্ট; background সংক্ষিপ্ত প্রেক্ষাপট; unclear = যা এখনো স্পষ্ট নয়।\n` +
    `- titleOptions: ৩-৫টি পেশাদার শিরোনাম (প্রতিটি ১২০ অক্ষরের মধ্যে, তথ্যভিত্তিক, ক্লিকবেইট নয়); why-তে এক বাক্যে কেন ভালো। title হবে এদের মধ্যে সেরাটি।\n\n` +
    `সংবাদ লেখার নিয়ম (content — enough সত্য হলে; মিথ্যা হলে content "" রাখো):\n` +
    `- সাধারণ বাংলা অনুচ্ছেদ; মার্কডাউন, তারকাচিহ্ন বা বুলেট নয়; অনুচ্ছেদের মাঝে একটি ফাঁকা লাইন।\n` +
    `- কাঠামো: (১) ভূমিকা, ৩-৪ বাক্য — বড় প্রেক্ষাপট বা পাঠকের চেনা দৃশ্য দিয়ে শুরু করে শেষ বাক্যে মূল খবরে আসো। এই ভূমিকায় শুধু সর্বজনবিদিত সাধারণ প্রেক্ষাপট-বাক্য চলবে; সূত্রে নেই এমন কোনো নির্দিষ্ট সংখ্যা, তারিখ, নাম বা উদ্ধৃতি নয়। (২) তারপর একটি আলাদা লাইনে শুধু: বিস্তারিত (৩) এরপর ৩-৫ অনুচ্ছেদ: ঘটনার বিবরণ, যাচাই-করা গুরুত্বপূর্ণ তথ্য, প্রয়োজনীয় প্রেক্ষাপট ও বিশ্লেষণ — সবই সূত্র-তথ্য থেকে। (৪) শেষ অনুচ্ছেদ \"তথ্যের সীমাবদ্ধতা:\" দিয়ে শুরু — যা এখনো নিশ্চিত নয়।\n` +
    `- ভাষা: প্রমিত, সংযত, পেশাদার; নিরপেক্ষ; ক্লিকবেইট বা আবেগী অতিরঞ্জন নয়। partially_verified তথ্য \"এখনো পুরোপুরি নিশ্চিত নয়\" বলে স্পষ্ট করো।\n` +
    `- কোনো সংবাদমাধ্যমের শিরোনাম, বাক্য বা কাঠামো নকল করবে না; শুধু শব্দ বদলানোও চলবে না। সম্পূর্ণ নিজস্ব ভাষায় লেখো।\n` +
    `- শৈলীর উদাহরণ (শুধু ভাষা ও কাঠামো দেখার জন্য; এর কোনো বাক্য বা তথ্য ব্যবহার করবে না): \"সময়ের সঙ্গে পৃথিবীতে দেখা দিয়েছে নানা ধরনের সংক্রামক রোগ। কোনোটি সীমিত অঞ্চলে প্রাণঘাতী প্রাদুর্ভাব সৃষ্টি করেছে, আবার কোনোটি ছড়িয়ে পড়েছে সারা বিশ্বে। কয়েক বছর আগেই করোনাভাইরাসের মহামারি দেখেছে পৃথিবী, যার প্রভাব পড়েছিল কোটি কোটি মানুষের জীবনে। এবার আলোচনায় ইবোলা ভাইরাস।\"\n\n` +
    `অন্যান্য ফিল্ড:\n` +
    `- category: ${preferred ? `অ্যাডমিন "${preferred}" বেছেছেন, সেটাই দাও` : "এই তালিকা থেকে ঠিক একটি"} (তালিকা: ${categories.join(", ")})\n` +
    `- summary ২০০ অক্ষরের মধ্যে; seoTitle ৬০ অক্ষরের মধ্যে; metaDescription ১৫৫ অক্ষরের মধ্যে; keywords ৫-৮টি; slug ইংরেজি ছোট হাতের অক্ষর ও হাইফেনে।\n` +
    `- imagePrompt ইংরেজিতে, প্রতীকী দৃশ্য; ছবিতে লেখা বা বাস্তব ব্যক্তির মুখ নয়। socialPost ২৬০ অক্ষরের মধ্যে।\n\n` +
    `শুধু এই JSON দাও (বাংলায়; JSON-এর বাইরে কিছু নয়):\n` +
    `{"isOld":false,"verdict":"verified|partially_verified|unverified|false_misleading","enough":false,"primarySource":false,"independentSources":0,` +
    `"claims":[{"claim":"","status":"verified|partially_verified|unverified|false_misleading","evidence":"","supportedBy":[1],"contradictedBy":[]}],` +
    `"conflicts":[""],"uncertainties":[""],"sharedOriginNote":"",` +
    `"report":{"summary":"","keyFindings":[""],"background":"","unclear":[""]},` +
    `"titleOptions":[{"title":"","why":""}],` +
    `"title":"","summary":"","content":"","category":"","seoTitle":"","metaDescription":"","keywords":[""],"slug":"","imagePrompt":"","socialPost":""}`;

  const readN = new Set(evd.pages.map((p) => p.n));
  const byN = {};
  for (const h of evd.headlines) byN[h.n] = h;
  const sources = evd.headlines
    .map((x) => ({ title: `${x.name || ""}: ${x.title}`, url: x.url, read: readN.has(x.n) }))
    .slice(0, 12);

  // সূত্র-নম্বর → নাম ও লিংক (যাচাইয়ের লিংক)
  const refNums = (a) =>
    [...new Set((Array.isArray(a) ? a : []).map((x) => parseInt(String(x).replace(/[^\d]/g, ""), 10)).filter((n) => byN[n]))];
  const refNames = (a) => refNums(a).map((n) => byN[n].name || byN[n].url);
  const refLinks = (a) => refNums(a).map((n) => ({ name: byN[n].name || "", title: byN[n].title, url: byN[n].url }));

  let r;
  try {
    r = await aiJSON(env, prompt, { temperature: 0.25, signal });
  } catch (e) {
    if (e && (e.quota || e.name === "TimeoutError" || e.name === "AbortError")) throw e;
    r = { uncertainties: ["AI-এর উত্তর পড়া যায়নি, আবার চেষ্টা করুন"] };
  }
  const rep = r.report || {};
  return {
    verdict: normStatus(r.verdict),
    enough: r.enough === true && (evd.pages.length >= 2 || String(extraText || "").length >= 400),
    primarySource: false,
    independentSources: Math.min(evd.outlets || 0, Number(r.independentSources) || 0) || (String(extraText || "").length >= 400 ? 1 : 0),
    claims: (Array.isArray(r.claims) ? r.claims : []).slice(0, 8).map((c) => ({
      claim: String(c.claim || ""),
      status: normStatus(c.status),
      evidence: String(c.evidence || ""),
      supportedBy: refNames(c.supportedBy),
      contradictedBy: refNames(c.contradictedBy),
      links: refLinks(c.supportedBy).slice(0, 4),
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
    sources,
  };
}

// বিষয় থেকে ছোট খোঁজ-শব্দ বানিয়ে Google News (বাংলা + ইংরেজি) ও Bing News RSS থেকে সূত্র আনা
const realNewsUrl = (l) => {
  try {
    const u = new URL(l);
    if (/(^|\.)bing\.com$/.test(u.hostname) && u.searchParams.get("url")) return u.searchParams.get("url");
  } catch (e) { /* যেমন আছে */ }
  return l;
};

async function findNews(topic) {
  const clean = String(topic).replace(/[!?।,:;"“”‘’()\[\]|]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter((w) => w.length > 1);
  const latin = (clean.match(/[A-Za-z][A-Za-z0-9.\-]*(?:\s+[A-Za-z0-9.\-]+){0,3}/g) || []).sort((a, b) => b.length - a.length)[0] || "";
  const queries = [...new Set([latin.trim(), words.slice(0, 6).join(" "), words.slice(0, 3).join(" ")].filter((q) => q && q.length >= 4))].slice(0, 3);
  const out = [];
  const seen = new Set();
  for (const q of queries) {
    const e = encodeURIComponent(q);
    const urls = [
      `https://news.google.com/rss/search?q=${e}&hl=bn&gl=BD&ceid=BD:bn`,
      `https://news.google.com/rss/search?q=${e}&hl=en&gl=BD&ceid=BD:en`,
      `https://www.bing.com/news/search?q=${e}&format=rss`,
    ];
    const lists = await Promise.all(
      urls.map(async (u) => {
        try {
          const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 ARNewsBot" }, signal: AbortSignal.timeout(8000) });
          return r.ok ? parseFeed(await r.text()) : [];
        } catch (err) {
          return [];
        }
      })
    );
    for (const it of lists.flat()) {
      const url = realNewsUrl(it.link);
      if (seen.has(url)) continue;
      seen.add(url);
      let name = it.outlet || "";
      if (!name) { try { name = new URL(url).hostname.replace(/^www\./, ""); } catch (err) { /* খালি */ } }
      out.push({ name, title: it.title, url });
    }
    if (out.length >= 8) break;
  }
  return out;
}

async function createReport(env, topic, input) {
  const categories = env.CATEGORIES
    ? String(env.CATEGORIES).split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_CATEGORIES;
  const preferred = String(input.category || "").trim();
  const key = "r" + (await sha1(normTopic(topic)));

  // ১) আগে করা রিপোর্ট থাকলে Gemini ডাকা হয় না
  if (!input.force) {
    const hit = await fb(env, "GET", `reportCache/${key}`);
    if (hit && hit.draftId && Date.now() - Number(hit.at || 0) < 24 * 3600 * 1000) {
      const still = await fb(env, "GET", `drafts/${hit.draftId}/createdAt`);
      if (still) return { draftId: hit.draftId, cached: true };
    }
  }

  // ২) দৈনিক সীমা
  const today = dhakaDate();
  const rs = (await fb(env, "GET", "reportState")) || {};
  const used = rs.date === today ? Number(rs.count || 0) : 0;
  const cap = Number(env.REPORT_LIMIT || 30);
  if (used >= cap) throw new Error(`আজকের রিপোর্টের সীমা (${cap}টি) শেষ — কাল আবার চেষ্টা করুন`);

  // ৩) একবারই Gemini, সর্বোচ্চ REPORT_TIMEOUT_MIN মিনিট
  const mins = Number(env.REPORT_TIMEOUT_MIN || 10);

  // সূত্র: গুগল-নিউজে বিষয়টি খুঁজে পাওয়া সংবাদ + অ্যাডমিনের পেস্ট করা লেখা/লিংক
  let extraText = String(input.text || "").trim().slice(0, 9000);
  if (input.url) {
    try { extraText += "\n" + (await textFromUrl(String(input.url).trim())); } catch (e) { /* লিংক না খুললে বাদ */ }
  }
  extraText = extraText.trim().slice(0, 12000);
  const found = await findNews(topic);
  const evd = await gatherEvidence(found, 4);
  if (evd.headlines.length < 2 && extraText.length < 200) {
    throw new Error(`এই বিষয়ে যথেষ্ট সূত্র পাওয়া যায়নি (খুঁজে পাওয়া: ${evd.headlines.length}টি) — নিউজের লিংক বা তথ্য সাথে দিন`);
  }

  let v;
  try {
    v = await researchReport(env, topic, categories, preferred, AbortSignal.timeout(mins * 60000), evd, extraText);
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
  await fb(env, "PUT", `reportCache/${key}`, { draftId: id, at: Date.now() });
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
    // ব্যবহার ও কার্যকলাপ (অ্যাডমিন প্যানেলের "AI অবস্থা" অংশের জন্য)
    if (url.pathname === "/api/ai/status") {
      const [aiStatus, reportState] = await Promise.all([
        fb(env, "GET", "aiStatus"),
        fb(env, "GET", "reportState"),
      ]);
      const today = dhakaDate();
      const log = aiStatus && aiStatus.log ? (Array.isArray(aiStatus.log) ? aiStatus.log : Object.values(aiStatus.log)) : [];
      return jsonRes({
        today,
        usage: aiStatus && aiStatus.date === today ? aiStatus.usage || {} : {},
        log,
        reportsToday: reportState && reportState.date === today ? Number(reportState.count || 0) : 0,
        reportLimit: Number(env.REPORT_LIMIT || 30),
        limits: { gemini: GEMINI_FREE_LIMITS },
        config: {
          geminiModels: env.GEMINI_MODEL ? listFrom(env.GEMINI_MODEL) : WRITE_MODELS,
          workersAi: !!(env.AI && env.AI_MODEL),
          workersAiModel: env.AI_MODEL || "",
        },
      });
    }

    // টাইটেল থেকে গবেষণা-রিপোর্ট
    if (url.pathname === "/api/ai/report") {
      const topic = String(input.title || input.topic || "").trim().replace(/\s+/g, " ").slice(0, 200);
      if (topic.length < 8) return jsonRes({ error: "শিরোনাম বা বিষয়টি একটু বিস্তারিত লিখুন (কমপক্ষে ৮ অক্ষর)" }, 400);
      const out = await createReport(env, topic, input);
      await flushStatus(env, { kind: "report", ok: true, msg: topic.slice(0, 70) + (out.cached ? " (আগের রিপোর্ট খোলা হয়েছে)" : out.enough ? " — ড্রাফট তৈরি" : " — রিভিউ প্রয়োজন") });
      return jsonRes(out);
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
        check = await factCheck(env, draft, source);
      } catch (e) {
        check = { verdict: "unverified", summary: "সত্যতা যাচাই করা যায়নি, নিজে দেখে নিন।", claims: [], sources: [] };
      }
      await flushStatus(env, { kind: "draft", ok: true, msg: String(draft.title || "").slice(0, 70) });
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
    const em = String((e && e.message) || e);
    if (!url.pathname.endsWith("/status")) {
      await flushStatus(env, { kind: url.pathname.split("/").pop(), ok: false, msg: "ব্যর্থ", error: em.slice(0, 300) });
    }
    return jsonRes({ error: em }, 500);
  }
  return jsonRes({ error: "পাওয়া যায়নি" }, 404);
}

export default {
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

/* AR News — সাইট-জুড়ে একটাই ট্যাগ ফাইল: Google Analytics (GA4) + (ভবিষ্যতের) Google Ads/AdSense।
   সব পেজ <head>-এ এই ফাইল লোড করে। Analytics ID বা বিজ্ঞাপন সেটিং বদলাতে শুধু নিচের CONFIG বদলান — অন্য কোথাও হাত দিতে হবে না। */
(function () {
  "use strict";

  // ============ CONFIG ============
  var GA_ID = "G-QBX3BF84E8";   // Google Analytics 4 Measurement ID

  // Google AdSense চালু করতে (অনুমোদন পাওয়ার পর) এখানে Publisher ID বসান, যেমন "ca-pub-1234567890123456"।
  // খালি থাকলে কোনো বিজ্ঞাপন স্ক্রিপ্ট লোড হয় না এবং পেজে কোনো ফাঁকা জায়গাও দেখা যায় না।
  var ADSENSE_CLIENT = "ca-pub-6572598170837556";

  // নিউজ পেজের বিজ্ঞাপন ইউনিটের Slot ID (AdSense → Ads → By ad unit থেকে)। খালি থাকলে ওই জায়গা লুকানো থাকে।
  var AD_SLOTS = {
    after_article: "",  // লেখার ঠিক নিচে
    bottom: ""          // Related Posts-এর নিচে
  };
  // ================================

  // --- Google Analytics ---
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);

  function addScript(src, attrs) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    for (var k in attrs || {}) s.setAttribute(k, attrs[k]);
    document.head.appendChild(s);
    return s;
  }

  addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID));

  // --- Google AdSense / Google Ads (ভবিষ্যতের জন্য প্রস্তুত) ---
  // feed.html-এর মতো পেজে পোস্ট ওভারলে JS দিয়ে খোলে; সেখান থেকে window.arGoogleAds.refresh() কল করলে নতুন জায়গাগুলোতে বিজ্ঞাপন বসে।
  window.arGoogleAds = { refresh: function () {} };
  if (!ADSENSE_CLIENT) return;

  addScript("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT), {
    crossorigin: "anonymous"
  });

  function fillSlots() {
    var nodes = document.querySelectorAll(".ad-slot[data-slot]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var slot = AD_SLOTS[el.getAttribute("data-slot")];
      if (!slot || el.getAttribute("data-filled")) continue;
      el.setAttribute("data-filled", "1");
      el.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + ADSENSE_CLIENT +
        '" data-ad-slot="' + slot + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      el.classList.add("ad-on");
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  }

  window.arGoogleAds.refresh = fillSlots;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillSlots);
  else fillSlots();
})();

(function () {
  const STYLE_ID = "login-module-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .lg-page{position:fixed;inset:0;z-index:60;background:var(--bg);color:var(--text);overflow-y:auto;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);}
      .lg-page.open{transform:translateX(0);}
      .lg-topbar{position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:16px 18px;}
      .lg-back{border:0;background:var(--surface-soft);color:var(--text);width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:18px;flex-shrink:0;}
      .lg-topbar h2{font-size:18px;}
      .lg-body{max-width:460px;margin:auto;padding:28px 20px 60px;}
      .lg-tabs{display:flex;gap:6px;background:var(--surface-soft);padding:4px;border-radius:12px;margin-bottom:20px;}
      .lg-tab{flex:1;border:0;background:transparent;padding:10px;border-radius:9px;color:var(--muted);cursor:pointer;font-weight:700;font-size:14px;}
      .lg-tab.active{background:var(--brand);color:#fff;}
      .lg-field{margin-bottom:14px;}
      .lg-field label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;}
      .lg-field input{width:100%;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:10px;padding:13px 14px;outline:0;font-size:15px;}
      .lg-field input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(15,118,110,.12);}
      .lg-submit{width:100%;border:0;background:var(--brand);color:#fff;font-weight:800;padding:14px;border-radius:12px;cursor:pointer;margin-top:6px;font-size:15px;}
      .lg-submit:disabled{opacity:.6;cursor:default;}
      .lg-alt{text-align:center;margin-top:16px;font-size:13px;color:var(--muted);}
      .lg-alt button{border:0;background:transparent;color:var(--brand);font-weight:700;cursor:pointer;}
      .lg-error{background:#fee2e2;color:#b42318;font-size:13px;padding:10px 12px;border-radius:9px;margin-bottom:14px;display:none;}
      .lg-error.show{display:block;}
    `;
    document.head.appendChild(style);
  }

  window.__closeActiveSheet = window.__closeActiveSheet || function () {};

  function toast(msg) {
    if (typeof window.notify === "function") window.notify(msg);
  }

  function close(page) {
    page.classList.remove("open");
    setTimeout(() => page.remove(), 260);
    window.__closeActiveSheet = function () {};
    if (typeof window.__setBottomNavActive === "function") window.__setBottomNavActive("feed");
  }

  function open() {
    if (typeof auth !== "undefined" && auth.currentUser) {
      toast("আপনি ইতিমধ্যে লগইন করে আছেন");
      return;
    }
    window.__closeActiveSheet();

    let mode = "signin";
    const page = document.createElement("div");
    page.className = "lg-page";
    page.innerHTML = `
      <div class="lg-topbar">
        <button class="lg-back" id="lg-back" type="button" aria-label="পেছনে যাও">←</button>
        <h2>অ্যাকাউন্টে ঢুকুন</h2>
      </div>
      <div class="lg-body">
        <div class="lg-tabs">
          <button class="lg-tab active" data-mode="signin" type="button">লগইন</button>
          <button class="lg-tab" data-mode="signup" type="button">নতুন অ্যাকাউন্ট</button>
        </div>
        <div class="lg-error" id="lg-error"></div>
        <form id="lg-form">
          <div class="lg-field" id="lg-name-field" style="display:none;">
            <label for="lg-name">নাম</label>
            <input id="lg-name" type="text" autocomplete="name" placeholder="তোমার নাম">
          </div>
          <div class="lg-field">
            <label for="lg-email">ইমেইল</label>
            <input id="lg-email" type="email" autocomplete="email" required placeholder="you@example.com">
          </div>
          <div class="lg-field">
            <label for="lg-pass">পাসওয়ার্ড</label>
            <input id="lg-pass" type="password" autocomplete="current-password" required placeholder="••••••••" minlength="6">
          </div>
          <button class="lg-submit" id="lg-submit" type="submit">লগইন করুন</button>
        </form>
        <div class="lg-alt">
          <span id="lg-alt-text">পাসওয়ার্ড ভুলে গেছো?</span>
          <button type="button" id="lg-alt-btn">রিসেট করো</button>
        </div>
      </div>
    `;
    document.body.appendChild(page);
    requestAnimationFrame(() => page.classList.add("open"));

    const errorEl = page.querySelector("#lg-error");
    const nameField = page.querySelector("#lg-name-field");
    const submitBtn = page.querySelector("#lg-submit");
    const altText = page.querySelector("#lg-alt-text");
    const altBtn = page.querySelector("#lg-alt-btn");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("show");
    }
    function hideError() {
      errorEl.classList.remove("show");
    }

    function setMode(next) {
      mode = next;
      page.querySelectorAll(".lg-tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
      nameField.style.display = mode === "signup" ? "block" : "none";
      submitBtn.textContent = mode === "signup" ? "অ্যাকাউন্ট তৈরি করো" : "লগইন করুন";
      altText.textContent = mode === "signup" ? "আগে থেকেই অ্যাকাউন্ট আছে?" : "পাসওয়ার্ড ভুলে গেছো?";
      altBtn.textContent = mode === "signup" ? "লগইন করো" : "রিসেট করো";
      hideError();
    }

    page.querySelectorAll(".lg-tab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));

    altBtn.addEventListener("click", async () => {
      if (mode === "signup") {
        setMode("signin");
        return;
      }
      const email = page.querySelector("#lg-email").value.trim();
      if (!email) {
        showError("রিসেট লিংক পাঠাতে আগে ইমেইল লিখো।");
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        toast("রিসেট লিংক ইমেইলে পাঠানো হয়েছে");
      } catch (err) {
        showError("রিসেট লিংক পাঠানো যায়নি। ইমেইল ঠিক আছে কিনা দেখো।");
      }
    });

    page.querySelector("#lg-back").addEventListener("click", () => close(page));

    page.querySelector("#lg-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();
      const email = page.querySelector("#lg-email").value.trim();
      const pass = page.querySelector("#lg-pass").value;
      const name = page.querySelector("#lg-name").value.trim();
      submitBtn.disabled = true;
      try {
        if (mode === "signup") {
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          if (name && cred.user) await cred.user.updateProfile({ displayName: name });
          toast("অ্যাকাউন্ট তৈরি হয়েছে, স্বাগতম!");
        } else {
          await auth.signInWithEmailAndPassword(email, pass);
          toast("লগইন সফল হয়েছে");
        }
        close(page);
      } catch (err) {
        const map = {
          "auth/invalid-email": "ইমেইল ঠিক নেই।",
          "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।",
          "auth/wrong-password": "পাসওয়ার্ড ভুল হয়েছে।",
          "auth/email-already-in-use": "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে।",
          "auth/weak-password": "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।",
        };
        showError(map[err.code] || "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করো।");
      } finally {
        submitBtn.disabled = false;
      }
    });

    window.__closeActiveSheet = () => close(page);
  }

  window.openLogin = open;
})();

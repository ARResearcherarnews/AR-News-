/* AR News — Firebase Realtime Database configuration and compatibility helpers */
(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyCzHyMqAOy94aFwdUBPIgamwX1TtFXGSEI",
    authDomain: "ar-news-ai.firebaseapp.com",
    databaseURL: "https://ar-news-ai-default-rtdb.firebaseio.com",
    projectId: "ar-news-ai",
    storageBucket: "ar-news-ai.firebasestorage.app",
    messagingSenderId: "1033140400791",
    appId: "1:1033140400791:web:f111b1a70e8c6c9140efd2",
    measurementId: "G-QBX3BF84E8"
  };

  if (!window.firebase) throw new Error("Firebase SDK পাওয়া যায়নি।");
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  window.auth = firebase.auth();
  window.rtdb = firebase.database();

  const isObject = value => value && typeof value === "object";
  const timestamp = { __rtdbServerTimestamp: true };
  const increment = amount => ({ __rtdbIncrement: Number(amount) || 0 });

  // FIX: previously this dropped `current` when recursing into an object's
  // fields (`resolve(v)` instead of `resolve(v, current?.[k])`), so every
  // FieldValue.increment() resolved against an undefined "current" and
  // effectively *reset* the field to the increment delta instead of adding
  // to the existing value. Passing current[k] down fixes accumulation.
  const resolve = (value, current) => {
    if (value && value.__rtdbServerTimestamp) return firebase.database.ServerValue.TIMESTAMP;
    if (value && value.__rtdbIncrement !== undefined) return (Number(current) || 0) + value.__rtdbIncrement;
    if (Array.isArray(value)) return value.map(item => resolve(item));
    if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, isObject(current) ? current[k] : undefined)]));
    return value;
  };

  class DocSnapshot {
    constructor(ref, value) { this.ref = ref; this.id = ref.key; this._value = value; this.exists = value !== null && value !== undefined; }
    data() { return this.exists ? this._value : undefined; }
  }

  class DocRef {
    constructor(path) { this.path = path.replace(/^\/+|\/+$/g, ""); this.key = this.path.split("/").pop(); }
    get() { return this._ref().once("value").then(s => new DocSnapshot(this, s.val())); }
    _ref() { return window.rtdb.ref(this.path); }
    async set(data) { await this._ref().set(resolve(data)); }
    async update(data) {
      const current = (await this._ref().once("value")).val() || {};
      await this._ref().update(resolve(data, current));
    }
    async delete() { await this._ref().remove(); }
    collection(name) { return new CollectionRef(`${this.path}/${name}`); }
  }

  class Query {
    constructor(path, filters = [], order = null, max = null) { this.path = path; this.filters = filters; this.order = order; this.max = max; }
    where(field, operator, value) { return new Query(this.path, [...this.filters, { field, operator, value }], this.order, this.max); }
    orderBy(field, direction = "asc") { return new Query(this.path, this.filters, { field, direction }, this.max); }
    limit(max) { return new Query(this.path, this.filters, this.order, max); }
    async get() {
      const snap = await window.rtdb.ref(this.path).once("value");
      let rows = Object.entries(snap.val() || {}).map(([id, value]) => ({ id, value: value || {} }));
      rows = rows.filter(row => this.filters.every(f => f.operator === "==" ? row.value[f.field] === f.value : true));
      if (this.order) rows.sort((a, b) => { const av = a.value[this.order.field] || 0, bv = b.value[this.order.field] || 0; return (av > bv ? 1 : av < bv ? -1 : 0) * (this.order.direction === "desc" ? -1 : 1); });
      if (this.max) rows = rows.slice(0, this.max);
      const docs = rows.map(row => new DocSnapshot(new DocRef(`${this.path}/${row.id}`), row.value));
      return { docs, empty: docs.length === 0, size: docs.length, forEach(fn) { docs.forEach(fn); } };
    }
  }

  class CollectionRef extends Query {
    constructor(path, filters = [], order = null, max = null) { super(path, filters, order, max); this.path = path; }
    doc(id) { return new DocRef(`${this.path}/${id}`); }
    add(data) { const ref = window.rtdb.ref(this.path).push(); return ref.set(resolve(data)).then(() => new DocRef(ref.path.toString())); }
  }

  window.db = { collection: path => new CollectionRef(path), collectionGroup: name => new CollectionGroupQuery(name) };

  class CollectionGroupQuery extends Query {
    constructor(name, filters = [], order = null, max = null) { super(name, filters, order, max); this.name = name; }
    where(field, operator, value) { return new CollectionGroupQuery(this.name, [...this.filters, { field, operator, value }], this.order, this.max); }
    orderBy(field, direction = "asc") { return new CollectionGroupQuery(this.name, this.filters, { field, direction }, this.max); }
    limit(max) { return new CollectionGroupQuery(this.name, this.filters, this.order, max); }
    async get() {
      const snap = await window.rtdb.ref("posts").once("value"), docs = [];
      Object.entries(snap.val() || {}).forEach(([postId, post]) => Object.entries(post?.[this.name] || {}).forEach(([commentId, value]) => {
        if (this.filters.every(f => f.operator === "==" ? value?.[f.field] === f.value : true)) docs.push(new DocSnapshot(new DocRef(`posts/${postId}/${this.name}/${commentId}`), value));
      }));
      docs.sort((a, b) => { const av = a.data()?.[this.order?.field] || 0, bv = b.data()?.[this.order?.field] || 0; return (av > bv ? 1 : av < bv ? -1 : 0) * (this.order?.direction === "desc" ? -1 : 1); });
      const limited = this.max ? docs.slice(0, this.max) : docs;
      return { docs: limited, empty: !limited.length, size: limited.length, forEach(fn) { limited.forEach(fn); } };
    }
  }

  // Keeps the existing page calls working while all data is stored in RTDB.
  firebase.firestore = firebase.firestore || {};
  firebase.firestore.FieldValue = { serverTimestamp: () => timestamp, increment };


  window.formatDate = function (value) { const d = value?.toDate ? value.toDate() : new Date(value || 0); return Number.isNaN(d.getTime()) ? "তারিখ অনুপলব্ধ" : new Intl.DateTimeFormat("bn-BD", { year: "numeric", month: "short", day: "numeric" }).format(d); };
  window.isAdmin = async function (user) { if (!user) return false; try { const claims = (await user.getIdTokenResult()).claims || {}; if (claims.admin === true || claims.role === "admin") return true; } catch (_) {} try { const snap = await window.db.collection("users").doc(user.uid).get(); return snap.exists && snap.data().role === "admin"; } catch (_) { return false; } };
  window.guardAdminPage = function (onAuthorized) { window.auth.onAuthStateChanged(async user => { if (!user) return location.replace("AdminLogin.html"); if (!(await window.isAdmin(user))) { await window.auth.signOut(); return location.replace("AdminLogin.html"); } onAuthorized?.(user); }); };
  if (typeof firebase.analytics === "function") { try { window.analytics = firebase.analytics(); } catch (_) {} }
})();

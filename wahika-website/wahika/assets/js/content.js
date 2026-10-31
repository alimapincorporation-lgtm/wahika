/* Wahika — content defaults + data layer (shared by the public site and the admin portal) */
(function () {
  var script = document.currentScript;
  var BASE = script ? script.src.replace(/assets\/js\/content\.js.*$/, '') : '';
  var MODE_FLAG = 'wahika-mode';

  var DEFAULTS = {
    business: {
      name: 'Wahika Café & Lounge',
      tagline: 'Good food, great company, and a welcoming atmosphere in Masindi.',
      address: 'Baitwa Road, near Masindi High Court, Masindi, Uganda',
      shortAddress: 'Baitwa Road, Masindi',
      hours: 'Daily, 8:00 AM – 11:00 PM',
      hoursShort: '8:00 AM – 11:00 PM',
      atmosphere: 'Casual dining and relaxed lounge',
      phone: '',
      whatsapp: '+256774646178',
      whatsappMessage: 'Hello Wahika, I would like to ask about ',
      email: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      mapsUrl: ''
    },
    media: {
      hero: 'images/grilled-chicken-wrap.jpg',
      about: 'images/pancakes.jpg',
      experience: 'images/chocolate-cake.jpg',
      promo: 'images/pizza.jpg'
    },
    text: {},
    hidden: {},
    categories: [
      { id: 'pizzas', name: 'Pizzas', description: 'A selection of freshly prepared pizzas.', image: 'images/pizza.jpg', home: true },
      { id: 'chicken-grills', name: 'Chicken & Grills', description: 'Enjoy a variety of chicken dishes and grilled favourites.', image: 'images/grilled-chicken-wrap.jpg', home: true },
      { id: 'breakfast-snacks', name: 'Breakfast & Snacks', description: 'Light bites and breakfast options for different moments.', image: 'images/pancakes.jpg', home: true },
      { id: 'soups-beverages', name: 'Soups & Beverages', description: 'Refreshing drinks and comforting soup selections.', image: 'images/papaya-juice.jpg', home: true },
      { id: 'desserts', name: 'Desserts & Sweet Treats', description: 'Cakes and sweet treats to finish on a high.', image: 'images/chocolate-cake.jpg', home: false }
    ],
    items: [
      { id: 'pepperoni-pizza', category: 'pizzas', name: 'Pepperoni Pizza', description: 'Pepperoni, cherry tomatoes, olives and fresh basil on a golden crust.', price: '', image: 'images/pizza.jpg', available: true, popular: true },
      { id: 'grilled-chicken-wrap', category: 'chicken-grills', name: 'Grilled Chicken Wrap', description: 'Grilled chicken with crisp lettuce, tomato and red onion in a toasted wrap with a creamy sauce.', price: '', image: 'images/grilled-chicken-wrap.jpg', available: true, popular: true },
      { id: 'chicken-yogurt-wrap', category: 'chicken-grills', name: 'Chicken Wrap with Yogurt Sauce', description: 'Roasted chicken strips with cucumber, tomato, lettuce and a cool herb sauce.', price: '', image: 'images/chicken-salad-wrap.jpg', available: true, popular: false },
      { id: 'bacon-cheeseburger', category: 'chicken-grills', name: 'Bacon Cheeseburger', description: 'A juicy beef burger with melted cheese, bacon, lettuce, tomato and sauce in a toasted bun.', price: '', image: 'images/burger.jpg', available: true, popular: false },
      { id: 'banana-strawberry-pancakes', category: 'breakfast-snacks', name: 'Banana & Strawberry Pancakes', description: 'A stack of fluffy pancakes with strawberries, banana and chocolate sauce.', price: '', image: 'images/pancakes.jpg', available: true, popular: true },
      { id: 'golden-muffins', category: 'breakfast-snacks', name: 'Golden Muffins', description: 'Freshly baked muffins with a soft, golden crumb.', price: '', image: 'images/muffins.jpg', available: true, popular: false },
      { id: 'sugar-donuts', category: 'breakfast-snacks', name: 'Sugar Donuts', description: 'Soft donuts finished with a dusting of sugar.', price: '', image: 'images/sugar-donuts.jpg', available: true, popular: false },
      { id: 'soft-bread-rolls', category: 'breakfast-snacks', name: 'Soft Bread Rolls', description: 'Warm, soft golden bread rolls.', price: '', image: 'images/bread-rolls.jpg', available: true, popular: false },
      { id: 'fresh-papaya-juice', category: 'soups-beverages', name: 'Fresh Papaya Juice', description: 'Smooth, refreshing papaya juice.', price: '', image: 'images/papaya-juice.jpg', available: true, popular: false },
      { id: 'fresh-pineapple-juice', category: 'soups-beverages', name: 'Fresh Pineapple Juice', description: 'Bright, sweet pineapple juice.', price: '', image: 'images/pineapple-juice.jpg', available: true, popular: false },
      { id: 'beetroot-juice', category: 'soups-beverages', name: 'Beetroot Juice', description: 'Deep red, earthy beetroot juice.', price: '', image: 'images/beetroot-juice.jpg', available: true, popular: false },
      { id: 'lemon-mint-cooler', category: 'soups-beverages', name: 'Lemon & Mint Cooler', description: 'An iced, zesty cooler with lemon and fresh mint.', price: '', image: 'images/lemon-mint-cooler.jpg', available: true, popular: false },
      { id: 'chocolate-layer-cake', category: 'desserts', name: 'Chocolate Layer Cake', description: 'Rich layered chocolate cake with chocolate drizzle and fresh raspberries.', price: '', image: 'images/chocolate-cake.jpg', available: true, popular: true },
      { id: 'chocolate-dessert-cups', category: 'desserts', name: 'Chocolate Dessert Cups', description: 'Layered chocolate and cream dessert cups with a chocolate crunch topping.', price: '', image: 'images/chocolate-dessert-cups.jpg', available: true, popular: false }
    ],
    today: { date: '', ids: [] },
    gallery: [
      { id: 'g1', src: 'images/pizza.jpg', caption: 'Pepperoni Pizza', category: 'Food' },
      { id: 'g2', src: 'images/grilled-chicken-wrap.jpg', caption: 'Grilled Chicken Wrap', category: 'Food' },
      { id: 'g3', src: 'images/chocolate-cake.jpg', caption: 'Chocolate Layer Cake', category: 'Bakes & Desserts' },
      { id: 'g4', src: 'images/papaya-juice.jpg', caption: 'Fresh Papaya Juice', category: 'Drinks' },
      { id: 'g5', src: 'images/burger.jpg', caption: 'Bacon Cheeseburger', category: 'Food' },
      { id: 'g6', src: 'images/pancakes.jpg', caption: 'Banana & Strawberry Pancakes', category: 'Food' },
      { id: 'g7', src: 'images/lemon-mint-cooler.jpg', caption: 'Lemon & Mint Cooler', category: 'Drinks' },
      { id: 'g8', src: 'images/sugar-donuts.jpg', caption: 'Sugar Donuts', category: 'Bakes & Desserts' },
      { id: 'g9', src: 'images/chicken-salad-wrap.jpg', caption: 'Chicken Wrap with Yogurt Sauce', category: 'Food' },
      { id: 'g10', src: 'images/chocolate-dessert-cups.jpg', caption: 'Chocolate Dessert Cups', category: 'Bakes & Desserts' },
      { id: 'g11', src: 'images/pineapple-juice.jpg', caption: 'Fresh Pineapple Juice', category: 'Drinks' },
      { id: 'g12', src: 'images/muffins.jpg', caption: 'Golden Muffins', category: 'Bakes & Desserts' },
      { id: 'g13', src: 'images/beetroot-juice.jpg', caption: 'Beetroot Juice', category: 'Drinks' },
      { id: 'g14', src: 'images/bread-rolls.jpg', caption: 'Soft Bread Rolls', category: 'Bakes & Desserts' }
    ],
    events: []
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, over) {
    var out = clone(base);
    if (!over || typeof over !== 'object') return out;
    ['business', 'media', 'text', 'hidden'].forEach(function (k) {
      if (over[k] && typeof over[k] === 'object') out[k] = Object.assign({}, out[k], over[k]);
    });
    ['categories', 'items', 'gallery', 'events'].forEach(function (k) {
      if (Array.isArray(over[k])) out[k] = over[k];
    });
    if (over.today && typeof over.today === 'object') out.today = over.today;
    return out;
  }

  /* ---- IndexedDB (used only by the admin's "local mode") ---- */
  function idb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      var r = indexedDB.open('wahika-cms', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(key) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction('kv').objectStore('kv').get(key);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(key, val) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(val, key);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbDel(key) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(key);
        tx.oncomplete = function () { res(true); };
      });
    }).catch(function () { return false; });
  }

  /* ---- Loading ---- */
  var cache = null;
  function fetchPublished() {
    return fetch(BASE + 'data/content.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
  }
  function load(force) {
    if (cache && !force) return cache;
    cache = fetchPublished().then(function (pub) {
      var data = merge(DEFAULTS, pub);
      var local = null;
      try { local = localStorage.getItem(MODE_FLAG) === 'local'; } catch (e) {}
      if (!local) return data;
      return idbGet('content').then(function (c) { return c ? merge(data, c) : data; });
    });
    return cache;
  }

  /* ---- Helpers ---- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(p) {
    if (!p) return '';
    return /^(data:|blob:|https?:|\/)/.test(p) ? p : BASE + p;
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function waUrl(d) {
    var b = d.business, n = digits(b.whatsapp);
    if (!n) return '';
    return 'https://wa.me/' + n + (b.whatsappMessage ? '?text=' + encodeURIComponent(b.whatsappMessage) : '');
  }
  function mapsUrl(d) {
    var b = d.business;
    return b.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.name + ' ' + b.address);
  }
  function todayStr() {
    var n = new Date(), m = n.getMonth() + 1, day = n.getDate();
    return n.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(s + 'T00:00:00');
    return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  window.Wahika = {
    BASE: BASE, MODE_FLAG: MODE_FLAG, DEFAULTS: DEFAULTS,
    clone: clone, merge: merge, load: load, esc: esc, url: url, digits: digits,
    waUrl: waUrl, mapsUrl: mapsUrl, todayStr: todayStr, fmtDate: fmtDate,
    idb: { get: idbGet, set: idbSet, del: idbDel }
  };
})();

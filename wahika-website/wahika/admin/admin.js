/* Wahika admin portal.
   Server mode  : PHP backend found at /api  -> edits publish to everyone, uploads go to /images/uploads.
   Local mode   : no backend (e.g. plain static hosting) -> edits are kept in this browser only; use Export. */
(function () {
  'use strict';
  var W = window.Wahika, REG = window.WAHIKA_REGISTRY, esc = W.esc;
  var LOCAL_USER = 'Wahika', LOCAL_HASH = '6554b72cc863bb216d42ccb35545fcd53ec4d13815475ca24f84d228dea19bf8';
  var state = { mode: 'local', csrf: '', data: null, view: 'dashboard', menuTab: 'items', page: 'home' };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function api(a) { return W.BASE + 'api/index.php?action=' + a; }
  function slug(s) { return String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'; }
  function uid(list, base) { var id = slug(base), n = 1, t = id; while (list.some(function (x) { return x.id === t; })) t = id + '-' + (++n); return t; }

  /* ---------- SHA-256 (local-mode login only) ---------- */
  function sha256(s) {
    s = unescape(encodeURIComponent(s));
    var mp = Math.pow, mw = mp(2, 32), i, j, result = '', words = [], bl = s.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], pc = k.length, comp = {};
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    for (var c = 2; pc < 64; c++) {
      if (!comp[c]) { for (i = 0; i < 313; i += c) comp[i] = c; hash[pc] = (mp(c, .5) * mw) | 0; k[pc++] = (mp(c, 1 / 3) * mw) | 0; }
    }
    s += '\x80'; while (s.length % 64 - 56) s += '\x00';
    for (i = 0; i < s.length; i++) { j = s.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = ((bl / mw) | 0); words[words.length] = bl;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash; hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }
  function localHash(u, p) { return sha256('wahika-v1|' + u + '|' + p); }
  function currentLocalHash() { try { return localStorage.getItem('wahika-local-hash') || LOCAL_HASH; } catch (e) { return LOCAL_HASH; } }

  /* ---------- UI helpers ---------- */
  var toastTimer;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'toast'; }, 3800);
  }
  function icon(n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }

  /* ---------- Backend ---------- */
  function handle(r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (r.status === 401) { showGate(); throw new Error('Your session expired. Please sign in again.'); }
      if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
      return j;
    });
  }
  function post(action, body) {
    return fetch(api(action), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf }, body: JSON.stringify(body || {}) }).then(handle);
  }
  function commit(msg) {
    if (state.mode === 'server') {
      return post('save', state.data).then(function () { toast(msg || 'Saved. The website is updated.'); return true; })
        .catch(function (e) { toast(e.message, true); return false; });
    }
    return W.idb.set('content', state.data).then(function () { toast(msg || 'Saved in this browser.'); return true; })
      .catch(function (e) { toast('Could not save: ' + e.message, true); return false; });
  }
  function uploadImage(blob) {
    if (state.mode === 'server') {
      var fd = new FormData(); fd.append('file', blob, 'photo.jpg');
      return fetch(api('upload'), { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': state.csrf }, body: fd }).then(handle).then(function (j) { return j.path; });
    }
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  function resize(file, max) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Could not process the image')); }, 'image/jpeg', .85);
      };
      img.onerror = function () { rej(new Error('That file is not a readable image')); };
      img.src = url;
    });
  }
  function loadData() {
    try { if (state.mode === 'server') localStorage.removeItem(W.MODE_FLAG); else localStorage.setItem(W.MODE_FLAG, 'local'); } catch (e) {}
    return W.load(true).then(function (d) { state.data = d; });
  }

  /* ---------- Drag & drop image field ---------- */
  function dzPrev(v) { return v ? '<img alt="" src="' + esc(W.url(v)) + '">' : icon('image'); }
  function dzHTML(name, val, label) {
    return '<div class="dz" data-dz="' + esc(name) + '" tabindex="0" role="button" aria-label="Upload a photo: drag and drop or press Enter to choose a file">' +
      '<input type="hidden" name="' + esc(name) + '" value="' + esc(val || '') + '"><div class="dz-prev">' + dzPrev(val) + '</div>' +
      '<div class="dz-body"><strong>' + esc(label || 'Drag & drop a photo here') + '</strong><span>or click to choose a file</span><em class="dz-status"></em></div>' +
      '<button type="button" class="btn btn-secondary btn-sm dz-clear"' + (val ? '' : ' hidden') + '>Remove</button><input type="file" class="dz-file" accept="image/*" hidden></div>';
  }
  function bindDz(scope, onChange) {
    $$('.dz', scope).forEach(function (dz) {
      var file = $('.dz-file', dz), hid = $('input[type=hidden]', dz), st = $('.dz-status', dz), clr = $('.dz-clear', dz);
      function set(v) { hid.value = v; $('.dz-prev', dz).innerHTML = dzPrev(v); clr.hidden = !v; if (onChange) onChange(dz.getAttribute('data-dz'), v); }
      function run(f) {
        if (!f || !/^image\//.test(f.type)) { toast('Please drop an image file (JPG, PNG or WebP).', true); return; }
        dz.classList.add('busy'); st.textContent = 'Uploading…';
        resize(f, 1600).then(uploadImage).then(set).catch(function (e) { toast(e.message, true); }).then(function () { dz.classList.remove('busy'); st.textContent = ''; });
      }
      dz.addEventListener('click', function (e) { if (e.target.closest('.dz-clear')) return; file.click(); });
      dz.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === dz) { e.preventDefault(); file.click(); } });
      file.addEventListener('change', function () { run(file.files[0]); file.value = ''; });
      clr.addEventListener('click', function (e) { e.stopPropagation(); set(''); });
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
      dz.addEventListener('drop', function (e) { run(e.dataTransfer.files[0]); });
    });
  }

  /* ---------- Generic form + modal ---------- */
  function fieldHTML(f, v) {
    var id = 'f-' + f.name, lab = '<label for="' + id + '">' + esc(f.label) + (f.req ? ' *' : '') + '</label>', hint = f.hint ? '<small>' + esc(f.hint) + '</small>' : '';
    if (f.type === 'image') return '<div class="field"><label>' + esc(f.label) + (f.req ? ' *' : '') + '</label>' + dzHTML(f.name, v) + hint + '</div>';
    if (f.type === 'check') return '<div class="field check"><label><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>' + hint + '</div>';
    if (f.type === 'textarea') return '<div class="field">' + lab + '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '">' + esc(v || '') + '</textarea>' + hint + '</div>';
    if (f.type === 'select') return '<div class="field">' + lab + '<select id="' + id + '" name="' + f.name + '">' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + hint + '</div>';
    var dl = f.list ? '<datalist id="dl-' + f.name + '">' + f.list.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>' : '';
    return '<div class="field">' + lab + '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v || '') + '" placeholder="' + esc(f.ph || '') + '"' + (f.list ? ' list="dl-' + f.name + '"' : '') + (f.req ? ' required' : '') + '>' + dl + hint + '</div>';
  }
  function readForm(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.elements[f.name]; if (!el) return;
      out[f.name] = f.type === 'check' ? el.checked : String(el.value).trim();
    });
    return out;
  }
  function modal(title, fields, values, onSave) {
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<form class="modal-card" novalidate><div class="modal-head"><h2>' + esc(title) + '</h2><button class="icon-btn" type="button" data-close aria-label="Close">' + icon('close') + '</button></div><div class="modal-body">' +
      fields.map(function (f) { return fieldHTML(f, values[f.name]); }).join('') +
      '</div><div class="modal-foot"><button class="btn btn-secondary" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div></form>';
    document.body.appendChild(m); document.body.style.overflow = 'hidden';
    function close() { m.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc2); }
    function esc2(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc2);
    bindDz(m);
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) close(); });
    $('form', m).addEventListener('submit', function (e) {
      e.preventDefault();
      var v = readForm(this, fields);
      for (var i = 0; i < fields.length; i++) { var f = fields[i]; if (f.req && !v[f.name]) { toast('Please fill in: ' + f.label, true); var el = this.elements[f.name]; if (el && el.focus) el.focus(); return; } }
      if (onSave(v) !== false) close();
    });
    var first = $('input:not([type=hidden]):not([type=file]),textarea', m); if (first) first.focus();
  }

  /* ---------- List editor ---------- */
  function listHTML(key, cfg) {
    var arr = state.data[key];
    var html = '<div class="view-head"><div><h1>' + esc(cfg.title) + '</h1><p>' + esc(cfg.help) + '</p></div><button class="btn btn-primary" data-add="' + key + '">+ Add ' + esc(cfg.singular) + '</button></div>';
    if (!arr.length) return html + '<div class="empty"><strong>Nothing here yet</strong>Use the button above to add the first ' + esc(cfg.singular.toLowerCase()) + '.</div>';
    return html + '<div class="rows">' + arr.map(function (it, i) {
      var r = cfg.row(it);
      return '<div class="row" data-key="' + key + '" data-i="' + i + '"><div class="thumb">' + (r.img ? '<img alt="" src="' + esc(W.url(r.img)) + '">' : icon('image')) + '</div>' +
        '<div class="meta"><strong>' + esc(r.title) + '</strong><span>' + esc(r.sub || '') + '</span></div><div class="acts">' +
        '<button class="btn btn-secondary btn-sm" data-act="up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="btn btn-secondary btn-sm" data-act="down" aria-label="Move down"' + (i === arr.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button class="btn btn-secondary btn-sm" data-act="edit">Edit</button><button class="btn btn-danger btn-sm" data-act="del">Delete</button></div></div>';
    }).join('') + '</div>';
  }
  function bindList(key, cfg, rerender) {
    var main = $('#main');
    $$('[data-add="' + key + '"]', main).forEach(function (b) {
      b.addEventListener('click', function () {
        modal('Add ' + cfg.singular, cfg.fields(), cfg.blank ? cfg.blank() : {}, function (v) {
          var it = cfg.build(v, null); state.data[key].push(it); commit().then(rerender); return true;
        });
      });
    });
    $$('.row[data-key="' + key + '"]', main).forEach(function (row) {
      row.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        var i = +row.getAttribute('data-i'), arr = state.data[key], act = b.getAttribute('data-act');
        if (act === 'up' || act === 'down') {
          var j = act === 'up' ? i - 1 : i + 1; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; commit('Order saved.').then(rerender);
        } else if (act === 'edit') {
          modal('Edit ' + cfg.singular, cfg.fields(), arr[i], function (v) { arr[i] = cfg.build(v, arr[i]); commit().then(rerender); return true; });
        } else if (act === 'del') {
          var why = cfg.canDelete ? cfg.canDelete(arr[i]) : '';
          if (why) { toast(why, true); return; }
          if (confirm('Delete "' + cfg.row(arr[i]).title + '"? This cannot be undone.')) { arr.splice(i, 1); if (cfg.after) cfg.after(); commit().then(rerender); }
        }
      });
    });
  }

  function catOptions() { return state.data.categories.map(function (c) { return [c.id, c.name]; }); }
  var CFG = {
    categories: {
      title: 'Menu categories', singular: 'Category', help: 'Groups on the menu page. Tick "show on home page" to feature a category on the home page.',
      row: function (c) { return { title: c.name, sub: (state.data.items.filter(function (i) { return i.category === c.id; }).length) + ' items' + (c.home ? ' · on home page' : ''), img: c.image }; },
      fields: function () { return [{ name: 'name', label: 'Name', req: true }, { name: 'description', label: 'Short description', type: 'textarea' }, { name: 'image', label: 'Cover photo', type: 'image' }, { name: 'home', label: 'Show on the home page', type: 'check' }]; },
      blank: function () { return { home: true }; },
      build: function (v, old) { return { id: old ? old.id : uid(state.data.categories, v.name), name: v.name, description: v.description, image: v.image, home: v.home }; },
      canDelete: function (c) { var n = state.data.items.filter(function (i) { return i.category === c.id; }).length; return n ? 'Move or delete this category\'s ' + n + ' item(s) first.' : ''; }
    },
    items: {
      title: 'Menu items', singular: 'Item', help: 'Dishes and drinks. Prices are optional: leave blank to hide the price.',
      row: function (i) { var c = state.data.categories.filter(function (x) { return x.id === i.category; })[0]; return { title: i.name, sub: (c ? c.name : 'No category') + (i.price ? ' · ' + i.price : '') + (i.available === false ? ' · hidden from menu' : ''), img: i.image }; },
      fields: function () { return [{ name: 'name', label: 'Name', req: true }, { name: 'category', label: 'Category', type: 'select', options: catOptions() }, { name: 'price', label: 'Price (optional)', ph: 'e.g. UGX 25,000' }, { name: 'description', label: 'Description', type: 'textarea' }, { name: 'image', label: 'Photo', type: 'image' }, { name: 'available', label: 'Show on the menu', type: 'check' }, { name: 'popular', label: 'Mark as popular', type: 'check' }]; },
      blank: function () { return { available: true, category: (state.data.categories[0] || {}).id }; },
      build: function (v, old) { return { id: old ? old.id : uid(state.data.items, v.name), category: v.category, name: v.name, description: v.description, price: v.price, image: v.image, available: v.available, popular: v.popular }; },
      after: function () { state.data.today.ids = state.data.today.ids.filter(function (id) { return state.data.items.some(function (i) { return i.id === id; }); }); }
    },
    gallery: {
      title: 'Gallery', singular: 'Photo', help: 'Photos shown on the gallery page.',
      row: function (g) { return { title: g.caption || 'Untitled photo', sub: g.category, img: g.src }; },
      fields: function () { return [{ name: 'src', label: 'Photo', type: 'image', req: true }, { name: 'caption', label: 'Caption' }, { name: 'category', label: 'Category', ph: 'Food', list: galleryCats() }]; },
      blank: function () { return { category: 'Food' }; },
      build: function (v, old) { return { id: old ? old.id : uid(state.data.gallery, v.caption || 'photo'), src: v.src, caption: v.caption, category: v.category || 'Food' }; }
    },
    events: {
      title: 'Events & offers', singular: 'Event or offer', help: 'Promotions and upcoming events. Unpublished items stay hidden from visitors.',
      row: function (e) { return { title: e.title, sub: (e.type || 'Event') + (e.date ? ' · ' + W.fmtDate(e.date) : '') + (e.published === false ? ' · draft' : ''), img: e.image }; },
      fields: function () { return [{ name: 'title', label: 'Title', req: true }, { name: 'type', label: 'Type', type: 'select', options: [['Event', 'Event'], ['Offer', 'Offer']] }, { name: 'date', label: 'Date (optional)', type: 'date' }, { name: 'description', label: 'Details', type: 'textarea', rows: 4 }, { name: 'image', label: 'Photo', type: 'image' }, { name: 'published', label: 'Published (visible on the website)', type: 'check' }]; },
      blank: function () { return { type: 'Offer', published: true }; },
      build: function (v, old) { return { id: old ? old.id : uid(state.data.events, v.title), title: v.title, type: v.type, date: v.date, description: v.description, image: v.image, published: v.published }; }
    }
  };
  function galleryCats() {
    var s = ['Food', 'Drinks', 'Bakes & Desserts', 'Interior', 'Events', 'Customers'];
    state.data.gallery.forEach(function (g) { if (g.category && s.indexOf(g.category) < 0) s.push(g.category); }); return s;
  }

  /* ---------- Views ---------- */
  var V = {};
  var NAV = [['dashboard', 'Dashboard'], ['today', 'Today\'s menu'], ['menu', 'Menu'], ['gallery', 'Gallery'], ['events', 'Events & offers'], ['pages', 'Page content'], ['images', 'Site photos'], ['business', 'Contact & business'], ['settings', 'Settings']];

  V.dashboard = function (m) {
    var d = state.data, tdy = W.todayStr(), fresh = d.today.date === tdy;
    var banner = state.mode === 'server'
      ? '<div class="notice ok"><strong>Live mode.</strong> Every save publishes straight to the website for all visitors.</div>'
      : '<div class="notice warn"><strong>Browser-only mode.</strong> No PHP backend was found, so changes are saved in this browser only and visitors will not see them. To publish for everyone, upload the <code>api</code> folder to a PHP host, or use <em>Settings → Export content.json</em> and upload that file to the <code>data</code> folder.</div>';
    m.innerHTML = '<div class="view-head"><div><h1>Dashboard</h1><p>Welcome back. Everything on the website can be edited from here.</p></div><a class="btn btn-secondary" href="../index.html" target="_blank" rel="noopener">View website</a></div>' + banner +
      '<div class="stats"><div class="card static stat"><b>' + d.items.length + '</b><span>Menu items</span></div><div class="card static stat"><b>' + d.gallery.length + '</b><span>Gallery photos</span></div><div class="card static stat"><b>' + d.events.filter(function (e) { return e.published !== false; }).length + '</b><span>Live events & offers</span></div><div class="card static stat"><b>' + (fresh ? d.today.ids.length : '—') + '</b><span>Dishes listed today</span></div></div>' +
      (fresh ? '' : '<div class="notice warn"><strong>Today\'s menu is not set.</strong> Visitors see the full menu with a note. <a href="#" data-go="today">Set today\'s menu</a> (takes a minute).</div>') +
      '<div class="quick"><h2>Quick actions</h2><div class="btn-row"><button class="btn btn-primary" data-go="today">Update today\'s menu</button><button class="btn btn-secondary" data-go="menu">Edit menu</button><button class="btn btn-secondary" data-go="gallery">Add gallery photos</button><button class="btn btn-secondary" data-go="events">Post an offer</button><button class="btn btn-secondary" data-go="pages">Edit page text</button></div></div>';
  };

  V.today = function (m) {
    var d = state.data, tdy = W.todayStr(), fresh = d.today.date === tdy;
    var sel = fresh ? d.today.ids.slice() : [];
    var html = '<div class="view-head"><div><h1>Today\'s menu</h1><p>Tick what is being served today (' + esc(W.fmtDate(tdy)) + '). The menu page then shows these as "Available today". Update this each morning.</p></div><button class="btn btn-primary" id="t-save">Save today\'s menu</button></div>';
    html += fresh ? '<div class="notice ok">Today\'s list is saved. You can still change it.</div>' : '<div class="notice warn">' + (d.today.date ? 'The last list was for ' + esc(W.fmtDate(d.today.date)) + '. ' : '') + 'Until you save a list for today, visitors see the full menu.</div>';
    html += '<div class="btn-row" style="margin:16px 0"><button class="btn btn-secondary btn-sm" id="t-all">Select all</button><button class="btn btn-secondary btn-sm" id="t-none">Clear all</button></div>';
    d.categories.forEach(function (c) {
      var its = d.items.filter(function (i) { return i.category === c.id; });
      if (!its.length) return;
      html += '<h3 class="grp">' + esc(c.name) + '</h3><div class="checks">' + its.map(function (i) {
        return '<label class="tick' + (i.available === false ? ' off' : '') + '"><input type="checkbox" value="' + esc(i.id) + '"' + (sel.indexOf(i.id) > -1 ? ' checked' : '') + (i.available === false ? ' disabled' : '') + '><span class="thumb">' + (i.image ? '<img alt="" src="' + esc(W.url(i.image)) + '">' : icon('image')) + '</span><span>' + esc(i.name) + (i.available === false ? ' <em>(hidden)</em>' : '') + '</span></label>';
      }).join('') + '</div>';
    });
    if (!d.items.length) html += '<div class="empty"><strong>No menu items yet</strong>Add items in the Menu section first.</div>';
    m.innerHTML = html;
    $('#t-all').onclick = function () { $$('.tick input:not(:disabled)', m).forEach(function (c) { c.checked = true; }); };
    $('#t-none').onclick = function () { $$('.tick input', m).forEach(function (c) { c.checked = false; }); };
    $('#t-save').onclick = function () {
      d.today = { date: tdy, ids: $$('.tick input:checked', m).map(function (c) { return c.value; }) };
      commit('Today\'s menu saved.').then(function () { render(); });
    };
  };

  V.menu = function (m) {
    var tab = state.menuTab;
    m.innerHTML = '<div class="tabs"><button class="chip" data-tab="items" aria-pressed="' + (tab === 'items') + '">Items</button><button class="chip" data-tab="categories" aria-pressed="' + (tab === 'categories') + '">Categories</button></div><div id="list"></div>';
    $$('.tabs .chip', m).forEach(function (b) { b.onclick = function () { state.menuTab = b.getAttribute('data-tab'); render(); }; });
    var box = $('#list', m); box.innerHTML = listHTML(tab, CFG[tab]); bindList(tab, CFG[tab], render);
  };

  V.gallery = function (m) {
    var cats = galleryCats();
    m.innerHTML = '<div class="view-head"><div><h1>Gallery</h1><p>Drop several photos at once to add them in bulk. You can name them afterwards.</p></div></div>' +
      '<div class="bulk"><div class="field"><label for="bulk-cat">Category for new photos</label><input id="bulk-cat" list="dl-bulk" value="Food"><datalist id="dl-bulk">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
      '<div class="dz bulk-dz" id="bulk-dz" tabindex="0" role="button" aria-label="Drop photos here or press Enter to choose"><div class="dz-body"><strong>Drag & drop photos here</strong><span>or click to choose files (you can select many)</span><em class="dz-status"></em></div><input type="file" class="dz-file" accept="image/*" multiple hidden></div></div><div id="list"></div>';
    var box = $('#list', m); box.innerHTML = listHTML('gallery', CFG.gallery).replace(/<div class="view-head">[\s\S]*?<\/button><\/div>/, '<div class="view-head"><div></div><button class="btn btn-primary" data-add="gallery">+ Add one photo</button></div>');
    bindList('gallery', CFG.gallery, render);

    var dz = $('#bulk-dz', m), file = $('.dz-file', dz), st = $('.dz-status', dz);
    function run(files) {
      files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
      if (!files.length) { toast('Please drop image files.', true); return; }
      var cat = ($('#bulk-cat', m).value || 'Food').trim(), n = 0;
      dz.classList.add('busy');
      files.reduce(function (p, f) {
        return p.then(function () {
          st.textContent = 'Uploading ' + (++n) + ' of ' + files.length + '…';
          return resize(f, 1600).then(uploadImage).then(function (src) { state.data.gallery.push({ id: uid(state.data.gallery, f.name.replace(/\.[^.]+$/, '') || 'photo'), src: src, caption: '', category: cat }); });
        });
      }, Promise.resolve()).catch(function (e) { toast(e.message, true); }).then(function () { dz.classList.remove('busy'); st.textContent = ''; commit(n + ' photo(s) added.').then(render); });
    }
    dz.onclick = function () { file.click(); };
    dz.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
    file.onchange = function () { run(file.files); file.value = ''; };
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { run(e.dataTransfer.files); });
  };

  V.events = function (m) { m.innerHTML = listHTML('events', CFG.events); bindList('events', CFG.events, render); };

  V.pages = function (m) {
    var pg = REG.pages[state.page] ? state.page : 'home', P = REG.pages[pg], d = state.data;
    var html = '<div class="view-head"><div><h1>Page content</h1><p>Edit the words on any page, show or hide sections, and set the search-engine title. Photos are in <a href="#" data-go="images">Site photos</a>.</p></div><a class="btn btn-secondary" href="../' + esc(P.file) + '" target="_blank" rel="noopener">View page</a></div>';
    html += '<div class="tabs">' + Object.keys(REG.pages).map(function (k) { return '<button class="chip" data-page="' + k + '" aria-pressed="' + (k === pg) + '">' + esc(REG.pages[k].label) + '</button>'; }).join('') + '</div>';
    html += '<form id="pg-form">';
    if (P.sections.length) html += '<h3 class="grp">Sections on this page</h3><div class="checks">' + P.sections.map(function (s) { return '<label class="tick"><input type="checkbox" name="sec:' + esc(s.key) + '"' + (d.hidden[s.key] ? '' : ' checked') + '><span>' + esc(s.label) + '</span></label>'; }).join('') + '</div>';
    html += '<h3 class="grp">Text</h3>' + P.fields.map(function (f, i) {
      var v = d.text[f.key] != null && d.text[f.key] !== '' ? d.text[f.key] : f.def, id = 'pf' + i;
      var rich = f.kind === 'rich', area = f.kind === 'textarea' || rich;
      return '<div class="field"><label for="' + id + '">' + esc(f.label) + '</label>' + (area ? '<textarea id="' + id + '" name="txt:' + esc(f.key) + '" rows="' + (rich ? 14 : 3) + '">' + esc(v) + '</textarea>' : '<input id="' + id + '" name="txt:' + esc(f.key) + '" value="' + esc(v) + '">') + (rich ? '<small>Formatting: start a line with ## for a heading, - for a bullet. Blank line = new paragraph.</small>' : '') + '</div>';
    }).join('');
    html += '<div class="sticky-save"><button class="btn btn-primary" type="submit">Save page</button><button class="btn btn-secondary" type="button" id="pg-reset">Reset page text to original</button></div></form>';
    m.innerHTML = html;
    $$('.tabs .chip', m).forEach(function (b) { b.onclick = function () { state.page = b.getAttribute('data-page'); render(); }; });
    $('#pg-form', m).onsubmit = function (e) {
      e.preventDefault();
      P.fields.forEach(function (f) {
        var v = this.elements['txt:' + f.key].value;
        if (v.trim() === f.def.trim() || !v.trim()) delete d.text[f.key]; else d.text[f.key] = v;
      }, this);
      P.sections.forEach(function (s) { if (this.elements['sec:' + s.key].checked) delete d.hidden[s.key]; else d.hidden[s.key] = true; }, this);
      commit('Page saved.');
    };
    $('#pg-reset', m).onclick = function () {
      if (!confirm('Reset all text and sections on the "' + P.label + '" page to the original?')) return;
      P.fields.forEach(function (f) { delete d.text[f.key]; }); P.sections.forEach(function (s) { delete d.hidden[s.key]; });
      commit('Page reset.').then(render);
    };
  };

  V.images = function (m) {
    var d = state.data;
    m.innerHTML = '<div class="view-head"><div><h1>Site photos</h1><p>The large photos used across the pages. Drag a new photo onto a box to replace it; changes save automatically.</p></div></div><div class="grid-2">' +
      REG.images.map(function (im) { return '<div class="card static"><h3>' + esc(im.label) + '</h3><p class="hint">' + esc(im.hint) + '</p>' + dzHTML(im.key, d.media[im.key]) + '</div>'; }).join('') + '</div>';
    bindDz(m, function (key, val) { state.data.media[key] = val; commit('Photo saved.'); });
  };

  var BIZ = [
    { name: 'whatsapp', label: 'WhatsApp number', ph: '+256…', hint: 'Used by the floating WhatsApp button on every page. Include the country code.' },
    { name: 'whatsappMessage', label: 'WhatsApp opening message', hint: 'Pre-filled text when someone taps the WhatsApp button.' },
    { name: 'phone', label: 'Phone number (optional)', ph: '+256…' },
    { name: 'email', label: 'Email (optional)', type: 'email' },
    { name: 'address', label: 'Full address' }, { name: 'shortAddress', label: 'Short address (header strips)' },
    { name: 'hours', label: 'Opening hours (full)' }, { name: 'hoursShort', label: 'Opening hours (short)' },
    { name: 'atmosphere', label: 'Atmosphere line' }, { name: 'tagline', label: 'Footer tagline', type: 'textarea' },
    { name: 'facebook', label: 'Facebook page link', ph: 'https://…' }, { name: 'instagram', label: 'Instagram link', ph: 'https://…' }, { name: 'tiktok', label: 'TikTok link', ph: 'https://…' },
    { name: 'mapsUrl', label: 'Google Maps link (optional)', ph: 'https://maps.app.goo.gl/…', hint: 'Leave blank to search for the address automatically.' }
  ];
  V.business = function (m) {
    m.innerHTML = '<div class="view-head"><div><h1>Contact & business</h1><p>Contact details, opening hours and social links, shown across the whole site.</p></div></div><form id="biz" class="card static">' + BIZ.map(function (f) { return fieldHTML(f, state.data.business[f.name]); }).join('') + '<div class="sticky-save"><button class="btn btn-primary" type="submit">Save changes</button></div></form>';
    $('#biz', m).onsubmit = function (e) { e.preventDefault(); Object.assign(state.data.business, readForm(this, BIZ)); commit('Business details saved.'); };
  };

  V.settings = function (m) {
    m.innerHTML = '<div class="view-head"><div><h1>Settings</h1><p>Password, backups and recovery.</p></div></div><div class="grid-2">' +
      '<div class="card static"><h3>Change password</h3><form id="pw"><div class="field"><label>Current password</label><input type="password" name="cur" autocomplete="current-password" required></div><div class="field"><label>New password (8+ characters)</label><input type="password" name="nw" autocomplete="new-password" minlength="8" required></div><button class="btn btn-primary" type="submit">Update password</button></form></div>' +
      '<div class="card static"><h3>Backup & restore</h3><p class="hint">Download all content as a file, or restore from one.</p><div class="btn-row"><button class="btn btn-secondary" id="exp">Export content.json</button><button class="btn btn-secondary" id="imp">Import…</button><input type="file" id="imp-f" accept="application/json,.json" hidden></div>' +
      (state.mode === 'server' ? '<p class="hint" style="margin-top:14px">The server also keeps the last 20 versions in <code>data/backups</code>.</p>' : '<p class="hint" style="margin-top:14px">To publish from browser-only mode, upload the exported file to the website\'s <code>data</code> folder, replacing <code>content.json</code>.</p>') + '</div>' +
      '<div class="card static"><h3>Reset everything</h3><p class="hint">Restore the original menu, text, photos and settings that shipped with the site.</p><button class="btn btn-danger" id="rst">Restore original content</button></div>' +
      '<div class="card static"><h3>Connection</h3><p class="hint">' + (state.mode === 'server' ? 'Connected to the server. Saves go live instantly.' : 'No server backend detected. Working in browser-only mode.') + '</p></div></div>';
    $('#pw', m).onsubmit = function (e) {
      e.preventDefault(); var cur = this.elements.cur.value, nw = this.elements.nw.value, form = this;
      if (nw.length < 8) { toast('Use at least 8 characters.', true); return; }
      if (state.mode === 'server') { post('password', { current: cur, new: nw }).then(function () { toast('Password updated.'); form.reset(); }).catch(function (er) { toast(er.message, true); }); return; }
      if (localHash(LOCAL_USER, cur) !== currentLocalHash()) { toast('Current password is incorrect.', true); return; }
      try { localStorage.setItem('wahika-local-hash', localHash(LOCAL_USER, nw)); toast('Password updated for this browser.'); form.reset(); } catch (er) { toast('Could not save password.', true); }
    };
    $('#exp', m).onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' })); a.download = 'content.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('#imp', m).onclick = function () { $('#imp-f', m).click(); };
    $('#imp-f', m).onchange = function () {
      var f = this.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try { var j = JSON.parse(r.result); if (!j || typeof j !== 'object') throw 0; if (!confirm('Replace the current content with this file?')) return; state.data = W.merge(W.DEFAULTS, j); commit('Content imported.').then(render); }
        catch (er) { toast('That file is not valid content JSON.', true); }
      }; r.readAsText(f); this.value = '';
    };
    $('#rst', m).onclick = function () { if (confirm('Restore ALL original content? Your edits will be lost.')) { state.data = W.clone(W.DEFAULTS); commit('Original content restored.').then(render); } };
  };

  /* ---------- Shell ---------- */
  function render() {
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-view') === state.view)); });
    var m = $('#main'); V[state.view](m);
    $$('[data-go]', m).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-go')); }); });
    window.scrollTo(0, 0);
  }
  function go(v) { state.view = v; render(); }

  function showGate() { $('#app').hidden = true; $('#gate').hidden = false; }
  function showApp() {
    $('#gate').hidden = true; $('#app').hidden = false;
    $('#nav').innerHTML = NAV.map(function (n) { return '<button type="button" data-view="' + n[0] + '">' + n[1] + '</button>'; }).join('');
    $('#mode').textContent = state.mode === 'server' ? 'Live' : 'Browser-only';
    $('#mode').className = 'pill ' + (state.mode === 'server' ? 'ok' : 'warn');
    render();
  }
  function enter() { return loadData().then(showApp); }

  function boot() {
    var tt = $('.theme-toggle');
    tt.addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('wahika-theme', n); } catch (e) {} });
    $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-view]'); if (b) go(b.getAttribute('data-view')); });
    $('#logout').addEventListener('click', function () {
      if (state.mode === 'server') post('logout').catch(function () {}); try { sessionStorage.removeItem('wahika-local-session'); } catch (e) {}
      showGate();
    });
    $('#login').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = this.elements.user.value.trim(), p = this.elements.pass.value, err = $('#login-err'), btn = $('button[type=submit]', this);
      err.textContent = ''; btn.disabled = true;
      var p1 = state.mode === 'server'
        ? fetch(api('login'), { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: u, pass: p }) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Sign-in failed'); return j; }); }).then(function (j) { state.csrf = j.csrf; })
        : new Promise(function (res, rej) { if (u === LOCAL_USER && localHash(u, p) === currentLocalHash()) { try { sessionStorage.setItem('wahika-local-session', '1'); } catch (e) {} res(); } else rej(new Error('Incorrect username or password')); });
      p1.then(enter).catch(function (er) { err.textContent = er.message; }).then(function () { btn.disabled = false; });
    });

    fetch(api('ping'), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.server === true) { state.mode = 'server'; if (j.authed) { state.csrf = j.csrf; return enter(); } }
      else throw 0;
    }).catch(function () {
      state.mode = 'local';
      var s = false; try { s = sessionStorage.getItem('wahika-local-session') === '1'; } catch (e) {}
      if (s) return enter();
    }).then(function () { $('#boot').hidden = true; if ($('#app').hidden) $('#gate').hidden = false; });
  }
  boot();
})();

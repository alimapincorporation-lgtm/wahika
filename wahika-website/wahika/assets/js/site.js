/* Wahika — public site behaviour + CMS-driven rendering */
(function () {
  var W = window.Wahika, esc = W.esc, root = document.documentElement;
  var IMG = '<svg class="icon" aria-hidden="true"><use href="#i-image"/></svg>';

  /* ---------- Theme ---------- */
  var tt = document.querySelector('.theme-toggle');
  if (tt) tt.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('wahika-theme', next); } catch (e) {}
  });

  /* ---------- Mobile drawer ---------- */
  var drawer = document.getElementById('drawer'), scrim = document.getElementById('scrim');
  var openBtn = document.querySelector('.menu-btn'), closeBtn = document.querySelector('.drawer-close');
  function setDrawer(o) {
    drawer.classList.toggle('open', o); scrim.classList.toggle('open', o);
    drawer.setAttribute('aria-hidden', String(!o)); openBtn.setAttribute('aria-expanded', String(o));
    document.body.style.overflow = o ? 'hidden' : '';
    (o ? closeBtn : openBtn).focus();
  }
  if (drawer) {
    openBtn.addEventListener('click', function () { setDrawer(true); });
    closeBtn.addEventListener('click', function () { setDrawer(false); });
    scrim.addEventListener('click', function () { setDrawer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) setDrawer(false); });
  }

  /* ---------- Reveal ---------- */
  function reveal() {
    var els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var ro = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); ro.unobserve(x.target); } });
    }, { threshold: .12 });
    els.forEach(function (e) { ro.observe(e); });
  }
  reveal();

  /* ---------- Helpers ---------- */
  function mediaInner(src, alt, label) {
    return (src ? '<img src="' + esc(W.url(src)) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.remove()">' : '') +
      '<span class="ph">' + IMG + esc(label || 'Photo coming soon') + '</span>';
  }
  function media(src, alt, cls) { return '<div class="media ' + (cls || '') + '">' + mediaInner(src, alt) + '</div>'; }
  function tx(d, key, def) { var v = d.text[key]; return (v != null && v !== '') ? v : def; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function inline(s) {
    return esc(s).replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|[\w.\/#?=&-]+)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  }
  function md(src) {
    var out = [], list = false, para = [];
    function flush() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    String(src || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (/^- /.test(t)) { flush(); if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + inline(t.slice(2)) + '</li>'); return; }
      if (list) { out.push('</ul>'); list = false; }
      if (/^## /.test(t)) { flush(); out.push('<h2>' + inline(t.slice(3)) + '</h2>'); }
      else if (!t) flush();
      else para.push(t);
    });
    flush(); if (list) out.push('</ul>');
    return out.join('');
  }
  function sortedCats(d) { return d.categories; }

  /* ---------- Item card ---------- */
  function itemCard(it, d, note) {
    var tags = '';
    if (it.popular) tags += '<span class="tag">Popular</span>';
    if (note) tags += '<span class="tag muted">' + esc(note) + '</span>';
    return '<a class="card item-card" href="menu-item.html?id=' + encodeURIComponent(it.id) + '">' +
      '<div class="media">' + mediaInner(it.image, it.name) + '</div>' +
      '<div class="body"><div class="item-top"><h3>' + esc(it.name) + '</h3>' + (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '') + '</div>' +
      (it.description ? '<p>' + esc(it.description) + '</p>' : '') + (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div></a>';
  }
  function empty(title, text) { return '<div class="empty"><strong>' + esc(title) + '</strong>' + esc(text) + '</div>'; }

  /* ---------- Renderers ---------- */
  var R = {};

  R['home-categories'] = function (el, d) {
    var cats = d.categories.filter(function (c) { return c.home; });
    el.innerHTML = cats.map(function (c) {
      return '<a class="menu-card" href="menu.html#cat-' + esc(c.id) + '"><div class="media">' + mediaInner(c.image, c.name) + '</div>' +
        '<div class="body"><h3>' + esc(c.name) + '</h3><p>' + esc(c.description) + '</p></div></a>';
    }).join('');
  };

  R['menu'] = function (el, d) {
    var tdy = W.todayStr(), listed = d.today && d.today.date === tdy, ids = listed ? d.today.ids : [];
    var avail = d.items.filter(function (i) { return i.available !== false; });
    var html = '';

    if (listed) {
      var todayItems = avail.filter(function (i) { return ids.indexOf(i.id) > -1; });
      html += '<div class="section-head reveal" style="margin-bottom:32px"><p class="eyebrow">' + esc(W.fmtDate(tdy)) + '</p><h2>' + esc(tx(d, 'menu.today.title', 'Available Today')) + '</h2><p>' + esc(tx(d, 'menu.today.text', 'These are the dishes and drinks being served today.')) + '</p></div>';
      html += todayItems.length ? '<div class="grid-3" id="today-grid">' + todayItems.map(function (i) { return itemCard(i, d); }).join('') + '</div>'
        : empty('Nothing listed yet', 'Today\'s dishes will appear here soon.');
      html += '<div style="height:72px"></div>';
    } else {
      html += '<div class="empty" style="margin-bottom:56px"><strong>' + esc(tx(d, 'menu.notyet.title', 'Today\'s availability is being updated')) + '</strong>' + esc(tx(d, 'menu.notyet.text', 'Below is our full menu. Message us on WhatsApp to confirm what is available today.')) + '</div>';
    }

    html += '<div class="section-head reveal" style="margin-bottom:28px"><h2>' + esc(tx(d, 'menu.full.title', 'Full Menu')) + '</h2></div>';
    html += '<div class="chips" id="menu-chips"><button class="chip" type="button" data-cat="" aria-pressed="true">All</button>' +
      d.categories.map(function (c) { return '<button class="chip" type="button" data-cat="' + esc(c.id) + '" aria-pressed="false">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    html += '<div id="menu-blocks">' + d.categories.map(function (c) {
      var its = avail.filter(function (i) { return i.category === c.id; });
      return '<section class="cat-block" id="cat-' + esc(c.id) + '" data-cat="' + esc(c.id) + '"><div class="cat-head"><h2>' + esc(c.name) + '</h2><p>' + esc(c.description) + '</p></div>' +
        (its.length ? '<div class="grid-3">' + its.map(function (i) {
          return itemCard(i, d, listed && ids.indexOf(i.id) < 0 ? 'Not on today\'s list' : '');
        }).join('') + '</div>' : empty('Coming soon', 'Items for this category are being added.')) + '</section>';
    }).join('') + '</div>';
    el.innerHTML = html;

    var chips = el.querySelector('#menu-chips');
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      var cat = b.getAttribute('data-cat');
      el.querySelectorAll('.cat-block').forEach(function (blk) { blk.hidden = !!cat && blk.getAttribute('data-cat') !== cat; });
    });
    if (location.hash.indexOf('#cat-') === 0) {
      var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 50);
    }
    reveal();
  };

  R['menu-item'] = function (el, d) {
    var id = qs('id'), it = d.items.filter(function (i) { return i.id === id; })[0];
    if (!it) {
      el.innerHTML = '<a class="back" href="menu.html"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>Back to menu</a>' +
        empty('Item not found', 'This dish may have been removed. Browse the full menu instead.') +
        '<div class="center"><a class="btn btn-primary" href="menu.html">View our menu</a></div>';
      return;
    }
    var cat = d.categories.filter(function (c) { return c.id === it.category; })[0];
    document.title = it.name + ' | Wahika Café & Lounge';
    var tdy = W.todayStr(), listed = d.today && d.today.date === tdy;
    var today = listed ? (d.today.ids.indexOf(it.id) > -1 && it.available !== false ? '<span class="tag">Available today</span>' : '<span class="tag muted">Not on today\'s list</span>') : '';
    var related = d.items.filter(function (i) { return i.category === it.category && i.id !== it.id && i.available !== false; }).slice(0, 3);
    var wa = W.waUrl(d);
    el.innerHTML = '<a class="back" href="menu.html"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>Back to menu</a>' +
      '<div class="split item-detail"><div class="media">' + mediaInner(it.image, it.name) + '</div><div>' +
      (cat ? '<p class="eyebrow">' + esc(cat.name) + '</p>' : '') + '<h2>' + esc(it.name) + '</h2>' +
      (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '<div style="height:14px"></div>') +
      '<p class="lead">' + esc(it.description) + '</p><div class="tags" style="margin-top:18px">' + (it.popular ? '<span class="tag">Popular</span>' : '') + today + '</div>' +
      '<div class="btn-row" style="margin-top:28px">' +
      (wa ? '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + esc(W.waUrl(Object.assign({}, d, { business: Object.assign({}, d.business, { whatsappMessage: 'Hello Wahika, I would like to ask about the ' + it.name + '.' }) }))) + '">Ask on WhatsApp</a>' : '') +
      '<a class="btn btn-secondary" href="menu.html">Full menu</a></div></div></div>' +
      (related.length ? '<div style="margin-top:72px"><h2 style="margin-bottom:24px">More from ' + esc(cat ? cat.name : 'the menu') + '</h2><div class="grid-3">' + related.map(function (i) { return itemCard(i, d); }).join('') + '</div></div>' : '');
  };

  R['gallery'] = function (el, d) {
    var items = d.gallery.filter(function (g) { return g.src; });
    if (!items.length) { el.innerHTML = empty('Photos coming soon', 'Our gallery is being filled. Please check back shortly.'); return; }
    var cats = []; items.forEach(function (g) { var c = g.category || 'Other'; if (cats.indexOf(c) < 0) cats.push(c); });
    el.innerHTML = '<div class="chips" id="g-chips"><button class="chip" type="button" data-cat="" aria-pressed="true">All</button>' +
      cats.map(function (c) { return '<button class="chip" type="button" data-cat="' + esc(c) + '" aria-pressed="false">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="gallery-grid" id="g-grid"></div>';
    var grid = el.querySelector('#g-grid'), shown = items;

    function draw(cat) {
      shown = cat ? items.filter(function (g) { return (g.category || 'Other') === cat; }) : items;
      grid.innerHTML = shown.map(function (g, i) {
        return '<button class="g-item" type="button" data-i="' + i + '" aria-label="View photo: ' + esc(g.caption || 'Wahika') + '"><img src="' + esc(W.url(g.src)) + '" alt="' + esc(g.caption || 'Photo from Wahika Café & Lounge') + '" loading="lazy">' + (g.caption ? '<span>' + esc(g.caption) + '</span>' : '') + '</button>';
      }).join('');
    }
    draw('');
    el.querySelector('#g-chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      el.querySelectorAll('#g-chips .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      draw(b.getAttribute('data-cat'));
    });

    /* Lightbox */
    var lb = document.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<button class="lb-btn lb-close" type="button" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button><button class="lb-btn lb-prev" type="button" aria-label="Previous photo"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button><img alt=""><div class="cap"></div><button class="lb-btn lb-next" type="button" aria-label="Next photo"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button>';
    document.body.appendChild(lb);
    var idx = 0, lastFocus = null;
    function show(i) { idx = (i + shown.length) % shown.length; var g = shown[idx]; lb.querySelector('img').src = W.url(g.src); lb.querySelector('img').alt = g.caption || ''; lb.querySelector('.cap').textContent = g.caption || ''; }
    function open(i) { lastFocus = document.activeElement; show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
    grid.addEventListener('click', function (e) { var b = e.target.closest('.g-item'); if (b) open(+b.getAttribute('data-i')); });
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-close') || e.target === lb) close();
      else if (e.target.closest('.lb-prev')) show(idx - 1);
      else if (e.target.closest('.lb-next')) show(idx + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
  };

  R['events'] = function (el, d) {
    var tdy = W.todayStr();
    var list = d.events.filter(function (e) { return e.published !== false; });
    if (!list.length) { el.innerHTML = empty('No events or offers right now', 'New events and offers will be posted here. Follow us on WhatsApp to hear first.'); return; }
    list.sort(function (a, b) {
      var ap = a.date && a.date < tdy, bp = b.date && b.date < tdy;
      if (ap !== bp) return ap ? 1 : -1;
      return ap ? (b.date > a.date ? 1 : -1) : ((a.date || '9999') > (b.date || '9999') ? 1 : -1);
    });
    el.innerHTML = '<div class="chips" id="e-chips"><button class="chip" type="button" data-type="" aria-pressed="true">All</button><button class="chip" type="button" data-type="Event" aria-pressed="false">Events</button><button class="chip" type="button" data-type="Offer" aria-pressed="false">Offers</button></div><div class="grid-3" id="e-grid"></div>';
    var grid = el.querySelector('#e-grid');
    function draw(type) {
      var rows = type ? list.filter(function (e) { return (e.type || 'Event') === type; }) : list;
      grid.innerHTML = rows.length ? rows.map(function (e) {
        var past = e.date && e.date < tdy, wa = W.waUrl(Object.assign({}, d, { business: Object.assign({}, d.business, { whatsappMessage: 'Hello Wahika, I would like to know more about: ' + e.title }) }));
        return '<article class="card event-card static"><div class="media">' + mediaInner(e.image, e.title) + '</div><div class="body"><div class="tags"><span class="tag">' + esc(e.type || 'Event') + '</span>' + (past ? '<span class="tag muted">Past</span>' : '') + '</div><h3>' + esc(e.title) + '</h3>' +
          (e.date ? '<div class="event-date"><svg class="icon" aria-hidden="true"><use href="#i-calendar"/></svg>' + esc(W.fmtDate(e.date)) + '</div>' : '') +
          (e.description ? '<p>' + esc(e.description) + '</p>' : '') + (wa && !past ? '<a class="btn btn-secondary btn-sm" style="margin-top:auto;align-self:flex-start" target="_blank" rel="noopener" href="' + esc(wa) + '">Ask about this</a>' : '') + '</div></article>';
      }).join('') : '<div style="grid-column:1/-1">' + empty('Nothing here yet', 'Please check back soon.') + '</div>';
    }
    draw('');
    el.querySelector('#e-chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      el.querySelectorAll('#e-chips .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
      draw(b.getAttribute('data-type'));
    });
  };

  R['contact-channels'] = function (el, d) {
    var b = d.business, rows = [];
    function row(icon, label, text, href) {
      rows.push('<div class="detail"><div class="icon-badge"><svg class="icon" aria-hidden="true"><use href="#' + icon + '"/></svg></div><div><div class="label">' + label + '</div>' +
        (href ? '<a class="value" target="_blank" rel="noopener" href="' + esc(href) + '">' + esc(text) + '</a>' : '<div class="value">' + esc(text) + '</div>') + '</div></div>');
    }
    if (W.digits(b.whatsapp)) row('i-chat', 'WhatsApp', b.whatsapp, W.waUrl(d));
    if (b.phone) row('i-phone', 'Phone', b.phone, 'tel:' + b.phone.replace(/[^\d+]/g, ''));
    if (b.email) row('i-mail', 'Email', b.email, 'mailto:' + b.email);
    [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']].forEach(function (s) { if (b[s[0]]) row('i-link', s[1], b[s[0]].replace(/^https?:\/\/(www\.)?/, ''), b[s[0]]); });
    el.innerHTML = rows.join('');
  };

  R['social-links'] = function (el, d) {
    var b = d.business, out = '';
    [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok']].forEach(function (s) { if (b[s[0]]) out += '<li><a target="_blank" rel="noopener" href="' + esc(b[s[0]]) + '">' + s[1] + '</a></li>'; });
    if (W.digits(b.whatsapp)) out += '<li><a target="_blank" rel="noopener" href="' + esc(W.waUrl(d)) + '">WhatsApp</a></li>';
    el.insertAdjacentHTML('beforeend', out);
  };

  /* ---------- Apply CMS data ---------- */
  W.load().then(function (d) {
    var page = document.body.getAttribute('data-page') || '';

    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var v = d.text[el.getAttribute('data-cms')];
      if (v == null || v === '') return;
      if (el.hasAttribute('data-rich')) el.innerHTML = md(v); else el.textContent = v;
    });
    document.querySelectorAll('[data-section]').forEach(function (el) { if (d.hidden[el.getAttribute('data-section')]) el.hidden = true; });

    var mt = d.text[page + '.meta.title'], md2 = d.text[page + '.meta.desc'];
    if (mt) document.title = mt;
    if (md2) { var m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', md2); }

    document.querySelectorAll('[data-bind]').forEach(function (el) { var v = d.business[el.getAttribute('data-bind')]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-bind-href]').forEach(function (el) {
      var k = el.getAttribute('data-bind-href'); el.href = k === 'maps' ? W.mapsUrl(d) : W.waUrl(d) || '#';
    });
    document.querySelectorAll('[data-slot]').forEach(function (el) {
      el.innerHTML = mediaInner(d.media[el.getAttribute('data-slot')], el.getAttribute('data-alt'), 'Add photo in the admin portal');
    });

    var wa = document.querySelector('.wa-float');
    if (wa) { var u = W.waUrl(d); if (u) wa.href = u; else wa.hidden = true; }

    document.querySelectorAll('[data-render]').forEach(function (el) {
      var fn = R[el.getAttribute('data-render')]; if (fn) fn(el, d);
    });
    reveal();
  });
})();

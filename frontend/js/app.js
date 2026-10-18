/* VJ-PGs frontend: listings, filters, detail view, auth, and coupon booking. */
(() => {
  'use strict';

  /* ---------- config ---------- */
  const CFG = window.VJ_CONFIG || {};
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API = (isLocal ? CFG.LOCAL_API_BASE : CFG.API_BASE) || '';
  const PGS = window.VJ_PGS || [];

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const inr = (n) => Number(n).toLocaleString('en-IN');

  const ICON_PATHS = {
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    utensils: '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    droplets: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  };
  const icon = (name, cls = 'h-4 w-4') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide ${cls}">${ICON_PATHS[name]}</svg>`;

  // Same matching rules (and key order) as the original site.
  const AMENITY_ICONS = [
    ['WiFi', 'wifi'], ['Meals', 'utensils'], ['3 Meals', 'utensils'], ['Laundry', 'shirt'],
    ['Washing Machine', 'shirt'], ['Power Backup', 'zap'], ['CCTV', 'video'], ['Security', 'lock'],
    ['TV', 'monitor'], ['Hot Water', 'droplets'], ['Geyser', 'droplets'], ['Biometric Entry', 'lock'],
  ];
  const amenityIcon = (a, cls) => {
    for (const [k, ic] of AMENITY_ICONS) if (a.includes(k) || k.includes(a)) return icon(ic, cls);
    return icon('tag', cls);
  };

  const toast = (msg) => {
    $('#toast')?.remove();
    const t = document.createElement('div');
    t.id = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  };

  /* ---------- session + API ---------- */
  let session = null; // { token, user }
  try { session = JSON.parse(localStorage.getItem('vjpg_session') || 'null'); } catch { session = null; }
  const saveSession = (s) => {
    session = s;
    try { s ? localStorage.setItem('vjpg_session', JSON.stringify(s)) : localStorage.removeItem('vjpg_session'); } catch { /* storage unavailable */ }
    renderAuthUI();
  };

  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 90000); // Render free tier can take ~50s to wake up
    try {
      const res = await fetch(API + path, {
        method, signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(auth && session ? { Authorization: 'Bearer ' + session.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const e = new Error(data.error || 'Something went wrong. Please try again.'); e.status = res.status; throw e; }
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
      if (e instanceof TypeError) throw new Error('Could not reach the server. Check your connection and try again.');
      throw e;
    } finally { clearTimeout(timer); }
  }

  /* ---------- modal plumbing ---------- */
  const modalRoot = () => $('#modal-root');
  let openCount = 0;
  function lockScroll(on) { openCount = Math.max(0, openCount + (on ? 1 : -1)); document.body.style.overflow = openCount ? 'hidden' : ''; }

  function openDialog(html, { onClose } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'vj-overlay';
    overlay.innerHTML = `<div class="vj-dialog" role="dialog" aria-modal="true">${html}<button type="button" class="vj-close" aria-label="Close">${icon('x')}</button></div>`;
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); lockScroll(false); onClose && onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    $('.vj-close', overlay).addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    modalRoot().appendChild(overlay);
    lockScroll(true);
    return { el: $('.vj-dialog', overlay), close };
  }

  /* ---------- listings ---------- */
  const PRICE_LIMIT = { Any: Infinity, '8k': 8000, '10k': 10000, '12k': 12000 };
  const DIST_LIMIT = { '<1km': 1, '<3km': 3, '<5km': 5 };
  const CAMBRIDGE_KEYS = ['cambridge', 'cit', 'krpuram', 'basavanapura', 'ramamurthynagar'];
  const GARDEN_KEYS = ['garden', 'gcu', 'tcpalya', 'battarahalli'];
  const detectCollege = (q) => { const t = norm(q); return CAMBRIDGE_KEYS.some((k) => t.includes(k)) ? 'cambridge' : GARDEN_KEYS.some((k) => t.includes(k)) ? 'gardencity' : null; };

  const state = { search: '', college: 'cambridge', gender: 'All', price: 'Any', dist: 'Any' };

  function visiblePGs() {
    const q = state.search.trim(), n = norm(q);
    let college = state.college;
    const isCam = ['cambridge', 'cit', 'krpuram', 'basavanapura', 'ramamurthynagar', 'nearcambridge'].some((k) => n.includes(k));
    const isGar = ['garden', 'gcu', 'tcpalya', 'battarahalli', 'neargardencity', 'rmnagar', 'tc'].some((k) => n.includes(k));
    if (isCam) college = 'cambridge';
    if (isGar) college = 'gardencity';
    const matchedCollege = isCam || isGar;
    return PGS.filter((pg) => {
      if ((q && !matchedCollege && !norm(pg.name).includes(n) && !norm(pg.category).includes(n)) ||
          (state.gender !== 'All' && pg.category !== state.gender) ||
          (state.price !== 'Any' && pg.price >= PRICE_LIMIT[state.price])) return false;
      if (state.dist !== 'Any' && pg.distances[college] > DIST_LIMIT[state.dist]) return false;
      return true;
    }).sort((a, b) => b.price - a.price).map((pg) => ({ pg, college, distance: pg.distances[college] }));
  }

  const BADGE = 'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent';
  const BTN = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] has-[>svg]:px-3';
  const IMG_STYLE = 'position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent';

  function cardHTML({ pg, college, distance }) {
    const collegeName = college === 'cambridge' ? 'Cambridge' : 'Garden City';
    const save = pg.ownerPrice - pg.price;
    const am = pg.amenities.filter((a) => a !== 'AC');
    const slides = pg.carousel.map((src, i) => `<div class="relative h-full w-full flex-shrink-0 snap-center"><img alt="${esc(pg.name)} - Image ${i + 1}" loading="lazy" decoding="async" class="object-cover transition-transform duration-300 group-hover:scale-105" style="${IMG_STYLE}" src="${esc(src)}"></div>`).join('');
    const nav = pg.carousel.length > 1 ? `
      <button data-act="prev" class="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-foreground opacity-0 transition-opacity hover:bg-card group-hover:opacity-100" aria-label="Previous image">${icon('left', 'h-5 w-5')}</button>
      <button data-act="next" class="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-foreground opacity-0 transition-opacity hover:bg-card group-hover:opacity-100" aria-label="Next image">${icon('right', 'h-5 w-5')}</button>
      <div class="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">${pg.carousel.map((_, i) => `<button data-act="dot" data-i="${i}" class="h-1.5 w-1.5 rounded-full transition-all ${i === 0 ? 'bg-white w-3' : 'bg-white/60 hover:bg-white/80'}" aria-label="Go to image ${i + 1}"></button>`).join('')}</div>` : '';
    return `
    <div data-slot="card" data-pg="${pg.id}" class="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer">
      <div class="absolute right-3 top-3 z-20"><span class="${BADGE} bg-green-600 text-white hover:bg-green-700 shadow-lg">${icon('tag', 'mr-1 h-3 w-3')}Save ₹${inr(save)}</span></div>
      <div class="relative aspect-[4/3] overflow-hidden">
        <div data-carousel class="flex h-full w-full overflow-x-auto snap-x snap-mandatory snap-stop-always scrollbar-hide">${slides}</div>
        ${nav}
        <div class="absolute left-3 top-3 flex flex-wrap gap-2">
          <span class="${BADGE} bg-card/90 text-foreground backdrop-blur-sm">${icon('users', 'mr-1 h-3 w-3')}${pg.category === 'Boys' ? 'Boys' : 'Girls'}</span>
          <span class="${BADGE} bg-primary text-primary-foreground backdrop-blur-sm">${icon('award', 'mr-1 h-3 w-3')}VJ Price Guarantee</span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-foreground line-clamp-1">${esc(pg.name)}</h3>
        <div class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">${icon('pin', 'h-4 w-4 shrink-0')}<span class="line-clamp-1">${pg.category} | ${collegeName}</span></div>
        <p class="mt-1.5 text-sm font-semibold text-muted-foreground">📍 ${distance} km from ${collegeName}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          ${am.slice(0, 3).map((a) => `<span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">${amenityIcon(a, 'h-3.5 w-3.5')}${esc(a)}</span>`).join('')}
          ${am.length > 3 ? `<span class="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">+${am.length - 3} more</span>` : ''}
        </div>
      </div>
      <div class="items-center flex flex-col gap-3 border-t border-border p-4">
        <div class="flex w-full items-center justify-between"><div class="flex flex-col gap-0.5">
          <span class="text-xs text-red-500 line-through">Owner Price - ₹${inr(pg.ownerPrice)}</span>
          <span class="text-2xl font-extrabold text-green-600">₹${inr(pg.price)} <span class="text-sm font-medium text-green-600">/month</span></span>
        </div></div>
        <div class="flex w-full gap-2">
          <button data-act="details" class="${BTN} h-9 px-4 py-2 flex-1 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground">View Details</button>
          <button data-act="confirm" class="${BTN} h-9 px-4 py-2 flex-1 text-primary-foreground bg-primary hover:bg-primary/90">Confirm Discount</button>
        </div>
      </div>
    </div>`;
  }

  function renderListings() {
    const list = visiblePGs();
    const grid = $('#pg-grid');
    if (!list.length) {
      grid.className = 'mt-10';
      grid.innerHTML = `<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <p class="text-lg font-medium text-foreground">No PGs found</p>
        <p class="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
        <button data-act="reset" class="${BTN} h-9 px-4 py-2 mt-4 border bg-background shadow-xs hover:bg-accent">Reset Filters</button></div>`;
      return;
    }
    grid.className = 'mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
    grid.innerHTML = list.map(cardHTML).join('');
  }

  /* carousel helpers (shared by cards and the detail view) */
  function slideTo(carousel, i) { carousel.scrollTo({ left: carousel.offsetWidth * i, behavior: 'smooth' }); }
  function currentSlide(carousel) { return Math.round(carousel.scrollLeft / carousel.offsetWidth); }
  function syncDots(dotsRoot, idx, big, small) {
    $$('[data-act="dot"],[data-dot]', dotsRoot).forEach((d, i) => {
      d.className = `${big} rounded-full transition-all ${i === idx ? 'bg-white ' + small : 'bg-white/60 hover:bg-white/80'}`;
    });
  }

  function resetFilters() {
    state.search = ''; state.gender = 'All'; state.price = 'Any'; state.dist = 'Any'; state.college = 'cambridge';
    $('#search-input').value = ''; $('#f-gender').value = 'All'; $('#f-price').value = 'Any'; $('#f-dist').value = 'Any';
    renderListings();
  }

  /* ---------- detail view ---------- */
  const SHARE_LABEL = { single: 'Single', double: 'Double', triple: 'Triple', quad: 'Quad' };
  const SHARE_TO_FORM = { single: 'Single', double: '2 Sharing', triple: '3 Sharing', quad: '4 Sharing' };
  const FORM_TO_KEY = { Single: 'single', '2 Sharing': 'double', '3 Sharing': 'triple', '4 Sharing': 'quad' };

  function openDetails(pg, college) {
    let idx = 0;
    let sel = ['quad', 'triple', 'double', 'single'].find((k) => pg.sharing_prices[k]) || 'triple';
    const nearest = pg.distances.cambridge < pg.distances.gardencity ? `${pg.distances.cambridge}km from Cambridge` : `${pg.distances.gardencity}km from Garden City`;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50';
    overlay.innerHTML = `
      <div class="relative bg-background w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-lg overflow-hidden flex flex-col" data-panel>
        <button data-act="close" class="absolute right-4 top-4 z-50 rounded-full bg-background/90 p-2 text-foreground shadow-lg hover:bg-background" aria-label="Close">${icon('x', 'h-5 w-5')}</button>
        <div class="flex-1 overflow-y-auto pb-20">
          <div class="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden">
            <div data-carousel class="flex h-full w-full overflow-x-auto snap-x snap-mandatory snap-stop-always scrollbar-hide">
              ${pg.carousel.map((src, i) => `<div class="relative h-full w-full flex-shrink-0 snap-center"><img alt="${esc(pg.name)} - Image ${i + 1}" class="object-cover" style="${IMG_STYLE}" src="${esc(src)}"></div>`).join('')}
            </div>
            ${pg.carousel.length > 1 ? `
              <button data-act="prev" class="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground hover:bg-background" aria-label="Previous image">${icon('left', 'h-5 w-5')}</button>
              <button data-act="next" class="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground hover:bg-background" aria-label="Next image">${icon('right', 'h-5 w-5')}</button>
              <div class="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">${pg.carousel.map((_, i) => `<button data-act="dot" data-i="${i}" class="h-2 w-2 rounded-full transition-all ${i === 0 ? 'bg-white w-4' : 'bg-white/60 hover:bg-white/80'}" aria-label="Go to image ${i + 1}"></button>`).join('')}</div>` : ''}
          </div>
          <div class="p-6 space-y-6">
            <div><h2 class="text-2xl sm:text-3xl font-bold text-foreground">${esc(pg.name)}</h2>
              <div class="mt-2 flex items-center gap-1.5 text-muted-foreground">${icon('pin', 'h-4 w-4 shrink-0')}<span class="text-sm">📍 ${nearest}</span></div></div>
            <div><h3 class="text-lg font-semibold text-foreground mb-2">About</h3><p class="text-sm text-muted-foreground leading-relaxed max-w-prose">${esc(pg.description)}</p></div>
            <div><h3 class="text-lg font-semibold text-foreground mb-3">Select Sharing Type</h3><div data-sharing class="flex flex-wrap gap-2"></div></div>
            <div><h3 class="text-lg font-semibold text-foreground mb-3">Amenities</h3><div class="grid grid-cols-2 gap-2">
              ${pg.amenities.map((a) => `<div class="flex items-center gap-2 text-sm text-foreground"><span class="text-primary">${amenityIcon(a, 'h-4 w-4')}</span><span>${esc(a)}</span></div>`).join('')}</div></div>
            <div><h3 class="text-lg font-semibold text-foreground mb-3">House Rules</h3><ul class="space-y-2">
              ${pg.rules.map((r) => `<li class="flex items-start gap-2 text-sm text-muted-foreground"><span class="text-primary mt-0.5">•</span><span>${esc(r)}</span></li>`).join('')}</ul></div>
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4 shadow-lg"><div class="flex items-center justify-between gap-4">
          <div class="flex flex-col" data-price></div>
          <button data-act="book" class="${BTN} bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 h-12 text-base shadow-md transition-transform active:scale-95">Confirm Discount</button>
        </div></div>
      </div>`;

    const sharingEl = $('[data-sharing]', overlay), priceEl = $('[data-price]', overlay);
    const paintSharing = () => {
      sharingEl.innerHTML = Object.keys(SHARE_LABEL).filter((k) => pg.sharing_prices[k]).map((k) =>
        `<button data-share="${k}" class="px-4 py-2 rounded-lg border-2 transition-all ${k === sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/50'}">
          <p class="text-xs font-medium">${SHARE_LABEL[k]}</p><p class="text-sm font-bold">₹${inr(pg.sharing_prices[k])}</p></button>`).join('');
      const p = pg.sharing_prices[sel] || 0;
      priceEl.innerHTML = `<div class="flex items-center gap-2"><p class="text-sm text-muted-foreground line-through">₹${inr(p + 2000)}</p><span class="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">(Owner Price)</span></div>
        <div class="flex items-center gap-2"><p class="text-xl font-bold text-green-600">₹${inr(p)}/mo</p><span class="text-[10px] text-green-600 uppercase font-bold tracking-wide">(VJ Price)</span></div>`;
    };
    paintSharing();

    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); lockScroll(false); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const carousel = $('[data-carousel]', overlay);
    carousel.addEventListener('scroll', () => { const i = currentSlide(carousel); if (i !== idx) { idx = i; syncDots(overlay, idx, 'h-2 w-2', 'w-4'); } });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return close();
      const share = e.target.closest('[data-share]');
      if (share) { sel = share.dataset.share; return paintSharing(); }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const n = pg.carousel.length;
      switch (btn.dataset.act) {
        case 'close': close(); break;
        case 'prev': idx = (idx - 1 + n) % n; slideTo(carousel, idx); syncDots(overlay, idx, 'h-2 w-2', 'w-4'); break;
        case 'next': idx = (idx + 1) % n; slideTo(carousel, idx); syncDots(overlay, idx, 'h-2 w-2', 'w-4'); break;
        case 'dot': idx = Number(btn.dataset.i); slideTo(carousel, idx); syncDots(overlay, idx, 'h-2 w-2', 'w-4'); break;
        case 'book': close(); startBooking(pg, SHARE_TO_FORM[sel]); break;
      }
    });
    modalRoot().appendChild(overlay);
    lockScroll(true);
  }

  /* ---------- auth ---------- */
  let pendingAction = null;

  function openAuth(mode = 'login', reason = '') {
    let current = mode;
    const dlg = openDialog('<div data-body></div>');
    const body = $('[data-body]', dlg.el);

    const paint = () => {
      const signup = current === 'signup';
      body.innerHTML = `
        <div class="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 class="text-lg font-semibold leading-none tracking-tight">${signup ? 'Create your account' : 'Welcome back'}</h2>
          <p class="text-sm text-muted-foreground">${esc(reason) || (signup ? 'Sign up to claim your ₹2,000 discount.' : 'Log in to claim your ₹2,000 discount.')}</p>
        </div>
        <div class="vj-tabs" role="tablist" style="margin-top:1rem">
          <button class="vj-tab" role="tab" data-tab="login" aria-selected="${!signup}">Log in</button>
          <button class="vj-tab" role="tab" data-tab="signup" aria-selected="${signup}">Sign up</button>
        </div>
        <form data-form novalidate style="display:grid;gap:1rem;margin-top:1rem">
          ${signup ? `<div class="vj-field"><label class="text-sm font-medium leading-none" for="a-name">Full Name <span class="text-red-500">*</span></label><input class="vj-input" id="a-name" name="fullName" autocomplete="name" placeholder="Enter your full name" maxlength="60" required></div>` : ''}
          <div class="vj-field"><label class="text-sm font-medium leading-none" for="a-email">Email <span class="text-red-500">*</span></label><input class="vj-input" id="a-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="100" required></div>
          ${signup ? `<div class="vj-field"><label class="text-sm font-medium leading-none" for="a-phone">Phone Number <span class="text-red-500">*</span></label><input class="vj-input" id="a-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="Enter your mobile number" maxlength="10" required></div>` : ''}
          <div class="vj-field"><label class="text-sm font-medium leading-none" for="a-pass">Password <span class="text-red-500">*</span></label><input class="vj-input" id="a-pass" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'At least 8 characters' : 'Your password'}" maxlength="72" required></div>
          <div data-err class="vj-error" hidden></div>
          <button class="vj-btn" type="submit" data-submit>${signup ? 'Create account' : 'Log in'}</button>
        </form>`;
      const form = $('[data-form]', body), err = $('[data-err]', body), submit = $('[data-submit]', body);
      const phone = form.elements.phone;
      if (phone) phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });
      $$('[data-tab]', body).forEach((t) => t.addEventListener('click', () => { current = t.dataset.tab; paint(); }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(form));
        const fail = (m) => { err.textContent = m; err.hidden = false; };
        err.hidden = true;
        if (signup) {
          if ((v.fullName || '').trim().length < 2) return fail('Please enter your full name.');
          if (!/^[6-9]\d{9}$/.test(v.phone || '')) return fail('Enter a valid 10-digit Indian mobile number.');
          if ((v.password || '').length < 8) return fail('Password must be at least 8 characters.');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.email || '').trim())) return fail('Please enter a valid email address.');
        if (!v.password) return fail('Please enter your password.');
        submit.disabled = true;
        submit.innerHTML = `${icon('loader', 'h-4 w-4 vj-spin')} ${signup ? 'Creating account...' : 'Logging in...'}`;
        try {
          const data = await api(signup ? '/api/signup' : '/api/login', { method: 'POST', body: v });
          saveSession({ token: data.token, user: data.user });
          dlg.close();
          toast(signup ? `Welcome to VJ-PGs, ${data.user.fullName.split(' ')[0]}!` : `Welcome back, ${data.user.fullName.split(' ')[0]}!`);
          const next = pendingAction; pendingAction = null;
          if (next) next();
        } catch (ex) {
          fail(ex.message);
          submit.disabled = false; submit.textContent = signup ? 'Create account' : 'Log in';
        }
      });
    };
    paint();
  }

  function logout() { saveSession(null); toast('You have been logged out.'); }

  const firstName = () => (session?.user?.fullName || '').split(' ')[0];

  function renderAuthUI() {
    const desktop = $('#auth-desktop'), mobile = $('#auth-mobile');
    const html = session
      ? `<span class="text-sm font-medium text-foreground" style="max-width:9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Hi, ${esc(firstName())}</span><button type="button" class="vj-header-btn" data-auth="logout">Log out</button>`
      : `<button type="button" class="vj-header-btn" data-auth="login">Log in</button><button type="button" class="vj-header-btn primary" data-auth="signup">Sign up</button>`;
    if (desktop) desktop.innerHTML = html;
    if (mobile) mobile.innerHTML = html;
  }

  /* ---------- booking / coupon ---------- */
  function startBooking(pg, preselect) {
    if (!session) {
      pendingAction = () => startBooking(pg, preselect);
      return openAuth('login', 'Log in or sign up to claim your ₹2,000 discount token.');
    }
    openBooking(pg, preselect);
  }

  function base64ToBlob(b64, type) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  function downloadPdf(b64, filename) {
    const url = URL.createObjectURL(base64ToBlob(b64, 'application/pdf'));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function openBooking(pg, preselect) {
    const dlg = openDialog('<div data-body></div>');
    const body = $('[data-body]', dlg.el);
    const form = { fullName: session.user.fullName || '', phoneNumber: session.user.phone || '', collegeName: '', sharingType: preselect || '', whatsapp: false };
    const sharingOptions = [['Single', 'Single Sharing'], ['2 Sharing', '2 Sharing'], ['3 Sharing', '3 Sharing'], ['4 Sharing', '4 Sharing']];

    const priceFor = (sharing) => pg.sharing_prices[FORM_TO_KEY[sharing]] ?? pg.price;

    body.innerHTML = `
      <div class="flex flex-col space-y-1.5 text-center sm:text-left"><h2 class="text-lg font-semibold leading-none tracking-tight">Confirm Discount</h2>
        <p class="text-sm text-muted-foreground">${esc(pg.name)}</p></div>
      <div class="grid gap-5 py-4" data-fields>
        <div class="vj-field"><label class="text-sm font-medium leading-none" for="b-name">Full Name <span class="text-red-500">*</span></label>
          <input class="vj-input" id="b-name" placeholder="Enter your full name" maxlength="60" value="${esc(form.fullName)}" required></div>
        <div class="vj-field"><label class="text-sm font-medium leading-none" for="b-phone">Phone Number <span class="text-red-500">*</span></label>
          <input class="vj-input" id="b-phone" type="tel" inputmode="numeric" placeholder="Enter your mobile number" maxlength="10" value="${esc(form.phoneNumber)}" required>
          <p class="text-xs text-red-500">⚠️ We will verify this number via WhatsApp. Invalid numbers will lose the discount.</p>
          <div class="flex items-center space-x-2 pt-1"><input type="checkbox" id="b-wa" class="h-4 w-4 shrink-0 rounded-sm border border-primary" style="accent-color:var(--primary)">
            <label for="b-wa" class="text-sm font-medium leading-none">This is my active WhatsApp number</label></div></div>
        <div class="vj-field"><label class="text-sm font-medium leading-none" for="b-college">College Name <span class="text-red-500">*</span></label>
          <input class="vj-input" id="b-college" placeholder="Enter your college name" maxlength="80" required></div>
        <div class="vj-field"><label class="text-sm font-medium leading-none" for="b-share">Sharing Type <span class="text-red-500">*</span></label>
          <select class="vj-input vj-select" id="b-share"><option value="">Select sharing type</option>${sharingOptions.map(([v, l]) => `<option value="${v}"${v === form.sharingType ? ' selected' : ''}>${l}</option>`).join('')}</select>
          <p class="text-xs text-muted-foreground" data-priceline></p></div>
        <div data-err class="vj-error" hidden></div>
      </div>
      <button class="vj-btn" type="button" data-send disabled>Send for Verification &amp; Download</button>`;

    const q = (s) => $(s, body);
    const send = q('[data-send]'), err = q('[data-err]'), priceLine = q('[data-priceline]');
    const valid = () => form.fullName.trim() && /^[6-9]\d{9}$/.test(form.phoneNumber) && form.collegeName.trim() && form.sharingType && form.whatsapp;
    const refresh = () => {
      send.disabled = !valid();
      priceLine.textContent = form.sharingType ? `VJ price for this room: ₹${inr(priceFor(form.sharingType))}/month` : '';
    };
    q('#b-name').addEventListener('input', (e) => { form.fullName = e.target.value; refresh(); });
    q('#b-phone').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); form.phoneNumber = e.target.value; refresh(); });
    q('#b-college').addEventListener('input', (e) => { form.collegeName = e.target.value; refresh(); });
    q('#b-share').addEventListener('change', (e) => { form.sharingType = e.target.value; refresh(); });
    q('#b-wa').addEventListener('change', (e) => { form.whatsapp = e.target.checked; refresh(); });
    refresh();

    send.addEventListener('click', async () => {
      err.hidden = true; send.disabled = true;
      send.innerHTML = `${icon('loader', 'h-4 w-4 vj-spin')} Securing Token...`;
      try {
        const data = await api('/api/coupon', { method: 'POST', auth: true, body: { pgId: pg.id, sharingType: form.sharingType, fullName: form.fullName, phoneNumber: form.phoneNumber, collegeName: form.collegeName, whatsapp: true } });
        downloadPdf(data.pdfBase64, data.filename);
        showSuccess(data);
      } catch (ex) {
        if (ex.status === 401) { saveSession(null); dlg.close(); pendingAction = () => startBooking(pg, form.sharingType); return openAuth('login', 'Your session expired. Please log in again.'); }
        err.textContent = ex.message; err.hidden = false;
        send.disabled = false; send.innerHTML = 'Send for Verification &amp; Download';
      }
    });

    function showSuccess(data) {
      body.innerHTML = `
        <div class="flex flex-col space-y-1.5 text-center"><h2 class="text-lg font-semibold leading-none tracking-tight text-green-600">Booking Success!</h2></div>
        <div class="flex flex-col items-center justify-center py-6 text-center">
          <div class="mb-4 rounded-full bg-green-100 p-3">${icon('check', 'h-12 w-12 text-green-600')}</div>
          <h3 class="text-xl font-bold text-foreground">Token #${esc(data.tokenId)} Generated!</h3>
          <p class="mt-2 text-muted-foreground text-sm max-w-[280px]">${data.emailed ? 'Token sent to VJ Team! PDF Downloading...' : 'PDF Downloading... We could not email the VJ Team automatically, so please WhatsApp them this token.'}</p>
          <div class="mt-6 flex items-start gap-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-left w-full max-w-sm">
            ${icon('alert', 'h-5 w-5 text-amber-400 shrink-0 mt-0.5')}
            <div class="text-sm font-medium text-amber-800">ACTION REQUIRED: To claim your discount, you MUST take a physical printout of this token and submit it to the PG Owner during your visit.</div></div>
          <p class="mt-4 text-xs text-muted-foreground max-w-[300px]">Please check your downloads folder for <span class="font-semibold">${esc(data.filename)}</span></p>
          <button type="button" class="vj-btn vj-btn-outline" style="margin-top:1rem" data-again>Download again</button>
        </div>`;
      q('[data-again]').addEventListener('click', () => downloadPdf(data.pdfBase64, data.filename));
    }
  }

  /* ---------- wiring ---------- */
  function init() {
    renderAuthUI();
    renderListings();

    const search = $('#search-input');
    search.addEventListener('input', () => { state.search = search.value; const c = detectCollege(search.value); if (c) state.college = c; renderListings(); });
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { $('#listings').scrollIntoView({ behavior: 'smooth' }); search.blur(); } });

    $$('[data-popular]').forEach((b) => b.addEventListener('click', () => {
      const label = b.textContent.trim();
      state.search = label; search.value = label;
      const c = detectCollege(label); if (c) state.college = c;
      if (label === 'Near Cambridge') state.college = 'cambridge';
      renderListings();
      $('#listings').scrollIntoView({ behavior: 'smooth' });
    }));

    $('#f-gender').addEventListener('change', (e) => { state.gender = e.target.value; renderListings(); });
    $('#f-price').addEventListener('change', (e) => { state.price = e.target.value; renderListings(); });
    $('#f-dist').addEventListener('change', (e) => { state.dist = e.target.value; renderListings(); });
    $('#reset-filters').addEventListener('click', resetFilters);

    const grid = $('#pg-grid');
    grid.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'reset') return resetFilters();
      const card = e.target.closest('[data-pg]');
      if (!card) return;
      const entry = visiblePGs().find((x) => x.pg.id === Number(card.dataset.pg));
      if (!entry) return;
      const carousel = $('[data-carousel]', card);
      const n = entry.pg.carousel.length;
      switch (act && act.dataset.act) {
        case 'prev': return slideTo(carousel, (currentSlide(carousel) - 1 + n) % n);
        case 'next': return slideTo(carousel, (currentSlide(carousel) + 1) % n);
        case 'dot': return slideTo(carousel, Number(act.dataset.i));
        case 'confirm': return startBooking(entry.pg);
        default: return openDetails(entry.pg, entry.college); // card body or "View Details"
      }
    });
    grid.addEventListener('scroll', (e) => {
      const c = e.target;
      if (!c.matches || !c.matches('[data-carousel]')) return;
      syncDots(c.parentElement, currentSlide(c), 'h-1.5 w-1.5', 'w-3');
    }, true);

    // Header: auth buttons + mobile menu
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-auth]');
      if (!a) return;
      closeMenu();
      if (a.dataset.auth === 'logout') logout(); else openAuth(a.dataset.auth);
    });
    const menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
    function closeMenu() { menu.classList.add('hidden'); menuBtn.innerHTML = `<span class="sr-only">Open main menu</span>${icon('menu', 'h-6 w-6')}`; }
    menuBtn.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden') === false;
      menuBtn.innerHTML = `<span class="sr-only">Open main menu</span>${icon(open ? 'x' : 'menu', 'h-6 w-6')}`;
    });
    $$('a', menu).forEach((l) => l.addEventListener('click', closeMenu));

    // Validate stored session, and wake the (free-tier) backend early.
    if (API) {
      if (session) api('/api/me', { auth: true }).then((d) => saveSession({ token: session.token, user: d.user })).catch((e) => { if (e.status === 401) saveSession(null); });
      else fetch(API + '/api/health').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

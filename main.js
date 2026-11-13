(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- colour mode: dark by default, the toggle switches to light ---------- */
  const dark = () => root.dataset.mode !== 'light';
  try { const t = localStorage.getItem('prism-mode'); if (t) root.dataset.mode = t; } catch (e) {}

  /* ---------- recordings follow the colour mode and play only while on screen ---------- */
  const clips = $$('video[data-base]');
  const loadClip = (v) => {
    const mode = dark() ? 'dark' : 'light', src = `assets/demos/${v.dataset.base}-${mode}.mp4`;
    v.poster = `assets/screens/${v.dataset.base}-${mode}.jpg`;
    if (!v.src.endsWith(src)) v.src = src;
  };
  clips.forEach(loadClip);
  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target; v.dataset.on = e.isIntersecting ? '1' : '';
    e.isIntersecting && !reduced ? v.play().catch(() => {}) : v.pause();
  }), { threshold: 0.35 });
  clips.forEach((v) => vio.observe(v));

  $('#theme').addEventListener('click', () => {
    root.dataset.mode = dark() ? 'light' : 'dark';
    try { localStorage.setItem('prism-mode', root.dataset.mode); } catch (e) {}
    clips.forEach((v) => { loadClip(v); if (v.dataset.on && !reduced) v.play().catch(() => {}); });
  });

  /* ---------- hero: rotating last word ---------- */
  const rotor = $('#rotor');
  const words = ['Investors', 'Traders', 'Analysts', 'Researchers'];
  // The word box is as wide as the longest word, so "The Workspace for" stays still and only the last word changes.
  const widthOf = (x) => { const m = rotor.cloneNode(); m.removeAttribute('id'); m.style.cssText = 'position:absolute;visibility:hidden;width:auto;transition:none'; m.textContent = x; rotor.parentNode.appendChild(m); const w = m.getBoundingClientRect().width; m.remove(); return w; };
  let wi = 0;
  const fit = () => {
    rotor.style.width = Math.ceil(Math.max(...words.map(widthOf))) + 'px';
    // The heading now has a fixed width; the map uses it (--hero-w) to stay clear of the text on wide screens.
    const h1 = rotor.closest('h1');
    if (h1) root.style.setProperty('--hero-w', Math.ceil(h1.getBoundingClientRect().width) + 'px');
  };
  if (rotor) { document.fonts.ready.then(fit); addEventListener('resize', fit); }
  if (rotor && !reduced) {
    setInterval(() => {
      rotor.classList.add('out');
      setTimeout(() => { wi = (wi + 1) % words.length; rotor.textContent = words[wi]; fit(); rotor.classList.remove('out'); }, 350);
    }, 2400);
  }

  /* ---------- tab helper: one selected button per list ---------- */
  const tabs = (list, onPick) => $$('[role=tab]', list).forEach((t) => t.addEventListener('click', () => {
    $$('[role=tab]', list).forEach((x) => x.setAttribute('aria-selected', x === t));
    onPick(t);
  }));

  /* ---------- feature blocks: a tab list and the product in action, whatever the format ---------- */
  const LOOP = 6200;
  $$('[data-show]').forEach((duo) => {
    let timers = [];
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    // A coded demo plays its steps at their data-t times, holds, then restarts.
    const playDemo = () => {
      stop();
      // A recorded video restarts when its tab is shown; videos in hidden tabs are paused.
      if (!duo._modeWired) { duo._modeWired = true; $('#theme').addEventListener('click', () => setTimeout(playDemo, 80)); }
      $$('.reel video', duo).forEach((v) => v.pause());
      $$('.duo-panel:not([hidden]) .reel video', duo).forEach((v) => {
        if (v.offsetParent === null || reduced) return;      // the other colour mode's copy, or motion turned off
        if (v.dataset.fast && !v._fast) {                    // a stretch spent waiting on the server plays faster
          v._fast = true; const [fa, fb, fr] = v.dataset.fast.split(',').map(Number);
          v.addEventListener('timeupdate', () => { const r = (v.currentTime > fa && v.currentTime < fb) ? fr : 1; if (v.playbackRate !== r) v.playbackRate = r; });
        }
        try { v.currentTime = 0; } catch (e) {}
        v.play().catch(() => {});
      });
      // A recorded demo steps through its frames (the real interface), holds on the last, then loops.
      const reel = $('.duo-panel:not([hidden]) .reel', duo);
      if (reel && reel.dataset.ms) {
        const ms = reel.dataset.ms.split(',').map(Number), frames = $$('img', reel), dots = $$('.reel-dots i', reel);
        let i = reduced ? ms.length - 1 : 0;
        const show = () => {
          frames.forEach((im) => im.classList.toggle('on', +im.dataset.f === i + 1));
          dots.forEach((dt, k) => dt.classList.toggle('on', k === i));
          if (!reduced) timers.push(setTimeout(() => { i = (i + 1) % ms.length; show(); }, ms[i]));
        };
        show();
      }
      const d = $('.duo-panel:not([hidden]) .demo', duo);
      if (!d || reduced) return;
      const steps = $$('[data-t]', d);
      d.classList.add('run');
      steps.forEach((el) => el.classList.remove('in'));
      steps.forEach((el) => timers.push(setTimeout(() => el.classList.add('in'), +el.dataset.t)));
      timers.push(setTimeout(() => steps.forEach((el) => el.classList.remove('in')), LOOP - 450));
      timers.push(setTimeout(playDemo, LOOP));
    };
    tabs($('[role=tablist]', duo), (t) => {
      $$('.duo-panel', duo).forEach((p) => { p.hidden = p.id !== t.getAttribute('aria-controls'); });
      playDemo();
    });
    new IntersectionObserver(([e]) => { e.isIntersecting ? playDemo() : stop(); }, { threshold: 0.2 }).observe(duo);
  });

  /* ---------- section headings type themselves out the first time they scroll into view ---------- */
  if (!reduced) $$('section .head h2').forEach((h) => {
    const nodes = [];
    const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) nodes.push([walk.currentNode, walk.currentNode.textContent]);
    const total = nodes.reduce((n, [, t]) => n + t.length, 0);
    h.style.minHeight = h.offsetHeight + 'px';            // hold the space so nothing below jumps
    nodes.forEach(([n]) => { n.textContent = ''; });
    new IntersectionObserver(([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      h.classList.add('typing');
      let k = 0;
      const t = setInterval(() => {
        k++;
        let left = k;
        nodes.forEach(([n, full]) => { n.textContent = full.slice(0, Math.max(0, left)); left -= full.length; });
        if (k >= total) { clearInterval(t); h.style.minHeight = ''; setTimeout(() => h.classList.remove('typing'), 900); }
      }, Math.min(38, 1900 / total));          // long headings type faster, so none takes over two seconds
    }, { threshold: 0.6 }).observe(h);
  });

  /* ---------- Spectra disclaimer: a small button that shows the note ---------- */
  const disc = $('#disc-btn');
  if (disc) disc.addEventListener('click', () => {
    const t = $('#disc-text'); t.hidden = !t.hidden; disc.setAttribute('aria-expanded', !t.hidden);
  });

  /* ---------- intelligence: the themes revolve while the board is on screen ---------- */
  const td = $('#themes-demo');
  if (td) {
    const chips = $$('.theme-grid span', td), card = $('.theme-card', td);
    let k = 0, timer = null;
    const show = (n) => {
      k = n;
      chips.forEach((c, i) => c.classList.toggle('on', i === n));
      $('#th-n').textContent = `Theme ${n + 1} of ${chips.length}`;
      $('#th-name').textContent = chips[n].textContent;
      $('#th-focus').textContent = chips[n].dataset.focus;
    };
    const next = () => {
      card.classList.add('swap');
      setTimeout(() => { show((k + 1) % chips.length); card.classList.remove('swap'); }, 250);
    };
    new IntersectionObserver(([e]) => {
      clearInterval(timer); timer = null;
      if (e.isIntersecting && !reduced) timer = setInterval(next, 1800);
    }, { threshold: 0.3 }).observe(td);
  }


  /* ---------- data marquee: duplicate each row once for a seamless loop ---------- */
  $$('.marquee-row').forEach((row) => {
    $$('.tag', row).forEach((t) => {
      const c = t.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      row.appendChild(c);
    });
  });

  /* ---------- icons: <i data-icon="name"> → inline SVG from icons.js (Lucide, ISC) ---------- */
  const ICONS = window.PRISM_ICONS || {};
  $$('i[data-icon]').forEach((el) => {
    const body = ICONS[el.dataset.icon];
    if (body) el.outerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  });

  /* ---------- FAQ: Spectra answers the question you pick ---------- */
  const faqBody = $('#faq-body');
  if (faqBody) {
    let run = 0;
    const answer = (btn, animate) => {
      const my = ++run, html = btn.nextElementSibling.innerHTML;
      $$('.fq').forEach((b) => b.setAttribute('aria-pressed', b === btn));
      faqBody.innerHTML = `<p class="spx-q${animate ? ' spx-fade' : ''}">${btn.textContent}</p><div class="spx-a"></div>`;
      const out = $('.spx-a', faqBody);
      if (!animate || reduced) { out.innerHTML = html; return; }
      // Type plain-text answers word by word; answers with lists fade in whole.
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      if (tmp.querySelector('ul')) { out.innerHTML = html; out.classList.add('spx-fade'); return; }
      const ws = tmp.textContent.trim().split(/\s+/);
      out.classList.add('spx-caret');
      let n = 0;
      setTimeout(function step() {
        if (my !== run) return;
        out.textContent = ws.slice(0, n += 2).join(' ');
        if (n < ws.length) return setTimeout(step, 40);
        out.classList.remove('spx-caret'); out.innerHTML = html;
      }, 400);
    };
    // A sample question types itself into the Spectra box; the button then opens the dashboard to ask it.
    const ask = $('#spx-ask');
    if (ask) { let tr = 0; $$('.spx-chip').forEach((c) => c.addEventListener('click', () => {
      const my = ++tr, q = c.textContent, sp = $('span', ask);
      $$('.spx-chip').forEach((x) => x.setAttribute('aria-pressed', x === c));
      ask.classList.add('filled'); $('b', ask).textContent = 'Ask in the Dashboard';
      if (reduced) { sp.textContent = q; return; }
      let n = 0; (function step() { if (my !== tr) return; sp.textContent = q.slice(0, ++n); if (n < q.length) setTimeout(step, 18); })();
    })); }
    $$('.fq').forEach((b) => b.addEventListener('click', () => answer(b, true)));
    answer($('.fq'), false);
  }

  /* ---------- digest pop-up ---------- */
  const panel = $('#digest-panel'), btn = $('#digest-btn');
  const setOpen = (o) => { panel.hidden = !o; btn.setAttribute('aria-expanded', o); };
  btn.addEventListener('click', () => setOpen(panel.hidden));
  $('#digest-close').addEventListener('click', () => setOpen(false));
  tabs($('.digest .seg'), (t) => $$('[data-dv]').forEach((c) => { c.hidden = c.dataset.dv !== t.dataset.d; }));

  /* ---------- India dot map behind the hero ---------- */
  const D = window.INDIA_DOTS, svg = $('#india');
  if (D && svg) {
    const S = 10;
    svg.setAttribute('viewBox', `-4 -4 ${D.w * S + 8} ${D.h * S + 8}`);
    svg.innerHTML = Object.entries(D.s).map(([state, s]) => {
      let c = '';
      for (let i = 0; i < s.length; i += 4) {
        // About one dot in twelve pulses a lighter grey, each on its own delay.
        const tw = Math.random() < 0.08 ? ` class="tw" style="--d:-${(Math.random() * 3.6).toFixed(2)}s"` : '';
        c += `<circle cx="${+s.slice(i, i + 2) * S}" cy="${+s.slice(i + 2, i + 4) * S}" r="2.9"${tw}/>`;
      }
      return `<g data-state="${state}">${c}</g>`;
    }).join('');

    // Real state borders under the dots (india-states.js), so each state reads as its own shape.
    if (window.INDIA_STATES) {
      svg.insertAdjacentHTML('afterbegin', `<g class="states">${Object.entries(window.INDIA_STATES)
        .map(([st, d]) => `<path data-st="${st}" d="${d}"/>`).join('')}</g>`);
    }

    // Live layer: the big cities pulse, and a signal travels along the links between them.
    const dots = [...svg.querySelectorAll('circle')];
    const at = (lon, lat) => {
      const x = (lon - 68) / 0.42 * S, y = (37.3 - lat) / 0.42 * S;
      let best = dots[0], bd = Infinity;
      dots.forEach((c) => { const d = (c.cx.baseVal.value - x) ** 2 + (c.cy.baseVal.value - y) ** 2; if (d < bd) { bd = d; best = c; } });
      return [best.cx.baseVal.value, best.cy.baseVal.value];
    };
    const C = { mum: at(72.9, 19.1), del: at(77.2, 28.6), blr: at(77.6, 13.0), kol: at(88.4, 22.6), hyd: at(78.5, 17.4), chn: at(80.3, 13.1), amd: at(72.6, 23.0), guw: at(91.7, 26.1) };
    const links = [['mum', 'del'], ['del', 'kol'], ['mum', 'blr'], ['hyd', 'chn'], ['amd', 'hyd'], ['kol', 'guw'], ['del', 'hyd']];
    let live = links.map(([a, b], i) => {
      const [x1, y1] = C[a], [x2, y2] = C[b], mx = (x1 + x2) / 2 - (y2 - y1) * 0.18, my = (y1 + y2) / 2 + (x2 - x1) * 0.18;
      const d = `M${x1} ${y1} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2} ${y2}`;
      return `<path class="link" d="${d}"/><path class="spark" pathLength="1" d="${d}" style="--t:${(4.2 + (i % 3) * 0.9).toFixed(1)}s;--d:-${(i * 1.3).toFixed(1)}s"/>`;
    }).join('');
    live += Object.values(C).map(([x, y], i) =>
      `<g style="--d:-${(i * 0.45).toFixed(2)}s"><circle class="ring" cx="${x}" cy="${y}" r="4"/><circle class="ring r2" cx="${x}" cy="${y}" r="4"/><circle class="core" cx="${x}" cy="${y}" r="4.4"/></g>`).join('');
    svg.insertAdjacentHTML('beforeend', live);

    /* ---------- city photos behind the hero, with a pin on the map for each ----------
       To add a city: put a day and a night photo in assets/ and add one line here (lon/lat of the place). */
    const PLACES = [
      // `data` is the line under the city on the map: what PRISM tracks there, not the landmark in the photo.
      // dayPos / nightPos: which part of the photo to keep on narrow (phone) screens, so the landmark stays in view.
      { city: 'Mumbai', state: 'Maharashtra', place: 'Bandra-Worli Sea Link', data: 'Exchange filings · Mutual fund flows', lon: 72.82, lat: 19.04, day: 'mumbai-sealink.jpg', night: 'mumbai-sealink-night.jpg', dayPos: '55%', nightPos: '24%' },
      { city: 'Kolkata', state: 'West Bengal', place: 'Howrah Bridge', data: 'Port cargo · Power demand', lon: 88.35, lat: 22.59, day: 'kolkata-dusk.jpg', night: 'kolkata-night.jpg', dayPos: '30%', nightPos: '30%' },
      { city: 'Bengaluru', state: 'Karnataka', place: 'City skyline', data: 'Tech hiring · UPI spending', lon: 77.59, lat: 12.97, day: 'bengaluru-day.jpg', night: 'bengaluru-night.jpg', dayPos: '84%', nightPos: '90%' },
    ];
    const photos = $('#hero-photos'), pinSvg = $('#india-pin'), caption = $('#hero-place');
    if (photos && pinSvg) {
      pinSvg.setAttribute('viewBox', svg.getAttribute('viewBox'));
      pinSvg.innerHTML = `<g class="pin" id="pin"><circle class="pin-ring" r="7"/><circle class="pin-ring p2" r="7"/>
        <circle class="pin-dot" r="7.5"/><circle class="pin-eye" r="2.6"/>
        <g class="pin-tag"><path class="pin-lead" d="M-12 0H-26"/><rect class="pin-box" x="-160" y="-17" width="134" height="34" rx="17"/>
        <text class="pin-city" x="-40" y="-1" text-anchor="end"></text><text class="pin-name" x="-40" y="11" text-anchor="end"></text></g></g>`;
      const pin = $('#pin', pinSvg), box = $('.pin-box', pinSvg), city = $('.pin-city', pinSvg), name = $('.pin-name', pinSvg);
      PLACES.forEach((p) => { p.xy = at(p.lon, p.lat); });
      photos.innerHTML = PLACES.map((p, i) => `<figure${i ? '' : ' class="on"'}><img alt="" decoding="async"${i ? ' loading="lazy"' : ''}></figure>`).join('');
      const figs = $$('figure', photos);
      const setSrcs = () => figs.forEach((f, i) => {
        const p = PLACES[i], img = f.firstChild;
        img.src = `assets/${dark() ? p.night : p.day}`;
        img.style.setProperty('--pos', dark() ? p.nightPos : p.dayPos);
      });
      setSrcs();
      $('#theme').addEventListener('click', setSrcs);

      let cur = 0;
      const show = (i) => {
        const p = PLACES[i];
        figs.forEach((f, k) => f.classList.toggle('on', k === i));
        pin.style.transform = `translate(${p.xy[0]}px, ${p.xy[1]}px)`;
        svg.querySelectorAll('g[data-state],path[data-st]').forEach((g) => g.classList.toggle('on', (g.dataset.state || g.dataset.st) === p.state));
        city.textContent = `${p.city}, ${p.state}`; name.textContent = p.data;
        // size the label to its text
        const w = Math.max(city.getComputedTextLength(), name.getComputedTextLength()) + 32;
        box.setAttribute('x', -26 - w); box.setAttribute('width', w);
        city.setAttribute('x', -26 - w + 16); city.setAttribute('text-anchor', 'start');
        name.setAttribute('x', -26 - w + 16); name.setAttribute('text-anchor', 'start');
        pin.classList.remove('arrive'); void pin.getBBox(); pin.classList.add('arrive');
        if (caption) caption.querySelector('span').textContent = `${p.city}, ${p.state} · ${p.data}`;
      };
      document.fonts.ready.then(() => show(0));
      show(0);
      if (!reduced) setInterval(() => { if (!document.hidden) show(cur = (cur + 1) % PLACES.length); }, 5200);
    }
  }

  /* ---------- warm the tabs: fetch each section's screens and videos before it is on screen ---------- */
  {
    const warm = (sec) => {
      const cls = dark() ? 'show-dark' : 'show-light', other = dark() ? 'show-light' : 'show-dark';
      $$('img', sec).forEach((im) => {
        if (im.classList.contains(other) || im.dataset.warm === cls) return;
        im.dataset.warm = cls; im.loading = 'eager';
        const pre = new Image(); pre.decoding = 'async'; pre.src = im.getAttribute('src');
        if (pre.decode) pre.decode().catch(() => {});
      });
      $$('video', sec).forEach((v) => { if (!v.classList.contains(other) && v.preload !== 'auto') { v.preload = 'auto'; if (v.readyState === 0) v.load(); } });
    };
    const secs = ['#spectra', '#context', '#tools'].map((s) => $(s)).filter(Boolean), seen = new Set();
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { seen.add(e.target); warm(e.target); } }), { rootMargin: '1400px 0px' });
    secs.forEach((s) => io.observe(s));
    new MutationObserver(() => seen.forEach(warm)).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  }
})();

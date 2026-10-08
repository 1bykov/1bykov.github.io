(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  /* Split headings into letters */
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    let i = 0;
    const words = text.split(' ');
    words.forEach((w, wi) => {
      const word = document.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      for (const c of w) {
        const mask = document.createElement('span');
        mask.className = 'ch-mask';
        const ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = c;
        ch.style.setProperty('--i', i++);
        mask.appendChild(ch);
        word.appendChild(mask);
      }
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* Split paragraphs into words for the scroll-linked reveal */
  document.querySelectorAll('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* Reveal on scroll */
  const targets = document.querySelectorAll('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((t) => io.observe(t));
  } else {
    targets.forEach((t) => t.classList.add('in'));
  }

  /* Scroll-linked motion */
  const heroName = document.querySelector('.hero-name');
  const heroMasks = heroName ? [...heroName.querySelectorAll('.ch-mask')] : [];
  const portrait = document.querySelector('.hero-portrait img');
  const wordBlocks = [...document.querySelectorAll('[data-words]')];
  const drifts = [...document.querySelectorAll('[data-drift]')];
  let ticking = false;

  function frame() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (heroMasks.length) {
      const p = Math.min(1, y / (vh * 0.9));
      const mid = (heroMasks.length - 1) / 2;
      heroMasks.forEach((m, i) => {
        const d = Math.abs(i - mid) / mid;
        const k = 0.25 + 0.75 * (1 - Math.cos((d * Math.PI) / 2));
        m.style.transform = `translate3d(0, ${(-p * k * 46).toFixed(2)}vh, 0)`;
      });
    }
    if (portrait) portrait.style.transform = `translate3d(0, ${(-Math.min(y, vh) * 0.08).toFixed(1)}px, 0)`;

    wordBlocks.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (vh * 0.86 - r.top) / (r.height + vh * 0.36);
      const ws = el.children;
      const on = Math.round(Math.max(0, Math.min(1, p)) * ws.length);
      for (let i = 0; i < ws.length; i++) ws[i].classList.toggle('on', i < on);
    });

    drifts.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0, ${(p * -40).toFixed(1)}px, 0)`;
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  if (!reduce) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
  }

  /* Mobile menu */
  const btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const open = root.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Close' : 'Menu';
    });
  }

  /* Page transitions */
  const curtain = document.querySelector('.curtain');
  const curtainLabel = document.querySelector('.curtain-label');
  const ready = () => root.classList.add('ready');

  if (!reduce && curtain) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (!/(\/|\.html)$/.test(url.pathname)) return;
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      const label = a.dataset.label || a.textContent.trim();
      curtainLabel.textContent = label;
      store.set('nav', label);
      root.classList.remove('entering', 'entered');
      root.classList.add('leaving');
      setTimeout(() => { location.href = url.href; }, 620);
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) { root.classList.remove('leaving', 'entering', 'entered', 'menu-open'); ready(); }
    });
  }

  /* Entry: curtain lift, first-visit loader, or straight in */
  const loader = document.querySelector('.loader');
  if (root.classList.contains('entering') && curtain && !reduce) {
    curtainLabel.textContent = store.get('nav') || '';
    store.del('nav');
    requestAnimationFrame(() => {
      setTimeout(() => {
        root.classList.add('entered');
        setTimeout(ready, 250);
        setTimeout(() => root.classList.remove('entering', 'entered'), 950);
      }, 140);
    });
  } else if (root.classList.contains('loading') && loader && !reduce) {
    const count = loader.querySelector('.loader-count');
    const t0 = performance.now();
    const dur = 1100;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      count.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (p < 1) return requestAnimationFrame(tick);
      store.set('seen', '1');
      loader.classList.add('out');
      setTimeout(ready, 200);
      setTimeout(() => root.classList.remove('loading'), 1000);
    })(t0);
  } else {
    root.classList.remove('entering', 'loading');
    store.del('nav');
    ready();
  }
})();

(() => {
  const host = document.querySelector('.sphere');
  if (!host) return;
  const canvas = host.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FG = '241,240,236';
  const ACC = '167,139,250';
  const MUTE = '143,142,137';
  const FONT = '"Inter Tight","Helvetica Neue",Helvetica,Arial,sans-serif';
  const fav = (d, s) => `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${d}&size=${s || 128}`;

  const sections = [
    { id: 'experience', label: 'Experience', url: 'experience.html', kids: [
      { id: 'cci', label: 'Castleton', sub: 'Power Summer Analyst, 2026', url: 'experience.html#castleton', logo: fav('cci.com'), ext: 'https://www.cci.com' },
      { label: 'Crédit Agricole CIB', sub: 'Corporate Structuring, 2024 to 2025', url: 'experience.html#cacib', logo: fav('ca-cib.com'), ext: 'https://www.ca-cib.com' },
      { label: 'PetroIneos', sub: 'Power Desk Data, 2024', url: 'experience.html#petroineos', logo: fav('petroineos.com'), ext: 'https://www.petroineos.com' },
      { label: 'Aon', sub: 'Capital Modelling, 2023', url: 'experience.html#aon', logo: fav('aon.com'), ext: 'https://www.aon.com' },
      { label: 'VINCI Airports', sub: 'Student Consultant, 2026', url: 'experience.html#vinci', logo: fav('vinci-airports.com'), ext: 'https://www.vinci-airports.com' },
      { id: 'hec', label: 'HEC Paris', sub: 'MSc International Finance', url: 'experience.html#hec', logo: 'https://www.hec.edu/themes/custom/hec_theme/logo.svg', ext: 'https://www.hec.edu' },
      { id: 'ucl', label: 'UCL', sub: 'BSc Physics', url: 'experience.html#ucl', logo: fav('ucl.ac.uk', 256), ext: 'https://www.ucl.ac.uk' }
    ] },
    { id: 'projects', label: 'Projects', url: 'projects.html', kids: [
      { id: 'pipeline', label: 'EU Power Pipeline', sub: 'Data and forecasting', url: 'projects.html#pipeline' },
      { id: 'pricer', label: 'Options Pricer', sub: 'Black-76 and Monte Carlo', url: 'projects.html#pricer' },
      { id: 'remit', label: 'REMIT Aggregator', sub: 'GB outage signals', url: 'projects.html#remit' },
      { label: 'Jellyfish Blooms', sub: 'Outage risk, in progress', url: 'projects.html#jellyfish' },
      { id: 'hecthesis', label: 'Utility Debt Hedging', sub: "Master's thesis", url: 'projects.html#thesis-hec' },
      { id: 'uclthesis', label: 'EV Battery Storage', sub: "Bachelor's thesis", url: 'projects.html#thesis-ucl' }
    ] },
    { id: 'tutoring', label: 'Tutoring', url: 'tutoring.html', kids: [
      { label: 'Economics', sub: 'IB', url: 'tutoring.html#economics' },
      { label: 'Business', sub: 'IB and A-Level', url: 'tutoring.html#business' },
      { id: 'physics', label: 'Physics', sub: 'To undergraduate', url: 'tutoring.html#physics' },
      { label: 'Maths', sub: 'To undergraduate', url: 'tutoring.html#maths' },
      { label: '2,000+ hours', sub: 'Teaching since 2022', url: 'tutoring.html' },
      { label: 'Speaking', sub: 'Children for a Better World', url: 'tutoring.html#speaking' }
    ] },
    { id: 'cv', label: 'CV', url: 'cv.html', kids: [
      { label: 'Download PDF', sub: 'One page', url: 'Igor-Bykov-CV.pdf', file: true },
      { label: 'Languages', sub: 'Russian, English, French', url: 'cv.html#languages' },
      { label: 'Certifications', sub: 'MENNTA, CME Group', url: 'cv.html#certifications' },
      { id: 'tools', label: 'Tools', sub: 'Python, Bloomberg, SQL', url: 'cv.html#tools' }
    ] }
  ];
  const cross = [['hec', 'hecthesis'], ['ucl', 'uclthesis'], ['ucl', 'physics'], ['tools', 'pipeline'], ['tools', 'pricer'], ['tools', 'remit'], ['cci', 'pipeline']];

  /* ---------- vector helpers ---------- */
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const crossP = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const mul = (A, B) => {
    const C = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return C;
  };
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const apply = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];

  /* ---------- build graph ---------- */
  const nodes = [];
  const edges = [];
  const byId = {};
  const add = (n) => { n.i = nodes.length; n.hs = 1; n.nb = new Set(); nodes.push(n); if (n.id) byId[n.id] = n; return n; };
  const link = (a, b) => { edges.push([a, b]); a.nb.add(b); b.nb.add(a); };

  const hub = add({ id: 'me', label: 'Igor Bykov', p: [0, 0, 0], kind: 'hub', img: 'igor-bykov.jpg' });
  const dirs = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norm);
  sections.forEach((s, si) => {
    const d = dirs[si];
    const sec = add({ id: s.id, label: s.label, url: s.url, p: d, kind: 'sec' });
    link(hub, sec);
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm(crossP(d, up));
    const v = crossP(d, u);
    const n = s.kids.length;
    const th = n > 5 ? 0.62 : 0.52;
    s.kids.forEach((k, ki) => {
      const a = (ki / n) * Math.PI * 2 + si * 0.7;
      const t = th * (ki % 2 ? 1.12 : 0.9);
      const p = norm([
        d[0] * Math.cos(t) + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * Math.sin(t),
        d[1] * Math.cos(t) + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * Math.sin(t),
        d[2] * Math.cos(t) + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * Math.sin(t)
      ]);
      const kid = add(Object.assign({ p, kind: 'kid', parent: sec }, k));
      link(sec, kid);
    });
  });
  cross.forEach(([a, b]) => { if (byId[a] && byId[b]) link(byId[a], byId[b]); });

  const dust = [];
  const N = 240;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    dust.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }

  nodes.forEach((n) => {
    const src = n.logo || n.img;
    if (!src) return;
    const im = new Image();
    im.referrerPolicy = 'no-referrer';
    im.onload = () => { n.image = im; };
    im.src = src;
  });

  /* ---------- state ---------- */
  let W = 0, H = 0, dpr = 1, RAD = 100, small = false;
  let R = mul(rotX(-0.32), rotY(0.6));
  let vx = 0, vy = 0;
  let dragging = false, moved = 0, lx = 0, ly = 0, pid = null;
  let hover = null, hoverPart = 'dot', focusNode = null;
  let press = 1, appear = 0, visible = false, running = false;
  let mx = -1, my = -1;

  function resize() {
    const b = host.getBoundingClientRect();
    W = b.width; H = b.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    small = W < 720;
    RAD = small ? Math.min(W * 0.36, H * 0.34) : Math.min(W * 0.3, H * 0.38);
  }

  function project(p, k) {
    const q = apply(R, p);
    const s = 3 / (3 - q[2]);
    return { x: W / 2 + q[0] * RAD * s * k, y: H / 2 - q[1] * RAD * s * k, z: q[2], s };
  }

  let part = 'dot';
  function hit(x, y) {
    let best = null, bz = -9;
    for (const n of nodes) {
      if (!n.scr) continue;
      const r = Math.max(n.rad * 1.25, small ? 20 : 16);
      if (Math.hypot(x - n.scr.x, y - n.scr.y) < r && n.scr.z > bz) { best = n; bz = n.scr.z; part = 'dot'; }
    }
    if (best) return best;
    for (const n of nodes) {
      const b = n.lb;
      if (b && x > b[0] && x < b[1] && y > b[2] && y < b[3] && n.scr.z > bz) { best = n; bz = n.scr.z; part = 'label'; }
    }
    return best;
  }

  const easeOutBack = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);

    /* motion */
    const active = hover || focusNode;
    if (!dragging) {
      const idle = reduce || active ? 0 : 0.0016;
      R = mul(mul(rotY(vx + idle), rotX(vy)), R);
      vx *= 0.94; vy *= 0.94;
    }
    press += ((dragging ? 0.95 : 1) - press) * 0.16;
    if (visible && appear < 1) appear = Math.min(1, appear + (reduce ? 1 : 0.018));
    const k = easeOutBack(appear) * press;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    /* glow */
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, RAD * 1.7);
    g.addColorStop(0, `rgba(${ACC},${0.13 * appear})`);
    g.addColorStop(0.55, `rgba(${ACC},${0.04 * appear})`);
    g.addColorStop(1, `rgba(${ACC},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* dust */
    for (const d of dust) {
      const s = project(d, k);
      const t = (s.z + 1) / 2;
      ctx.fillStyle = `rgba(${FG},${(0.05 + 0.3 * t * t) * appear})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (0.6 + t) * s.s, 0, 6.283);
      ctx.fill();
    }

    /* project nodes */
    for (const n of nodes) {
      n.scr = project(n.p, k);
      const lit = active && (n === active || active.nb.has(n));
      n.lit = !!lit;
      n.dim = active && !lit;
      n.hs += ((n === active ? 1.45 : lit ? 1.12 : 1) - n.hs) * 0.2;
      const base = n.kind === 'hub' ? (small ? 26 : 38) : n.kind === 'sec' ? (small ? 7 : 9) : n.logo ? (small ? 11 : 15) : (small ? 3.5 : 4.5);
      n.rad = base * n.scr.s * n.hs * (0.4 + 0.6 * appear);
      n.t = (n.scr.z + 1) / 2;
    }

    /* edges */
    for (const [a, b] of edges) {
      const on = active && (a === active || b === active);
      const t = (a.t + b.t) / 2;
      ctx.beginPath();
      ctx.moveTo(a.scr.x, a.scr.y);
      ctx.lineTo(b.scr.x, b.scr.y);
      if (on) {
        ctx.strokeStyle = `rgba(${ACC},0.95)`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = `rgba(${ACC},0.9)`;
        ctx.shadowBlur = 14;
      } else {
        ctx.strokeStyle = `rgba(${FG},${(active ? 0.04 : 0.07 + 0.2 * t) * appear})`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    /* nodes, back to front */
    const order = nodes.slice().sort((a, b) => a.scr.z - b.scr.z);
    for (const n of order) {
      const { x, y } = n.scr;
      let al = (n.kind === 'hub' ? 1 : 0.3 + 0.7 * n.t) * appear;
      if (n.dim) al *= 0.22;
      ctx.globalAlpha = al;
      if (n.lit) { ctx.shadowColor = `rgba(${ACC},0.95)`; ctx.shadowBlur = 22; }

      if (n.image) {
        ctx.beginPath();
        ctx.arc(x, y, n.rad, 0, 6.283);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.clip();
        const iw = n.image.naturalWidth || 1, ih = n.image.naturalHeight || 1;
        if (n.kind === 'hub') {
          const sc = (n.rad * 2) / Math.min(iw, ih) * 1.05;
          try { ctx.filter = 'grayscale(1)'; } catch (e) {}
          ctx.drawImage(n.image, x - (iw * sc) / 2, y - (ih * sc) * 0.44, iw * sc, ih * sc);
          try { ctx.filter = 'none'; } catch (e) {}
        } else {
          const box = n.rad * 1.24;
          const sc = box / Math.max(iw, ih);
          ctx.drawImage(n.image, x - (iw * sc) / 2, y - (ih * sc) / 2, iw * sc, ih * sc);
        }
        ctx.restore();
        if (n.kind === 'hub' || n.lit) {
          ctx.beginPath();
          ctx.arc(x, y, n.rad + 3, 0, 6.283);
          ctx.strokeStyle = n.lit ? `rgba(${ACC},1)` : `rgba(${FG},0.5)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x, y, n.rad, 0, 6.283);
        ctx.fillStyle = n.lit && n === active ? `rgb(${ACC})` : `rgb(${FG})`;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (n.kind === 'sec') {
          ctx.beginPath();
          ctx.arc(x, y, n.rad + 5 * n.hs, 0, 6.283);
          ctx.strokeStyle = n.lit ? `rgba(${ACC},0.9)` : `rgba(${FG},0.45)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      /* labels */
      n.lb = null;
      if (n.kind === 'hub') continue;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (n.kind === 'sec') {
        const px = (small ? 19 : 30) * (0.75 + 0.25 * n.scr.s) * (n === active ? 1.12 : 1);
        ctx.font = `500 ${px.toFixed(1)}px ${FONT}`;
        ctx.fillStyle = `rgb(${FG})`;
        ctx.fillText(n.label, x, y + n.rad + 10);
        const tw = ctx.measureText(n.label).width / 2 + 8;
        n.lb = [x - tw, x + tw, y + n.rad + 4, y + n.rad + 14 + px];
      } else {
        let la = n.lit ? 1 : Math.max(0, Math.min(1, (n.t - (small ? 0.62 : 0.4)) / 0.3));
        if (n.dim) la = 0;
        if (la > 0.02) {
          ctx.globalAlpha = la * appear;
          const px = (small ? 11.5 : 13.5) * (n === active ? 1.15 : 1);
          ctx.font = `500 ${px}px ${FONT}`;
          ctx.fillStyle = `rgb(${FG})`;
          ctx.fillText(n.label, x, y + n.rad + 7);
          const tw = ctx.measureText(n.label).width / 2 + 8;
          if (la > 0.5) n.lb = [x - tw, x + tw, y + n.rad + 2, y + n.rad + 12 + px];
          const sub = n === hover && hoverPart === 'dot' && n.ext ? 'Open ' + n.ext.replace('https://www.', '') : n.sub;
          if (n === active && sub) {
            ctx.font = `400 ${small ? 11 : 12.5}px ${FONT}`;
            ctx.fillStyle = `rgb(${MUTE})`;
            ctx.fillText(sub, x, y + n.rad + 9 + px * 1.25);
          }
        }
      }
    }
    ctx.globalAlpha = 1;

    if (!dragging && mx >= 0) {
      const h = hit(mx, my);
      hover = h && h.kind !== 'hub' ? h : null;
      hoverPart = part;
      host.classList.toggle('point', !!hover);
    }
  }

  /* ---------- input ---------- */
  const pos = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; pid = e.pointerId;
    [lx, ly] = pos(e); mx = lx; my = ly;
    vx = vy = 0;
    try { canvas.setPointerCapture(pid); } catch (err) {}
    host.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = pos(e);
    mx = x; my = y;
    if (!dragging) return;
    const dx = x - lx, dy = y - ly;
    lx = x; ly = y;
    moved += Math.abs(dx) + Math.abs(dy);
    const f = 0.0052;
    R = mul(mul(rotY(dx * f), rotX(dy * f)), R);
    vx = dx * f; vy = dy * f;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    host.classList.remove('grabbing');
    try { canvas.releasePointerCapture(pid); } catch (err) {}
    if (e.type === 'pointerup' && moved < 7) {
      const [x, y] = pos(e);
      const n = hit(x, y);
      if (n && n.url) {
        if (n.ext && part === 'dot') window.open(n.ext, '_blank', 'noopener');
        else if (n.file) window.open(n.url, '_blank');
        else if (window.__go) window.__go(n.url, n.parent ? n.parent.label : n.label);
        else location.href = n.url;
      }
    }
    if (e.pointerType === 'touch') { mx = my = -1; hover = null; }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!dragging) { mx = my = -1; hover = null; host.classList.remove('point'); } });

  /* keyboard users: focusing a link in the hidden list lights its node */
  document.querySelectorAll('.index a[data-node]').forEach((a) => {
    a.addEventListener('focus', () => { focusNode = byId[a.dataset.node] || null; });
    a.addEventListener('blur', () => { focusNode = null; });
  });

  /* ---------- lifecycle ---------- */
  resize();
  window.addEventListener('resize', resize);
  const start = () => { if (!running) { running = true; requestAnimationFrame(draw); } };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { visible = true; start(); } else { running = false; }
      });
    }, { threshold: 0.05 }).observe(host);
  } else { visible = true; start(); }
})();

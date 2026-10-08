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

  /* Four sections on a ring. Small unlabelled dots around each are decoration only. */
  const sections = [
    { id: 'experience', label: 'Experience', sub: 'Castleton, Crédit Agricole CIB, PetroIneos, Aon', url: 'experience.html', lat: 0.34, dots: 7 },
    { id: 'projects', label: 'Projects', sub: 'Power data, forecasting, option pricing', url: 'projects.html', lat: -0.34, dots: 6 },
    { id: 'tutoring', label: 'Tutoring', sub: 'Maths, Physics, Economics, Business', url: 'tutoring.html', lat: 0.34, dots: 5 },
    { id: 'cv', label: 'CV', sub: 'One page, certifications, awards', url: 'cv.html', lat: -0.34, dots: 4 }
  ];

  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  const nodes = [];
  const byId = {};
  sections.forEach((s, i) => {
    const lon = (i / sections.length) * Math.PI * 2;
    const d = [Math.cos(s.lat) * Math.sin(lon), Math.sin(s.lat), Math.cos(s.lat) * Math.cos(lon)];
    const n = Object.assign({ p: d, hs: 1, sats: [] }, s);
    const u = norm(cross(d, [0, 1, 0]));
    const v = cross(d, u);
    for (let k = 0; k < s.dots; k++) {
      const a = (k / s.dots) * Math.PI * 2 + i;
      const t = 0.3 + 0.12 * (k % 3);
      n.sats.push(norm([
        d[0] * Math.cos(t) + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * Math.sin(t),
        d[1] * Math.cos(t) + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * Math.sin(t),
        d[2] * Math.cos(t) + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * Math.sin(t)
      ]));
    }
    nodes.push(n);
    byId[n.id] = n;
  });

  const dust = [];
  const N = 220;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    dust.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }

  const face = new Image();
  let faceReady = false;
  face.onload = () => { faceReady = true; };
  face.src = 'igor-bykov.jpg';

  let W = 0, H = 0, dpr = 1, RAD = 100, small = false;
  let yaw = 0.5, pitch = 0.16, vyaw = 0;
  let dragging = false, moved = 0, lx = 0, ly = 0, pid = null;
  let hover = null, focusNode = null;
  let appear = 0, visible = false, running = false;
  let mx = -1, my = -1;

  function resize() {
    const b = host.getBoundingClientRect();
    W = b.width; H = b.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    small = W < 720;
    RAD = small ? Math.min(W * 0.33, H * 0.34) : Math.min(W * 0.26, H * 0.36);
  }

  function project(p, k) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = p[0] * cy + p[2] * sy;
    const z0 = -p[0] * sy + p[2] * cy;
    const y = p[1] * cp - z0 * sp;
    const z = p[1] * sp + z0 * cp;
    const s = 3.2 / (3.2 - z);
    return { x: W / 2 + x * RAD * s * k, y: H / 2 - y * RAD * s * k, z, s };
  }

  function hit(x, y) {
    let best = null, bz = -9;
    for (const n of nodes) {
      if (!n.scr) continue;
      const b = n.box;
      const near = Math.hypot(x - n.scr.x, y - n.scr.y) < 34;
      const inBox = b && x > b[0] && x < b[1] && y > b[2] && y < b[3];
      if ((near || inBox) && n.scr.z > bz) { best = n; bz = n.scr.z; }
    }
    return best;
  }

  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);

    const active = hover || focusNode;
    if (!dragging) {
      yaw += vyaw + (reduce || active ? 0 : 0.0022);
      vyaw *= 0.94;
      pitch += (0.16 - pitch) * 0.05;
    }
    if (visible && appear < 1) appear = Math.min(1, appear + (reduce ? 1 : 0.02));
    const k = ease(appear);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, RAD * 1.7);
    g.addColorStop(0, `rgba(${ACC},${0.12 * k})`);
    g.addColorStop(0.55, `rgba(${ACC},${0.035 * k})`);
    g.addColorStop(1, `rgba(${ACC},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const d of dust) {
      const s = project(d, k);
      const t = (s.z + 1) / 2;
      ctx.fillStyle = `rgba(${FG},${(0.05 + 0.3 * t * t) * k})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (0.6 + t) * s.s, 0, 6.283);
      ctx.fill();
    }

    const hubR = small ? 30 : 42;
    for (const n of nodes) {
      n.scr = project(n.p, k);
      n.t = (n.scr.z + 1) / 2;
      n.hs += ((n === active ? 1.18 : 1) - n.hs) * 0.18;
    }
    const order = nodes.slice().sort((a, b) => a.scr.z - b.scr.z);

    const drawNode = (n) => {
      const on = n === active;
      const { x, y } = n.scr;
      const al = (0.35 + 0.65 * n.t) * k * (active && !on ? 0.45 : 1);

      /* spokes */
      ctx.lineWidth = on ? 1.5 : 1;
      ctx.strokeStyle = on ? `rgba(${ACC},0.9)` : `rgba(${FG},${0.22 * al})`;
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2);
      ctx.lineTo(x, y);
      ctx.stroke();
      for (const sp of n.sats) {
        const q = project(sp, k);
        ctx.strokeStyle = on ? `rgba(${ACC},0.55)` : `rgba(${FG},${0.14 * al})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.fillStyle = on ? `rgba(${ACC},0.95)` : `rgba(${FG},${0.7 * al})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, (small ? 2.2 : 3) * q.s, 0, 6.283);
        ctx.fill();
      }

      /* node */
      const r = (small ? 7 : 10) * n.scr.s * n.hs;
      ctx.globalAlpha = al;
      if (on) { ctx.shadowColor = `rgba(${ACC},0.95)`; ctx.shadowBlur = 24; }
      ctx.fillStyle = on ? `rgb(${ACC})` : `rgb(${FG})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? `rgba(${ACC},0.9)` : `rgba(${FG},0.45)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r + 6 * n.hs, 0, 6.283);
      ctx.stroke();

      /* label */
      const px = (small ? 22 : 38) * (0.8 + 0.2 * n.scr.s) * n.hs;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `500 ${px.toFixed(1)}px ${FONT}`;
      ctx.fillStyle = `rgb(${FG})`;
      const ty = y + r + 12;
      ctx.fillText(n.label, x, ty);
      const tw = ctx.measureText(n.label).width / 2 + 16;
      n.box = [x - tw, x + tw, y - r - 10, ty + px + 24];
      if (!small || on) {
        ctx.globalAlpha = al * (on ? 1 : Math.max(0, (n.t - 0.45) / 0.4));
        ctx.font = `400 ${small ? 11.5 : 13}px ${FONT}`;
        ctx.fillStyle = `rgb(${MUTE})`;
        ctx.fillText(n.sub, x, ty + px * 1.12);
      }
      ctx.globalAlpha = 1;
    };

    const drawHub = () => {
      const r = hubR * (0.5 + 0.5 * k);
      ctx.globalAlpha = k;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, 6.283);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (faceReady) {
        ctx.save();
        ctx.clip();
        const sc = (r * 2) / Math.min(face.naturalWidth, face.naturalHeight) * 1.05;
        try { ctx.filter = 'grayscale(1)'; } catch (e) {}
        ctx.drawImage(face, W / 2 - (face.naturalWidth * sc) / 2, H / 2 - face.naturalHeight * sc * 0.44, face.naturalWidth * sc, face.naturalHeight * sc);
        try { ctx.filter = 'none'; } catch (e) {}
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r + 4, 0, 6.283);
      ctx.strokeStyle = `rgba(${FG},0.5)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    let hubDone = false;
    for (const n of order) {
      if (!hubDone && n.scr.z >= 0) { drawHub(); hubDone = true; }
      drawNode(n);
    }
    if (!hubDone) drawHub();

    if (!dragging && mx >= 0) {
      hover = hit(mx, my);
      host.classList.toggle('point', !!hover);
    }
  }

  const pos = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; pid = e.pointerId;
    [lx, ly] = pos(e); mx = lx; my = ly;
    vyaw = 0;
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
    yaw += dx * 0.006;
    vyaw = dx * 0.006;
    pitch = Math.max(-0.5, Math.min(0.6, pitch + dy * 0.004));
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    host.classList.remove('grabbing');
    try { canvas.releasePointerCapture(pid); } catch (err) {}
    if (e.type === 'pointerup' && moved < 8) {
      const [x, y] = pos(e);
      const n = hit(x, y);
      if (n) {
        if (window.__go) window.__go(n.url, n.label);
        else location.href = n.url;
      }
    }
    if (e.pointerType === 'touch') { mx = my = -1; hover = null; }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!dragging) { mx = my = -1; hover = null; host.classList.remove('point'); } });

  document.querySelectorAll('.index a[data-node]').forEach((a) => {
    a.addEventListener('focus', () => { focusNode = byId[a.dataset.node] || null; });
    a.addEventListener('blur', () => { focusNode = null; });
  });

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

/* ================== HIỆU ỨNG VUI ==================
   FX.burst(x, y)      – chùm sao + hạt màu bung ra tại vị trí (x, y)
   FX.show(ms)         – bắn pháo hoa trong ms mili-giây
   FX.float(x, y, txt) – chữ bay lên (ví dụ "+1 ⭐")
   FX.banner(txt)      – dòng chữ lớn hiện giữa màn hình
   FX.oops(x, y)       – "Ê xì!" + giọt nước rơi khi trả lời sai
   FX.onBoom           – hàm gọi mỗi khi pháo hoa nổ (để phát tiếng)
   Tự tắt nếu thiết bị bật "giảm chuyển động". */
const FX = (() => {
  const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const COLS = ['#FF8A5B', '#FFC94A', '#2FB36B', '#4F86F7', '#E8559A', '#8E62F0', '#00C2D1', '#FF5E5E'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let cv, cx, dpr = 1, parts = [], raf = 0, showTimer = 0;
  const api = { onBoom: null };

  function ensure() {
    if (cv) return true;
    try {
      cv = document.createElement('canvas');
      cv.className = 'fx'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      cx = cv.getContext('2d');
      resize(); addEventListener('resize', resize);
      return !!cx;
    } catch (e) { return false; }
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  }
  function add(p) {
    parts.push(Object.assign({ vx: 0, vy: 0, g: 0.12, drag: 0.985, r: 3, life: 60, fade: 25, c: pick(COLS) }, p));
  }
  function star(x, y, r, rot) {
    cx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    cx.closePath(); cx.fill();
  }
  function explode(x, y) {
    const base = pick(COLS), alt = pick(COLS), n = 70;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1, sp = 2.5 + Math.random() * 3.5;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, drag: 0.975, r: 2.2 + Math.random() * 1.4,
            life: 55 + Math.random() * 35, fade: 30, c: Math.random() < 0.7 ? base : alt, twinkle: Math.random() < 0.4 });
    }
    api.onBoom && api.onBoom();
  }
  function loop() {
    const W = innerWidth, H = innerHeight;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const born = [];
    for (const p of parts) {
      p.life--;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx; p.y += p.vy;
      if (p.rocket) {
        if (Math.random() < 0.8) born.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.6, vy: 1, g: 0.02, r: 1.6, life: 18, fade: 18, c: '#FFE08A' });
        if (p.vy >= -0.5) { p.life = 0; explode(p.x, p.y); }
      }
      if (p.life <= 0) continue;
      let a = Math.min(1, p.life / p.fade);
      if (p.twinkle && Math.random() < 0.3) a *= 0.3;
      cx.globalAlpha = a; cx.fillStyle = p.c;
      if (p.emoji) {
        cx.font = p.size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(p.emoji, p.x, p.y);
      } else if (p.star) {
        p.rot += p.spin; star(p.x, p.y, p.r, p.rot);
      } else {
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.fill();
      }
    }
    cx.globalAlpha = 1;
    parts = parts.filter(p => p.life > 0);
    born.forEach(add);
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) cx.clearRect(0, 0, W, H);
  }
  function run() { if (!raf) raf = requestAnimationFrame(loop); }

  api.burst = (x, y) => {
    if (reduce() || !ensure()) return;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.18, drag: 0.96,
            r: 2.5 + Math.random() * 2.5, life: 40 + Math.random() * 20, fade: 20 });
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 4 + Math.random() * 4;
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.15, drag: 0.97, star: true,
            r: 6 + Math.random() * 6, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.3,
            life: 50 + Math.random() * 25, fade: 25, c: pick(['#FFC94A', '#FFD84D', '#FFB020']) });
    }
    for (let i = 0; i < 3; i++) {
      add({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 2,
            g: 0.03, drag: 0.99, emoji: pick(['⭐', '🎉', '✨', '💖', '🌟']), size: 26 + Math.random() * 10, life: 70, fade: 30 });
    }
    run();
  };

  api.rocket = (x) => {
    if (reduce() || !ensure()) return;
    const H = innerHeight, rise = H * (0.45 + Math.random() * 0.3), g = 0.12;
    add({ x: x ?? innerWidth * (0.15 + Math.random() * 0.7), y: H + 10, vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.sqrt(2 * g * rise), g, drag: 1, r: 3, life: 400, fade: 1, c: '#FFE08A', rocket: true });
    run();
  };

  api.show = (ms = 2500) => {
    if (reduce() || !ensure()) return;
    clearInterval(showTimer);
    const end = Date.now() + ms;
    api.rocket(); api.rocket();
    showTimer = setInterval(() => {
      if (Date.now() > end) return clearInterval(showTimer);
      api.rocket();
      if (Math.random() < 0.4) api.rocket();
    }, 320);
  };

  api.oops = (x, y) => {
    const d = document.createElement('div');
    d.className = 'float-oops'; d.textContent = 'Ê xì! 🙈';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
    if (reduce() || !ensure()) return;
    // Bay chéo lên hai bên rồi mờ dần, không rơi đè lên đáp án bé vừa chọn
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      add({ x: x + side * (10 + Math.random() * 40), y: y - 6, vx: side * (1.5 + Math.random() * 2.5), vy: -2.5 - Math.random() * 2,
            g: 0.05, drag: 0.98, emoji: pick(['💦', '💧', '🙈', '😝', '💦']), size: 20 + Math.random() * 8, life: 45, fade: 25 });
    }
    run();
  };

  api.stop = () => { clearInterval(showTimer); parts = []; };

  api.float = (x, y, txt) => {
    const d = document.createElement('div');
    d.className = 'float-up'; d.textContent = txt;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
  };

  api.banner = (txt) => {
    document.querySelectorAll('.fx-banner').forEach(b => b.remove());
    const d = document.createElement('div');
    d.className = 'fx-banner'; d.textContent = txt;
    document.body.appendChild(d); setTimeout(() => d.remove(), 1800);
  };

  return api;
})();

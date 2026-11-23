/* ================== HIỆU ỨNG VUI ==================
   FX.burst(x, y)        – chùm sao + hạt màu bung ra tại vị trí (x, y) khi trả lời đúng
   FX.oops(x, y)         – "Ê xì!" + giọt nước bay lên khi trả lời sai
   FX.show(ms)           – bắn pháo hoa trong ms mili-giây
   FX.celebrate(opt)     – màn ăn mừng qua bài: chọn ngẫu nhiên vài hiệu ứng, khác lần trước
                           opt = { power: 1..5, emojis: [...] (emoji của bài học) }
   FX.float(x, y, txt)   – chữ bay lên (ví dụ "+1 ⭐")
   FX.banner(txt)        – dòng chữ lớn hiện giữa màn hình
   FX.onBoom / FX.onSound(type) – để app.js phát âm thanh ('boom','whoosh','pop','sparkle','magic')
   Tự tắt phần chuyển động nếu thiết bị bật "giảm chuyển động". */
const FX = (() => {
  const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const COLS = ['#FF8A5B', '#FFC94A', '#2FB36B', '#4F86F7', '#E8559A', '#8E62F0', '#00C2D1', '#FF5E5E'];
  const RAINBOW = ['#FF5E5E', '#FF9F43', '#FFD84D', '#2FB36B', '#4F86F7', '#8E62F0'];
  const MAX = 1600;                                     // giới hạn số hạt để máy yếu không bị giật
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  let cv, cx, dpr = 1, parts = [], raf = 0, showTimer = 0, timers = [];
  const api = { onBoom: null, onSound: null };
  const sound = t => { try { api.onSound && api.onSound(t); } catch (e) {} };

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
    if (parts.length >= MAX) return;
    parts.push(Object.assign({ vx: 0, vy: 0, g: 0.12, drag: 0.985, r: 3, life: 60, fade: 25, c: pick(COLS), t: 0 }, p));
  }

  // Emoji vẽ sẵn ra canvas nhỏ rồi dùng lại (fillText mỗi khung hình rất chậm)
  const sprites = {};
  function sprite(e, size) {
    const s = Math.max(8, Math.round(size / 4) * 4), key = e + '|' + s + '|' + dpr;
    if (!sprites[key]) {
      const c = document.createElement('canvas'), px = Math.ceil(s * 1.35 * dpr);
      c.width = c.height = px;
      const g = c.getContext('2d');
      g.font = (s * dpr) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(e, px / 2, px / 2 + s * dpr * 0.06);
      sprites[key] = { c, w: px / dpr };
    }
    return sprites[key];
  }
  function star(x, y, r) {
    cx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    cx.closePath(); cx.fill();
  }
  function heart(x, y, r) {
    cx.beginPath(); cx.moveTo(x, y + r * 0.9);
    cx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.4);
    cx.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    cx.fill();
  }
  function explode(x, y, n = 70, cols) {
    const base = pick(cols || COLS), alt = pick(cols || COLS);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1, sp = rnd(2.5, 6);
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, drag: 0.975, r: rnd(2.2, 3.6),
            life: rnd(55, 90), fade: 30, c: Math.random() < 0.7 ? base : alt, twinkle: Math.random() < 0.4 });
    }
    api.onBoom && api.onBoom();
  }

  function loop() {
    const W = innerWidth, H = innerHeight;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const born = [];
    for (const p of parts) {
      p.life--; p.t++;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      p.x += p.vx + (p.sway ? Math.sin(p.t * p.swf + p.ph) * p.sway : 0);
      p.y += p.vy;
      if (p.spin) p.rot = (p.rot || 0) + p.spin;
      if (p.emit) p.emit(p, born);
      if (p.rocket && p.vy >= -0.5) { p.life = 0; explode(p.x, p.y); }
      if (p.until && p.until(p)) { p.life = 0; p.onEnd && p.onEnd(p); }
      if (p.life <= 0) continue;
      let a = Math.min(1, p.life / p.fade);
      if (p.twinkle && Math.random() < 0.3) a *= 0.3;
      cx.globalAlpha = a; cx.fillStyle = p.c;
      if (p.emoji) {
        const s = sprite(p.emoji, p.size);
        if (p.rot) { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.drawImage(s.c, -s.w / 2, -s.w / 2, s.w, s.w); cx.restore(); }
        else cx.drawImage(s.c, p.x - s.w / 2, p.y - s.w / 2, s.w, s.w);
      } else if (p.shape === 'star') { star(p.x, p.y, p.r);
      } else if (p.shape === 'heart') { heart(p.x, p.y, p.r);
      } else if (p.shape === 'rect') {            // giấy màu: xoay + lật cho giống thật
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot || 0); cx.scale(1, Math.cos(p.t * p.flip));
        cx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2); cx.restore();
      } else if (p.shape === 'bubble') {
        cx.strokeStyle = p.c; cx.lineWidth = 2; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.stroke();
        cx.globalAlpha = a * 0.25; cx.fill();
        cx.globalAlpha = a * 0.9; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.22, 0, Math.PI * 2); cx.fill();
      } else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.fill(); }
    }
    cx.globalAlpha = 1;
    parts = parts.filter(p => p.life > 0);
    born.forEach(add);
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) cx.clearRect(0, 0, W, H);
  }
  function run() { if (!raf) raf = requestAnimationFrame(loop); }
  const ok = () => !reduce() && ensure();
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  /* ---------- Hiệu ứng nhỏ khi trả lời ---------- */
  api.burst = (x, y) => {
    if (!ok()) return;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = rnd(3, 8);
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, g: 0.18, drag: 0.96, r: rnd(2.5, 5), life: rnd(40, 60), fade: 20 });
    }
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = rnd(4, 8);
      add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.15, drag: 0.97, shape: 'star', r: rnd(6, 12),
            life: rnd(50, 75), fade: 25, c: pick(['#FFC94A', '#FFD84D', '#FFB020']) });
    }
    for (let i = 0; i < 3; i++) {
      add({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 2, vy: rnd(-5, -3), g: 0.03, drag: 0.99,
            emoji: pick(['⭐', '🎉', '✨', '💖', '🌟']), size: rnd(26, 36), life: 70, fade: 30 });
    }
    run();
  };

  api.oops = (x, y) => {
    const d = document.createElement('div');
    d.className = 'float-oops'; d.textContent = 'Ê xì! 🙈';
    d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
    if (!ok()) return;
    // Bay chéo lên hai bên rồi mờ dần, không rơi đè lên đáp án bé vừa chọn
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      add({ x: x + side * rnd(10, 50), y: y - 6, vx: side * rnd(1.5, 4), vy: rnd(-4.5, -2.5), g: 0.05, drag: 0.98,
            emoji: pick(['💦', '💧', '🙈', '😝', '💦']), size: rnd(20, 28), life: 45, fade: 25 });
    }
    run();
  };

  /* ---------- Pháo hoa ---------- */
  api.rocket = (x) => {
    if (!ok()) return;
    const H = innerHeight, rise = H * rnd(0.45, 0.75), g = 0.12;
    add({ x: x ?? innerWidth * rnd(0.15, 0.85), y: H + 10, vx: (Math.random() - 0.5) * 1.5, vy: -Math.sqrt(2 * g * rise), g, drag: 1,
          r: 3, life: 400, fade: 1, c: '#FFE08A', rocket: true,
          emit: (p, out) => { if (Math.random() < 0.8) out.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.6, vy: 1, g: 0.02, r: 1.6, life: 18, fade: 18, c: '#FFE08A' }); } });
    run();
  };
  api.show = (ms = 2500) => {
    if (!ok()) return;
    clearInterval(showTimer);
    const end = Date.now() + ms;
    api.rocket(); api.rocket();
    showTimer = setInterval(() => {
      if (Date.now() > end) return clearInterval(showTimer);
      api.rocket(); if (Math.random() < 0.4) api.rocket();
    }, 320);
  };

  /* ---------- Các màn ăn mừng (mỗi hàm một kiểu) ---------- */
  const W = () => innerWidth, H = () => innerHeight;
  const EFFECTS = {
    // Pháo hoa bắn liên tục
    fireworks: () => api.show(2600),
    // Bóng bay bay lên, lắc lư
    balloons: () => {
      for (let i = 0; i < 18; i++) later(i * 90, () => {
        const vy = rnd(-3.2, -1.8);
        add({ x: rnd(20, W() - 20), y: H() + 40, vy, g: 0, drag: 1, sway: rnd(0.6, 1.4), swf: rnd(0.03, 0.06), ph: rnd(0, 6),
              emoji: pick(['🎈', '🎈', '🎈', '🎀', '🎁']), size: rnd(38, 60), life: (H() + 120) / -vy, fade: 20 });
        run();
      });
      sound('pop');
    },
    // Mưa sao vàng lấp lánh
    starRain: () => {
      for (let i = 0; i < 70; i++) later(i * 25, () => {
        const isE = Math.random() < 0.3;
        add({ x: rnd(0, W()), y: -20, vx: rnd(-0.5, 0.5), vy: rnd(2, 4.5), g: 0.02, drag: 1, life: (H() + 40) / 3, fade: 30,
              ...(isE ? { emoji: pick(['⭐', '🌟', '✨']), size: rnd(22, 36), spin: rnd(-0.05, 0.05) }
                      : { shape: 'star', r: rnd(5, 10), c: pick(['#FFC94A', '#FFD84D', '#FFB020', '#FFF1A8']), twinkle: true }) });
        run();
      });
      sound('sparkle');
    },
    // Mưa emoji của chính bài học (con vật, đồ ăn, đồ chơi...)
    emojiRain: (o) => {
      const em = (o.emojis && o.emojis.length) ? o.emojis : ['🎉', '⭐', '🎈'];
      for (let i = 0; i < 40; i++) later(i * 45, () => {
        add({ x: rnd(10, W() - 10), y: -40, vx: rnd(-0.6, 0.6), vy: rnd(2.2, 4), g: 0.03, drag: 1, sway: rnd(0.3, 0.9), swf: rnd(0.03, 0.07), ph: rnd(0, 6),
              emoji: pick(em), size: rnd(32, 52), rot: rnd(-0.4, 0.4), spin: rnd(-0.03, 0.03), life: (H() + 80) / 2.5, fade: 25 });
        run();
      });
    },
    // Kỳ lân bay ngang để lại vệt cầu vồng
    unicorn: () => {
      const y0 = H() * rnd(0.22, 0.4);
      add({ x: W() + 60, y: y0, vx: -Math.max(5, W() / 150), g: 0, drag: 1, sway: 1.2, swf: 0.08, ph: 0, emoji: '🦄', size: 72,
            life: 600, fade: 1, until: p => p.x < -80,
            emit: (p, out) => {
              // Hai cột hạt mỗi khung hình để vệt cầu vồng liền mạch, không thành sọc
              for (let j = 0; j < 2; j++) for (let k = 0; k < 6; k++)
                out.push({ x: p.x + 30 - p.vx * j / 2, y: p.y - 8 + k * 5, vx: 0.4, vy: 0, g: 0, drag: 1, r: 3.6, life: 70, fade: 50, c: RAINBOW[k] });
              if (Math.random() < 0.25) out.push({ x: p.x + 30, y: p.y + rnd(-20, 20), vx: rnd(0, 1), vy: rnd(-1, 1), g: 0.02, shape: 'star', r: rnd(4, 7), life: 50, fade: 30, c: '#FFD84D' });
            } });
      run(); sound('magic');
    },
    // Tên lửa phóng lên rồi nổ tung thành sao và emoji
    rocket: (o) => {
      const x0 = W() * rnd(0.3, 0.7);
      add({ x: x0, y: H() + 50, vy: -Math.max(7, H() / 80), g: 0, drag: 1, emoji: '🚀', size: 64, rot: -Math.PI / 4, life: 600, fade: 1,
            until: p => p.y < H() * 0.28,
            onEnd: p => {
              explode(p.x, p.y, 110, RAINBOW);
              const em = (o.emojis && o.emojis.length) ? o.emojis : ['⭐'];
              for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2;
                add({ x: p.x, y: p.y, vx: Math.cos(a) * rnd(3, 6), vy: Math.sin(a) * rnd(3, 6), g: 0.08, drag: 0.97, emoji: pick(em), size: rnd(30, 44), spin: rnd(-0.08, 0.08), life: 90, fade: 35 }); }
            },
            emit: (p, out) => { for (let k = 0; k < 3; k++) out.push({ x: p.x + rnd(-6, 6), y: p.y + 30, vx: rnd(-1, 1), vy: rnd(2, 4), g: 0, drag: 0.96, r: rnd(2, 5), life: 25, fade: 25, c: pick(['#FF9F43', '#FFD84D', '#FF5E5E']) }); } });
      run(); sound('whoosh');
    },
    // Trái tim bung ra từ giữa màn hình
    hearts: () => {
      const x0 = W() / 2, y0 = H() * 0.42, n = 90;
      for (let i = 0; i < n; i++) {
        const t = i / n * Math.PI * 2, hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        add({ x: x0, y: y0, vx: hx * 0.32, vy: hy * 0.32, g: 0.02, drag: 0.955, shape: 'heart', r: rnd(4, 7), life: 95, fade: 40, c: pick(['#FF5E8A', '#E8559A', '#FF8FB1', '#FF5E5E']) });
      }
      for (let i = 0; i < 8; i++) add({ x: x0 + rnd(-40, 40), y: y0, vx: rnd(-2, 2), vy: rnd(-4, -2), g: 0.03, emoji: pick(['💖', '💕', '💗']), size: rnd(30, 44), life: 90, fade: 40 });
      run(); sound('sparkle');
    },
    // Hai khẩu pháo giấy màu bắn từ hai góc dưới
    cannons: () => {
      [0, 1].forEach(side => later(side * 250, () => {
        for (let i = 0; i < 110; i++) {
          const a = side ? rnd(-2.2, -1.75) : rnd(-1.4, -0.95), sp = rnd(10, Math.max(16, H() / 45));
          add({ x: side ? W() + 5 : -5, y: H() + 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.22, drag: 0.982, shape: 'rect',
                r: rnd(4, 7), rot: rnd(0, 6), spin: rnd(-0.2, 0.2), flip: rnd(0.08, 0.2), life: rnd(130, 180), fade: 40 });
        }
        sound('boom'); run();
      }));
    },
    // Bong bóng xà phòng bay lên
    bubbles: () => {
      for (let i = 0; i < 40; i++) later(i * 60, () => {
        const vy = rnd(-2.4, -1.2);
        add({ x: rnd(10, W() - 10), y: H() + 30, vy, g: 0, drag: 1, sway: rnd(0.5, 1.2), swf: rnd(0.04, 0.08), ph: rnd(0, 6), shape: 'bubble',
              r: rnd(8, 24), c: pick(['#7CC8FF', '#9AE6F0', '#C3A6FF', '#FFB3D9']), life: (H() + 60) / -vy, fade: 25 });
        run();
      });
      sound('pop');
    },
    // Thiên hà xoáy nhiều màu
    spiral: () => {
      const x0 = W() / 2, y0 = H() * 0.4;
      for (let i = 0; i < 140; i++) later(i * 12, () => {
        const a = i * 0.42, sp = 2 + i * 0.03;
        add({ x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, drag: 0.99, r: rnd(2.5, 4.5), c: RAINBOW[i % 6], life: 90, fade: 40, twinkle: i % 3 === 0 });
        run();
      });
      sound('magic');
    },
    // Giấy màu rơi từ trên xuống
    confetti: () => {
      for (let i = 0; i < 160; i++) later(i * 8, () => {
        add({ x: rnd(0, W()), y: rnd(-40, -10), vx: rnd(-1, 1), vy: rnd(2, 4), g: 0.05, drag: 0.99, sway: rnd(0.5, 1.5), swf: rnd(0.05, 0.1), ph: rnd(0, 6),
              shape: 'rect', r: rnd(4, 7), rot: rnd(0, 6), spin: rnd(-0.15, 0.15), flip: rnd(0.08, 0.2), life: (H() + 60) / 3, fade: 30 });
        run();
      });
    },
    // Linh vật nhảy múa giữa màn hình
    mascot: () => {
      const d = document.createElement('div');
      d.className = 'fx-mascot'; d.textContent = pick(['🦉', '🐶', '🐱', '🐼', '🐸', '🐵', '🦁', '🐰']);
      document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
      if (ok()) for (let i = 0; i < 12; i++) later(400 + i * 150, () => {
        add({ x: W() / 2 + rnd(-70, 70), y: H() * 0.5, vx: rnd(-2, 2), vy: rnd(-5, -3), g: 0.12, emoji: pick(['🎵', '🎶', '✨', '💫']), size: rnd(24, 34), life: 60, fade: 30 });
        run();
      });
      sound('sparkle');
    },
  };
  const NAMES = Object.keys(EFFECTS);
  const MESSAGES = ['🎉 Hoan hô!', '🌟 Siêu sao tiếng Anh!', '🦄 Đỉnh của chóp!', '🚀 Bay cao quá!', '👏 Xuất sắc!', '🥳 Giỏi quá đi!',
                    '💯 Tuyệt cú mèo!', '🏅 Nhà vô địch!', '🌈 Tuyệt vời ông mặt trời!', '👑 Con là số 1!'];
  const LAST_KEY = 'beVuiHocTiengAnh.fxLast';

  // Chọn ngẫu nhiên 2–5 hiệu ứng (power càng cao càng nhiều), không lặp lại hiệu ứng của lần trước
  api.celebrate = (o = {}) => {
    const power = Math.max(1, Math.min(5, o.power || 1));
    let last = [];
    try { last = JSON.parse(localStorage.getItem(LAST_KEY)) || []; } catch (e) {}
    const pool = NAMES.filter(n => !last.includes(n));
    const rest = NAMES.filter(n => last.includes(n));
    const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
    const combo = [...shuffle(pool), ...shuffle(rest)].slice(0, Math.min(NAMES.length, 1 + power));
    try { localStorage.setItem(LAST_KEY, JSON.stringify(combo)); } catch (e) {}
    timers.forEach(clearTimeout); timers = [];
    api.banner(o.message || pick(MESSAGES));
    combo.forEach((name, k) => later(k * 750, () => {
      if (name === 'mascot' || ok()) EFFECTS[name](o);
    }));
    return combo;
  };
  api.effects = NAMES;
  api.play = (name, o = {}) => { if (EFFECTS[name] && (name === 'mascot' || ok())) EFFECTS[name](o); };

  api.stop = () => { clearInterval(showTimer); timers.forEach(clearTimeout); timers = []; parts = []; document.querySelectorAll('.fx-mascot,.fx-banner').forEach(d => d.remove()); };

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

/* ================== TRÒ CHƠI: GIẢI CỨU CÔNG CHÚA TÍ HON ==================
   Bà phù thủy Gian Gian nhốt Công chúa Tí Hon trên tháp bằng RESCUE_N ổ khoá.
   - Mỗi câu trả lời đúng: mở 1 ổ khoá, hiệp sĩ (con vật của bé) tiến lại gần tháp.
   - Mỗi câu sai: phù thủy bay tới khoá lại 1 ổ (không xuống dưới 0).
   - Mở hết ổ khoá: công chúa được thả, vua cha tặng quà. Không sai câu nào thì được 2 món quà.
   Câu hỏi là từ vựng của tất cả các bài (theo cấp bé đang học), 5 kiểu: nhìn hình, chọn hình, nghe, Việt→Anh, Anh→Việt.
   Số lần giải cứu và quà được ghi vào `seen` với khoá "castle|…" nên tự lưu lên máy chủ và sang máy khác
   như tiến độ học (máy chủ gộp theo số lớn nhất), không cần sửa server/app.py.
   File này phải nạp TRƯỚC app.js (trang chủ cần biết có trò chơi), các hàm của app.js chỉ được gọi khi chơi. */
const RESCUE_N = 10;
const GIFTS = [
  ['pony','🐴','Chú ngựa con'],['cake','🎂','Bánh kem hoàng gia'],['teddy','🧸','Gấu bông'],['crown','👑','Vương miện nhỏ'],
  ['gem','💎','Viên kim cương'],['kite','🪁','Con diều'],['bike','🚲','Xe đạp'],['medal','🏅','Huy chương hiệp sĩ'],
  ['shield','🛡️','Khiên hiệp sĩ'],['unicorn','🦄','Kỳ lân'],['ball','⚽','Quả bóng'],['carousel','🎠','Đu quay'],
  ['candy','🍭','Kẹo mút khổng lồ'],['rocket','🚀','Tên lửa đồ chơi'],['puppy','🐶','Cún con'],['robot','🤖','Rô-bốt'],
];
const CK = k => 'castle|'+k;
const castleCount = k => (typeof seen!=='undefined' && seen[CK(k)]) || 0;
const giftCount = g => castleCount('gift|'+g[0]);
const castleLabel = () => { const r=castleCount('rescues'); return r ? `Đã cứu ${r} lần · ${GIFTS.filter(giftCount).length}/${GIFTS.length} quà` : 'Trò chơi mới!'; };
// Ưu tiên món quà bé chưa có (ít nhất), cùng số lượng thì chọn ngẫu nhiên
function pickGift(){ const min=Math.min(...GIFTS.map(giftCount)); return pickOne(GIFTS.filter(g=>giftCount(g)===min)); }

function castleQs(n){
  const qs=[], used=new Set(), kinds=shuffle(['pic','word','listen','vi','en']);
  for(let guard=0; qs.length<n && guard<n*30; guard++){
    const i=Math.floor(Math.random()*LESSONS.length), L=lv(i, startLevel(i));
    const w=pickOne(L.words); if(used.has(w[0])) continue; used.add(w[0]);
    qs.push(vocabQ(L, w, kinds[qs.length%kinds.length]));
  }
  return qs;
}

const PRINCESS_SAY = {
  start:['Cứu mình với! 😢','Hiệp sĩ ơi, cứu mình!'],
  ok:['Cố lên hiệp sĩ! 💪','Giỏi quá! 😍','Thêm 1 ổ nữa rồi!','Hoan hô! 🎉'],
  near:['Sắp được rồi! 🤩','Chỉ còn một chút nữa thôi!'],
  bad:['Ôi không! 😭','Đừng lo, thử lại nhé!','Hiệp sĩ cố lên! 🥺'],
};
const VILLAIN_SAY = ['Hí hí hí! Công chúa là của ta!','Ha ha ha! Ta khoá lại rồi! 🔒','Hí hí! Không ai cứu được đâu!','Ha ha! Sai rồi nhé!'];
// Bà phù thủy Gian Gian: da xanh, mũi dài khoằm có mụn cóc, mắt vàng đồng tử đỏ, mũ chóp gập, cưỡi chổi (SVG vẽ tay)
const WITCH_SVG = `<svg class="witch" viewBox="0 0 150 130" aria-hidden="true">
  <path d="M108 103 L140 94 L144 126 L108 118 Z" fill="#C9A15B"/>
  <path d="M112 104 L141 99 M112 110 L143 108 M112 116 L143 118" stroke="#9C7838" stroke-width="2"/>
  <line x1="6" y1="106" x2="112" y2="111" stroke="#7A4A22" stroke-width="6" stroke-linecap="round"/>
  <path d="M52 84 L104 84 L122 122 L36 122 Z" fill="#5B2A86"/>
  <path d="M52 84 L104 84 L96 96 L60 96 Z" fill="#3E1A60"/>
  <path d="M54 42 Q46 70 50 92 L60 80 Z M102 42 Q110 70 106 92 L96 80 Z" fill="#2B1A3A"/>
  <path d="M58 52 Q58 34 78 34 Q100 34 100 52 Q100 78 80 94 Q62 82 58 52 Z" fill="#7BC46A"/>
  <path d="M66 56 Q44 58 22 76 Q36 76 64 70 Z" fill="#6AB25A"/>
  <circle cx="38" cy="69" r="3" fill="#3F7A33"/>
  <path d="M63 46 L76 52 M95 46 L82 52" stroke="#1E1230" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="71" cy="57" rx="5.5" ry="4.5" fill="#FFE45C"/><ellipse cx="88" cy="57" rx="5.5" ry="4.5" fill="#FFE45C"/>
  <ellipse cx="72" cy="57.5" rx="1.6" ry="3.6" fill="#C0141C"/><ellipse cx="89" cy="57.5" rx="1.6" ry="3.6" fill="#C0141C"/>
  <path d="M66 75 Q79 87 94 73 Q80 81 66 75 Z" fill="#2A0E1E"/>
  <path d="M79 79 L82 79 L81 84 Z" fill="#FFF7D6"/>
  <ellipse cx="78" cy="40" rx="38" ry="7" fill="#1B1325"/>
  <path d="M60 40 Q74 -4 116 6 Q96 12 97 40 Z" fill="#1B1325"/>
  <path d="M61 33 L97 33 L97 39 L60 39 Z" fill="#8A3FC4"/>
  <rect x="74" y="32" width="8" height="8" fill="#FFD24D"/>
</svg>`;
const WRONG_WAIT = 2600;   // trả lời sai: chờ phù thủy bay tới, cười xong rồi mới hiện thông báo (mili-giây)

// Tiếng cười nham hiểm của bà phù thủy, tổng hợp bằng Web Audio (không cần file âm thanh):
// sấm rền → 3 tiếng "hừ… hừ…" trầm, chậm → tràng "há há há" the thé cao dần, giọng khàn (méo tiếng) và có tiếng vọng.
function villainLaugh(){
  try{
    const A=ac(), t0=A.currentTime;
    const master=A.createDynamicsCompressor();                 // giới hạn âm lượng: to nhưng không vỡ tiếng
    master.threshold.value=-12; master.knee.value=6; master.ratio.value=12; master.attack.value=0.003; master.release.value=0.2;
    const vol=A.createGain(); vol.gain.value=0.95; master.connect(vol); vol.connect(A.destination);
    // sấm
    const len=Math.floor(A.sampleRate*1.6), buf=A.createBuffer(1,len,A.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.6);
    const n=A.createBufferSource(), lp=A.createBiquadFilter(), ng=A.createGain();
    n.buffer=buf; lp.type='lowpass'; lp.frequency.value=140; ng.gain.value=0.7;
    n.connect(lp); lp.connect(ng); ng.connect(master); n.start(t0);
    // giọng: méo tiếng cho khàn → lọc giữ dải giọng → to nhỏ → tiếng vọng
    const shaper=A.createWaveShaper(), curve=new Float32Array(1024);
    for(let i=0;i<1024;i++){ const x=i/511.5-1; curve[i]=Math.tanh(3*x); }
    shaper.curve=curve;
    const formant=A.createBiquadFilter(); formant.type='peaking'; formant.frequency.value=1300; formant.Q.value=1.4; formant.gain.value=9;
    const hp=A.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180;
    const out=A.createGain(); out.gain.value=0.6;
    const echo=A.createDelay(1), fb=A.createGain(), wet=A.createGain();
    echo.delayTime.value=0.23; fb.gain.value=0.32; wet.gain.value=0.35;
    shaper.connect(formant); formant.connect(hp); hp.connect(out); out.connect(master);
    out.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(master);
    const lfo=A.createOscillator(), lg=A.createGain();       // rung giọng
    lfo.frequency.value=24; lg.gain.value=35; lfo.connect(lg); lfo.start(t0); lfo.stop(t0+2.6);
    const syll=(t, f0, f1, dur, vol, type)=>{
      const o=A.createOscillator(), g=A.createGain();
      o.type=type; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+dur);
      lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g); g.connect(shaper); o.start(t); o.stop(t+dur+0.02);
    };
    [0, 0.3, 0.6].forEach((dt,k)=>syll(t0+0.25+dt, 240-k*15, 170-k*10, 0.22, 0.9, 'sawtooth'));      // hừ… hừ… hừ…
    for(let k=0;k<9;k++){                                                                             // há há há… cao dần
      const t=t0+1.15+k*0.13, f=620+k*70;
      syll(t, f, f*0.78, 0.11, 0.8+k*0.02, k%2 ? 'square' : 'sawtooth');
    }
    syll(t0+2.35, 1300, 700, 0.32, 0.9, 'sawtooth');                                                 // HÁÁÁ kéo dài
  }catch(e){}
}

function sceneHTML(hero){
  return `<div class="castle" id="scene" aria-hidden="true">
    <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="sun">🌞</span>
    <div class="locks" id="locks">${Array.from({length:RESCUE_N},(_,n)=>`<span class="lk" data-k="${n}">🔒</span>`).join('')}</div>
    <div class="tower"><div class="roof"></div>
      <div class="win"><div class="bars" id="bars"></div></div>
      <div class="princess" id="princess">👸</div>
      <div class="door"></div>
    </div>
    <div class="psay" id="psay">${pickOne(PRINCESS_SAY.start)}</div>
    <div class="villain" id="vil">${WITCH_SVG}<span class="vb" id="vb"></span></div>
    <div class="king" id="king">🤴</div>
    <div class="hero" id="hero" style="--p:0">${hero}<small>🗡️</small></div>
  </div>`;
}

function castle(){
  trackScreen('castle');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#9B6BFF');
  const hero=avatar(user||'').e, rescues=castleCount('rescues'), owned=GIFTS.filter(giftCount).length;
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">🏰</div>
    <div><div class="sub">Trò chơi · Ôn từ vựng</div><h2>Giải cứu công chúa</h2></div></div>
  ${sceneHTML(hero)}
  <div class="panel" id="panel">
    <div class="testintro">
      <h3>Công chúa Tí Hon bị nhốt rồi!</h3>
      <p class="hint">Bà phù thủy Gian Gian đã nhốt Công chúa Tí Hon trên tháp cao bằng <b>${RESCUE_N} ổ khoá</b>.
        Mỗi câu con trả lời <b>đúng</b> sẽ mở được 1 ổ khoá. Nhưng cẩn thận: trả lời <b>sai</b> thì phù thủy sẽ bay tới khoá lại 1 ổ!
        Mở hết ${RESCUE_N} ổ khoá để cứu công chúa, <b>vua cha</b> sẽ có quà thưởng cho con 🎁</p>
      <div><span class="pill">🔑 Mở ${RESCUE_N} ổ khoá</span><span class="pill">📚 Từ vựng của mọi bài</span><span class="pill">🎁 Không sai câu nào: 2 món quà</span></div>
      <div class="row"><button class="btn" id="go">⚔️ Bắt đầu giải cứu</button></div>
    </div>
    ${treasureHTML(rescues, owned)}
  </div>`;
  $('#back').onclick=home;
  $('#go').onclick=()=>play(hero);
  window.scrollTo(0,0);
}

function treasureHTML(rescues, owned){
  return `<div class="treasure"><h3>🎁 Kho báu của con</h3>
    <p class="hint">${rescues?`Con đã cứu công chúa <b>${rescues}</b> lần và có <b>${owned}/${GIFTS.length}</b> món quà của vua cha.`:'Cứu công chúa để nhận quà đầu tiên từ vua cha nhé!'}</p>
    <div class="gifts">${GIFTS.map(g=>{ const c=giftCount(g);
      return `<div class="gift ${c?'':'no'}"><div class="e">${c?g[1]:'❔'}</div><div class="n">${c?g[2]:'Chưa có'}</div>${c>1?`<span class="x">×${c}</span>`:''}</div>`; }).join('')}</div></div>`;
}

function play(hero){
  const P=$('#panel'), S=$('#scene');
  let opened=0, wrong=0, answered=0, sayT=0, vilT=0;
  const qs=castleQs(20);
  S.classList.remove('free');
  const say=t=>{ const el=$('#psay'); if(!el) return; el.textContent=t; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); };
  const draw=()=>{
    document.querySelectorAll('#locks .lk').forEach((l,n)=>{ const on=n<opened; if(l.classList.contains('on')!==on){ l.classList.toggle('on',on); l.textContent=on?'🔓':'🔒'; l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); } });
    const h=$('#hero'); if(h) h.style.setProperty('--p', opened/RESCUE_N);
    const ch=$('#chead'); if(ch) ch.innerHTML=headInner();
  };
  const headInner=()=>`🔑 Đã mở <b>${opened}/${RESCUE_N}</b> ổ khoá`;
  const villain=()=>{
    const v=$('#vil'), b=$('#bars'); if(!v) return;
    $('#vb').textContent=pickOne(VILLAIN_SAY);
    v.classList.remove('swoop'); void v.offsetWidth; v.classList.add('swoop');
    const sc=$('#scene'); if(sc){ sc.classList.remove('dark'); void sc.offsetWidth; sc.classList.add('dark'); setTimeout(()=>sc.classList.remove('dark'), WRONG_WAIT); }
    sfx('whoosh');
    clearTimeout(vilT); vilT=setTimeout(()=>{ if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } draw(); }, 550);
  };
  const hooks={
    over:()=>opened>=RESCUE_N,
    head:()=>`<span id="chead">${headInner()}</span><div class="qbar"><i style="width:${opened/RESCUE_N*100}%"></i></div><span id="cwrong" title="Số lần bị khoá lại">❌ ${wrong}</span>`,
    doneLabel:'🗝️ Mở cửa tháp →',
    wrongSfx:villainLaugh,
    feedDelay:ok=>ok?0:WRONG_WAIT,
    explain:(q,ok)=>ok?'':`<div class="why rally">💪 Phù thủy vừa khoá lại 1 ổ! Trả lời đúng câu tiếp theo để giải cứu công chúa nào!</div>`,
    answer:(ok)=>{
      answered++;
      if(ok){ opened++; draw(); say(pickOne(opened>=RESCUE_N-2?PRINCESS_SAY.near:PRINCESS_SAY.ok));
        const l=document.querySelector(`#locks .lk[data-k="${opened-1}"]`);
        if(l){ const r=l.getBoundingClientRect(); FX.float(r.left+r.width/2, r.top, '🔑'); } }
      else { wrong++; if(opened>0) opened--; villain(); clearTimeout(sayT); sayT=setTimeout(()=>say(pickOne(PRINCESS_SAY.bad)),700); }
      const q=P.querySelector('.qbar i'); if(q) q.style.width=opened/RESCUE_N*100+'%';
      const cw=$('#cwrong'); if(cw) cw.textContent='❌ '+wrong;
      if(qs.length-answered<4) qs.push(...castleQs(10));     // không bao giờ hết câu hỏi
    },
  };
  say(pickOne(PRINCESS_SAY.start));
  track('start','castle');
  runQuiz(P, qs, ()=>rescued(hero, answered-wrong, answered, wrong), 'Giải cứu', hooks);
  window.scrollTo({top:0, behavior:'smooth'});
}

function rescued(hero, right, answered, wrong){
  const P=$('#panel'), S=$('#scene');
  const st = wrong===0 ? 3 : wrong<=3 ? 2 : 1;
  const title = ['','Hiệp sĩ dũng cảm','Hiệp sĩ bạc','Hiệp sĩ vàng'][st];
  track('done','castle',{s:right, n:answered, ok:1});
  const gifts=[pickGift()]; markSeen([CK('rescues'), CK('gift|'+gifts[0][0])]);
  if(st===3){ gifts.push(pickGift()); markSeen([CK('gift|'+gifts[1][0])]); }
  const bars=$('#bars'); if(bars) bars.classList.remove('shake');
  S.classList.add('free');                                        // song sắt mở, công chúa nhảy xuống, vua cha bước ra
  const ps=$('#psay'); if(ps) ps.textContent='Cảm ơn hiệp sĩ! 💖';
  sfx('magic');
  P.innerHTML=`<div class="center result rescue">
    <div class="big trophy">👸</div>
    <h3>Con đã giải cứu Công chúa Tí Hon!</h3>
    <div class="sc">Đúng ${right}/${answered} câu · ${wrong?`bị khoá lại ${wrong} lần`:'không bị khoá lại lần nào'}</div>
    <div class="st">${stars(st)}</div>
    <div class="pill">🏅 Danh hiệu: ${title}</div>
    <div class="kingbox"><div class="kface">🤴</div><div class="bubble">Cảm ơn hiệp sĩ <b>${esc(user||'')}</b> đã cứu con gái ta! Ta thưởng cho con ${gifts.length>1?'<b>2 món quà</b> vì không trả lời sai câu nào':'món quà này'}:</div></div>
    <div class="prize">${gifts.map(g=>`<button class="gbox" data-g="${esc(g[1])}" data-n="${esc(g[2])}"><span class="e">🎁</span><span class="n">Bấm để mở quà</span></button>`).join('')}</div>
    <div class="row"><button class="btn ghost" id="h">🏠 Trang chủ</button><button class="btn ghost" id="tr">🎁 Kho báu</button><button class="btn" id="again">⚔️ Chơi lại</button></div>
  </div>`;
  setTimeout(()=>{ fanfare(); FX.celebrate({power:st+1, emojis:['👸','🤴','👑','💖',...gifts.map(g=>g[1])]}); }, 600);
  P.querySelectorAll('.gbox').forEach(b=>b.onclick=()=>{
    if(b.classList.contains('open')) return;
    b.classList.add('open'); b.innerHTML=`<span class="e">${b.dataset.g}</span><span class="n">${b.dataset.n}</span>`;
    const r=b.getBoundingClientRect(); FX.burst(r.left+r.width/2, r.top+r.height/2); sfx('sparkle');
  });
  $('#h').onclick=home; $('#again').onclick=castle;
  $('#tr').onclick=()=>{ castle(); const t=$('.treasure'); if(t) t.scrollIntoView({behavior:'smooth'}); };
}

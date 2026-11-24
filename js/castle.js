/* ================== TRÒ CHƠI: GIẢI CỨU CÔNG CHÚA TÍ HON ==================
   Phù thủy Gian Gian nhốt Công chúa Tí Hon trên tháp bằng RESCUE_N ổ khoá.
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
const VILLAIN_SAY = ['Hí hí! Khoá lại! 🔒','Ha ha! Không dễ đâu!','Hí hí! Ta khoá thêm!'];

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
    <div class="villain" id="vil">🧙‍♂️<span class="vb" id="vb"></span></div>
    <div class="king" id="king">🤴</div>
    <div class="hero" id="hero" style="--p:0">${hero}<small>🗡️</small></div>
  </div>`;
}

function castle(){
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
      <p class="hint">Phù thủy Gian Gian đã nhốt Công chúa Tí Hon trên tháp cao bằng <b>${RESCUE_N} ổ khoá</b>.
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
    sfx('whoosh');
    clearTimeout(vilT); vilT=setTimeout(()=>{ if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } draw(); }, 550);
  };
  const hooks={
    over:()=>opened>=RESCUE_N,
    head:()=>`<span id="chead">${headInner()}</span><div class="qbar"><i style="width:${opened/RESCUE_N*100}%"></i></div><span id="cwrong" title="Số lần bị khoá lại">❌ ${wrong}</span>`,
    doneLabel:'🗝️ Mở cửa tháp →',
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
  runQuiz(P, qs, ()=>rescued(hero, answered-wrong, answered, wrong), 'Giải cứu', hooks);
  window.scrollTo({top:0, behavior:'smooth'});
}

function rescued(hero, right, answered, wrong){
  const P=$('#panel'), S=$('#scene');
  const st = wrong===0 ? 3 : wrong<=3 ? 2 : 1;
  const title = ['','Hiệp sĩ dũng cảm','Hiệp sĩ bạc','Hiệp sĩ vàng'][st];
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

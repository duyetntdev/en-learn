const PASS = 12, TEST_N = 15;   // bài kiểm tra 15 câu, đúng từ 12 câu là qua

/* ================== TIẾN ĐỘ ================== */
const KEY='beVuiHocTiengAnh.v1';
let progress = {};   // {lessonIndex: stars}
try{ progress = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ progress = {}; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){} }
/* Cấp độ: Cấp 1 là bài trong lessons.js, Cấp 2 lấy từ LEVEL2 (lessons2.js).
   Tiến độ lưu theo khoá "i" (Cấp 1, giữ tương thích bản cũ) và "i-2" (Cấp 2). */
const LV2 = typeof LEVEL2!=='undefined' ? LEVEL2 : {};
const nLevels = i => LV2[LESSONS[i].title] ? 2 : 1;
const lv = (i,n) => n===1 ? LESSONS[i] : Object.assign({}, LESSONS[i], LV2[LESSONS[i].title]);
const pk = (i,n) => n===1 ? String(i) : i+'-'+n;
const starsOf = (i,n) => progress[pk(i,n)]||0;
const passed = (i,n=1) => starsOf(i,n) > 0;
const unlocked = i => i===0 || passed(i-1);
const lvUnlocked = (i,n) => n===1 ? unlocked(i) : passed(i,n-1);
// Mở bài: vào cấp cao nhất đã mở (đã qua Cấp 1 thì vào thẳng Cấp 2 – nội dung mới)
const startLevel = i => { let n=1; while(n<nLevels(i) && passed(i,n)) n++; return n; };

/* Ghi nhớ câu hỏi đã gặp trong bài kiểm tra để lần sau ưu tiên câu mới */
const SEEN_KEY='beVuiHocTiengAnh.seen';
let seen = {};
try{ seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; }catch(e){ seen = {}; }
function markSeen(keys){ keys.forEach(k=>seen[k]=(seen[k]||0)+1); try{ localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); }catch(e){} }
// Lấy k phần tử ít gặp nhất; cùng số lần gặp thì chọn ngẫu nhiên
function fresh(items, k, keyOf){
  return items.map(x=>[seen[keyOf(x)]||0, Math.random(), x]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,k).map(a=>a[2]);
}

/* ================== TIỆN ÍCH ================== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const norm = s => s.toLowerCase().replace(/[^a-z' ]/g,'').replace(/\s+/g,' ').trim();
const pic = w => w[3] ? `<img src="${esc(w[3])}" alt="${esc(w[0])}">` : w[2];
const stars = n => '⭐'.repeat(n) + '☆'.repeat(3-n);

let voice = null;
function pickVoice(){
  try{
    const vs = speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
    // Ưu tiên giọng chất lượng cao (Natural/Neural/Google/Siri), tránh giọng robot kiểu eSpeak
    const us = vs.filter(v=>/en[-_]US/i.test(v.lang)).filter(v=>!/espeak/i.test(v.name));
    const rank = [/natural|neural|online/i, /google us/i, /samantha|ava|allison|siri/i, /female|zira|aria|jenny/i];
    voice = null;
    for(const re of rank){ voice = us.find(v=>re.test(v.name)); if(voice) break; }
    voice = voice || us[0] || vs[0] || null;
  }catch(e){}
}
try{ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }catch(e){}
/* Phát âm: ưu tiên file mp3 thu sẵn trong thư mục audio/, nếu thiếu thì dùng giọng đọc của trình duyệt */
const AUDIO_V = 2;   // tăng số này mỗi khi tạo lại file mp3 để trình duyệt tải bản mới
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let curAudio=null, curUtter=null;
function stopAll(){
  try{ if(curAudio){ curAudio.onended=null; curAudio.onerror=null; curAudio.pause(); } }catch(e){}
  try{ speechSynthesis.cancel(); }catch(e){}
}
function ttsSpeak(text, onend){
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang='en-US'; u.rate=0.9; u.pitch=1; if(voice) u.voice=voice;
    u.onend = ()=>onend && onend(); u.onerror = ()=>onend && onend();
    curUtter = u;                       // giữ tham chiếu để Chrome không huỷ
    setTimeout(()=>{ try{ speechSynthesis.resume(); speechSynthesis.speak(u); }catch(e){ onend && onend(); } }, 60);
  }catch(e){ onend && onend(); }
}
function speak(text, onend){
  stopAll();
  let finished=false;
  const end=()=>{ if(!finished){ finished=true; onend && onend(); } };
  let fell=false;
  const fallback=()=>{ if(fell) return; fell=true; ttsSpeak(text, end); };
  try{
    const a = new Audio('audio/'+slug(text)+'.mp3?v='+AUDIO_V);
    curAudio = a;
    a.onended = end;
    a.onerror = fallback;
    const p = a.play();
    if(p && p.catch) p.catch(err=>{
      if(err && err.name==='NotAllowedError'){ toast('🔊 Bấm vào nút loa để nghe nhé'); end(); }
      else fallback();
    });
  }catch(e){ fallback(); }
}
let actx=null;
function tone(ok){
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    const notes = ok ? [523,659,784] : [330,262];
    notes.forEach((f,k)=>{
      const o=actx.createOscillator(), g=actx.createGain();
      o.type='sine'; o.frequency.value=f; o.connect(g); g.connect(actx.destination);
      const t=actx.currentTime+k*0.12;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.2,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
      o.start(t); o.stop(t+0.3);
    });
  }catch(e){}
}
function fanfare(){
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    [523,659,784,1047,784,1047].forEach((f,k)=>{
      const o=actx.createOscillator(), g=actx.createGain();
      o.type='triangle'; o.frequency.value=f; o.connect(g); g.connect(actx.destination);
      const t=actx.currentTime+k*0.09;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.18,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
      o.start(t); o.stop(t+0.25);
    });
  }catch(e){}
}
function wahwah(){
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    const f=actx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1100; f.connect(actx.destination);
    [[392,0,.22],[370,.25,.22],[349,.5,.22],[330,.75,.7]].forEach(([hz,at,len],k)=>{
      const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime+at;
      o.type='sawtooth'; o.frequency.setValueAtTime(hz,t);
      if(k===3){ const lfo=actx.createOscillator(), lg=actx.createGain();   // nốt cuối rung rung
        lfo.frequency.value=6; lg.gain.value=9; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t+len);
        o.frequency.linearRampToValueAtTime(hz-25,t+len); }
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.09,t+0.03);
      g.gain.setValueAtTime(0.09,t+len-0.08); g.gain.exponentialRampToValueAtTime(0.0001,t+len);
      o.connect(g); g.connect(f); o.start(t); o.stop(t+len+0.02);
    });
  }catch(e){}
}
let lastBoom=0;
function boom(){
  const now=Date.now(); if(now-lastBoom<120) return; lastBoom=now;   // tránh nổ dồn quá to
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    const len=actx.sampleRate*0.35, buf=actx.createBuffer(1,len,actx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
    const src=actx.createBufferSource(), f=actx.createBiquadFilter(), g=actx.createGain();
    src.buffer=buf; f.type='lowpass'; f.frequency.value=900+Math.random()*900; g.gain.value=0.12;
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
  }catch(e){}
}
FX.onBoom = boom;
function cheer(el, big){
  const r = el ? el.getBoundingClientRect() : {left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  const x=r.left+r.width/2, y=r.top+r.height/2;
  FX.burst(x,y);
  FX.float(x, r.top, big ? '+1 ⭐🔥' : '+1 ⭐');
}
function oops(el){
  const r = el ? el.getBoundingClientRect() : {left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  FX.oops(r.left+r.width/2, r.top);   // phía trên ô đáp án, không che chữ
  const pn=$('#panel'); if(pn){ pn.classList.remove('oops'); void pn.offsetWidth; pn.classList.add('oops'); }
}
function toast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}
function confetti(){
  const cols=['#FF8A5B','#FFC94A','#2FB36B','#4F86F7','#E8559A','#8E62F0'];
  for(let i=0;i<90;i++){
    const c=document.createElement('div'); c.className='confetti';
    c.style.left=Math.random()*100+'vw'; c.style.background=cols[i%cols.length];
    c.style.animationDuration=(2+Math.random()*2)+'s'; c.style.animationDelay=Math.random()*.5+'s';
    c.style.borderRadius = Math.random()>.5?'50%':'3px';
    document.body.appendChild(c); setTimeout(()=>c.remove(),4600);
  }
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-say]'); if(s) speak(s.dataset.say);
});

/* ================== TRANG CHỦ ================== */
function home(){
  document.documentElement.style.setProperty('--c','#FF8A5B');
  const done = LESSONS.filter((_,i)=>passed(i)).length;
  const cur = LESSONS.findIndex((_,i)=>!passed(i));
  const done2 = LESSONS.filter((_,i)=>nLevels(i)>1 && passed(i,2)).length;
  $('#app').innerHTML = `
  <div class="top">
    <div class="logo"><div class="owl">🦉</div><div><h1>Bé Vui Học <span>Tiếng Anh</span></h1><p>Học mỗi ngày một chút — vui ơi là vui!</p></div></div>
    <div class="prog"><b>🏅 ${done}/${LESSONS.length} bài đã qua${done2?` · 🆕 ${done2} Cấp 2`:''}</b><div class="bar"><i style="width:${done/LESSONS.length*100}%"></i></div></div>
  </div>
  <div class="hello"><div style="font-size:40px">🦉</div><div class="bubble">${
    done===LESSONS.length ? (LESSONS.every((_,i)=>passed(i,nLevels(i))) ? 'Tuyệt vời! Con đã qua cả 2 cấp của mọi bài! 🎓 Làm lại để gặp câu hỏi mới nhé.' : 'Tuyệt vời! Con đã qua tất cả bài Cấp 1! 🎓 Bấm vào một bài để học <b>Cấp 2</b> với nội dung mới nhé.')
    : done===0 ? 'Xin chào! Mình là cú Ollie. Bắt đầu với <b>Bài 1</b> nhé! Làm đúng bài kiểm tra để mở khoá bài tiếp theo 🔓'
    : `Giỏi quá! Tiếp tục với <b>Bài ${cur+1}: ${LESSONS[cur].title}</b> nào!`}</div></div>
  <div class="grid">${LESSONS.map((L,i)=>{
    const lock=!unlocked(i), st=starsOf(i,1), N=nLevels(i), st2=N>1?starsOf(i,2):0;
    const state = lock ? 'Qua bài '+i+' để mở khoá'
      : !st ? '▶ Bắt đầu học'
      : N>1 && !st2 ? '🆕 Cấp 2 đã mở — học tiếp'
      : '✅ Đã qua — làm lại với câu hỏi mới';
    return `<button class="lcard ${lock?'locked':''} ${i===cur?'current':''}" style="--c:${L.color}" data-open="${i}" aria-label="Bài ${i+1} ${L.title}${lock?' (đang khoá)':''}">
      ${lock?'<span class="lock">🔒</span>':st?`<span class="stars">${stars(st)}</span>`:''}
      <div class="ic">${L.icon}</div>
      <div class="num">Bài ${i+1}</div><h3>${L.title}</h3><div class="vi">${L.vi}</div>
      ${N>1&&st?`<div class="lvrow"><span class="lvtag">Cấp 1 ${stars(st)}</span><span class="lvtag ${st2?'':'new'}">Cấp 2 ${st2?stars(st2):'🆕'}</span></div>`:''}
      <div class="state">${state}</div>
    </button>`;}).join('')}</div>
  <div class="foot"><span>Tiến độ được lưu trên trình duyệt này. Bật loa để nghe phát âm 🔊</span><button class="link" id="reset">Xoá tiến độ</button></div>`;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.open;
    if(!unlocked(i)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast(`🔒 Con cần qua bài kiểm tra Bài ${i} trước nhé!`); return; }
    lesson(i,'vocab',startLevel(i));
  });
  $('#reset').onclick=()=>{
    const m=document.createElement('div'); m.className='modal';
    m.innerHTML=`<div class="box"><div style="font-size:50px">🗑️</div><h3>Xoá toàn bộ tiến độ?</h3><p class="hint">Tất cả bài sẽ bị khoá lại trừ Bài 1.</p><div class="row"><button class="btn ghost" id="no">Không</button><button class="btn" id="yes" style="--c:#F0554A">Xoá</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#no').onclick=()=>m.remove();
    m.querySelector('#yes').onclick=()=>{progress={};save();seen={};try{localStorage.removeItem(SEEN_KEY);}catch(e){}m.remove();home();};
  };
  stopAll();
  window.scrollTo(0,0);
}

/* ================== BÀI HỌC ================== */
const TABS=[['vocab','📚 Từ vựng'],['dialog','💬 Hội thoại'],['grammar','✏️ Ngữ pháp'],['practice','🎯 Luyện tập'],['test','🏆 Kiểm tra']];
function lesson(i,tab,n=1){
  const L=lv(i,n), N=nLevels(i), st=starsOf(i,n);
  document.documentElement.style.setProperty('--c',L.color);
  stopAll();
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">${L.icon}</div>
    <div><div class="sub">Bài ${i+1} · ${N>1?'Cấp '+n+' · ':''}${L.vi} ${st?'· '+stars(st):''}</div><h2>${L.title}</h2></div></div>
  ${N>1?`<div class="lvsw">${Array.from({length:N},(_,k)=>k+1).map(m=>`<button class="lvbtn ${m===n?'on':''} ${lvUnlocked(i,m)?'':'locked'}" data-lv="${m}">Cấp ${m} ${!lvUnlocked(i,m)?'🔒':starsOf(i,m)?stars(starsOf(i,m)):m>1?'🆕':''}</button>`).join('')}</div>`:''}
  <div class="tabs">${TABS.map(([k,t])=>`<button class="tab ${k===tab?'on':''}" data-tab="${k}">${t}</button>`).join('')}</div>
  <div class="panel" id="panel"></div>`;
  $('#back').onclick=home;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>lesson(i,b.dataset.tab,n));
  document.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{
    const m=+b.dataset.lv;
    if(!lvUnlocked(i,m)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast(`🔒 Qua bài kiểm tra Cấp ${m-1} để mở Cấp ${m} nhé!`); return; }
    lesson(i,'vocab',m);
  });
  const P=$('#panel');
  const next=(k,label)=>`<div class="nextrow"><button class="btn" id="nx">${label} →</button></div>`;
  const wireNext=k=>{const b=$('#nx'); if(b) b.onclick=()=>{lesson(i,k,n);window.scrollTo({top:0,behavior:'smooth'});};};

  if(tab==='vocab'){
    P.innerHTML=`<h3>📚 Từ vựng</h3><p class="hint">Bấm vào thẻ để nghe cách đọc, rồi đọc to theo nhé!</p>
    <div class="vgrid">${L.words.map(w=>`<button class="vcard" data-say="${esc(w[0])}"><div class="pic">${pic(w)}</div><div class="w">${w[0]}</div><div class="m">${w[1]}</div></button>`).join('')}</div>
    ${next('dialog','Sang Hội thoại')}`;
    P.querySelectorAll('.vcard').forEach(c=>c.addEventListener('click',()=>{c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');}));
    wireNext('dialog');
  }
  if(tab==='dialog'){
    const names=Object.keys(L.people);
    P.innerHTML=`<h3>💬 Hội thoại</h3><p class="hint">Nghe cả đoạn, hoặc bấm vào từng câu để nghe lại.</p>
    <div class="tools"><button class="btn" id="playall">▶ Nghe cả đoạn</button><button class="btn ghost" id="tvi">🙈 Ẩn tiếng Việt</button></div>
    <div class="dlg" id="dlg">${L.dialog.map((d,k)=>`<div class="line ${d[0]===names[1]?'r':''}"><div class="ava">${L.people[d[0]]}</div>
      <button class="msg" data-say="${esc(d[1])}" id="m${k}"><div class="who">${d[0]}</div><div class="en">${d[1]}</div><div class="vn">${d[2]}</div></button></div>`).join('')}</div>
    ${next('grammar','Sang Ngữ pháp')}`;
    $('#tvi').onclick=e=>{const h=$('#dlg').classList.toggle('hide-vi'); e.currentTarget.textContent=h?'👀 Hiện tiếng Việt':'🙈 Ẩn tiếng Việt';};
    $('#playall').onclick=()=>{
      let k=0;
      const step=()=>{
        document.querySelectorAll('.msg').forEach(m=>m.classList.remove('speaking'));
        if(k>=L.dialog.length) return;
        const m=$('#m'+k); if(!m) return; m.classList.add('speaking');
        speak(L.dialog[k][1],()=>{k++;setTimeout(step,350);});
      };
      step();
    };
    wireNext('grammar');
  }
  if(tab==='grammar'){
    const G=L.grammar;
    P.innerHTML=`<h3>✏️ Ngữ pháp: ${G.title}</h3><p class="hint">Đọc cùng bố mẹ và nghe các ví dụ nhé.</p>
    <div class="rule"><ul>${G.points.map(p=>`<li>${p}</li>`).join('')}</ul></div>
    ${G.examples.map(x=>`<div class="ex"><button class="say" data-say="${esc(x[0])}" aria-label="Nghe">🔊</button><div><div class="en">${x[0]}</div><div class="vn">${x[1]}</div></div></div>`).join('')}
    <div class="tip">${G.tip}</div>
    ${next('practice','Sang Luyện tập')}`;
    wireNext('practice');
  }
  if(tab==='practice'){
    const start=()=>runQuiz(P, makePractice(L), (sc,q)=>{
      P.innerHTML=`<div class="center result"><div class="big">${sc>=q-1?'🌟':sc>=q/2?'👍':'💪'}</div><h3>Luyện tập xong!</h3>
      <div class="sc">Đúng ${sc}/${q} câu</div><p class="hint">${sc>=q-1?'Con đã sẵn sàng làm bài kiểm tra!':'Luyện thêm một lượt nữa cho chắc nhé.'}</p>
      <div class="row"><button class="btn ghost" id="again">🔁 Luyện tiếp</button><button class="btn" id="totest">🏆 Làm bài kiểm tra</button></div></div>`;
      $('#again').onclick=start; $('#totest').onclick=()=>lesson(i,'test',n);
      if(sc>=q-1){ FX.show(1800); fanfare(); }
    });
    start();
  }
  if(tab==='test'){
    const unlockMsg = n===1 ? (N>1?'🔓 Qua bài để mở bài tiếp theo và Cấp 2':'🔓 Qua bài để mở bài tiếp theo') : '🌟 Thử thách Cấp '+n;
    P.innerHTML=`<div class="testintro"><div class="big">🏆</div><h3>Bài kiểm tra Bài ${i+1}${N>1?' · Cấp '+n:''}</h3>
      <p class="hint">Gồm từ vựng, nghe, ngữ pháp, sắp xếp câu và hội thoại.</p>
      <div><span class="pill">📝 ${TEST_N} câu</span><span class="pill">✅ Cần đúng ${PASS} câu</span><span class="pill">${unlockMsg}</span></div>
      ${st?`<p class="hint" style="margin-top:12px">Kết quả tốt nhất: ${stars(st)} · Lần này có câu hỏi mới 🆕</p>`:''}
      <div class="row"><button class="btn" id="go">Bắt đầu kiểm tra</button></div></div>`;
    $('#go').onclick=()=>runQuiz(P, makeTest(L,pk(i,n)), (sc,q)=>testResult(i,n,sc,q), 'Kiểm tra');
  }
  window.scrollTo(0,0);
}

/* ================== TẠO CÂU HỎI ================== */
function vocabQ(L, w, kind){
  const others = shuffle(L.words.filter(x=>x!==w)).slice(0,3);
  const opts = shuffle([w,...others]);
  if(kind==='pic') return {type:'choice',
    prompt:`<div class="ask">Đây là gì?</div><div class="big">${pic(w)}</div>`,
    options:opts.map(o=>({label:o[0],val:o[0]})), answer:w[0], show:w[0], sayAfter:w[0]};
  if(kind==='word') return {type:'choice', emo:true,
    prompt:`<div class="ask">Chọn hình đúng với từ:</div><div class="sent">${w[0]} <button class="say" data-say="${esc(w[0])}">🔊</button></div>`,
    options:opts.map(o=>({label:pic(o),val:o[0]})), answer:w[0], show:pic(w)+' '+w[0], sayAfter:w[0]};
  if(kind==='vi') return {type:'choice',
    prompt:`<div class="ask">🇻🇳 → 🇬🇧 Chọn từ tiếng Anh có nghĩa là:</div><div class="sent">“${esc(w[1])}”</div>`,
    options:opts.map(o=>({label:o[0],val:o[0]})), answer:w[0], show:w[0], sayAfter:w[0]};
  if(kind==='en') return {type:'choice',
    prompt:`<div class="ask">🇬🇧 → 🇻🇳 Từ này nghĩa là gì?</div><div class="sent">${w[0]} <button class="say" data-say="${esc(w[0])}">🔊</button></div>`,
    options:opts.map(o=>({label:o[1],val:o[0]})), answer:w[0], show:w[1], sayAfter:w[0]};
  return {type:'choice', autosay:w[0],
    prompt:`<div class="ask">🎧 Nghe và chọn từ đúng</div><button class="listen" data-say="${esc(w[0])}" aria-label="Nghe">🔊</button>`,
    options:opts.map(o=>({label:o[0],val:o[0]})), answer:w[0], show:w[0]};
}
function fillQ(f){
  return {type:'choice',
    prompt:`<div class="ask">Chọn từ đúng điền vào chỗ trống:</div><div class="sent">${f[0].replace('___','<span class="blank">&nbsp;?&nbsp;</span>')}</div>`,
    options:shuffle(f[2]).map(o=>({label:o,val:o})), answer:f[1], show:f[1], sayAfter:/[a-z]/i.test(f[0].split('=')[0]) && !f[0].includes('=') ? f[0].replace('___',f[1]).replace(/[^\x00-\x7F]/g,'') : null};
}
const sentencePool = L => [...new Set([...L.grammar.examples.map(x=>x[0]), ...L.order])];
function sentenceQ(L, ans){
  const pool=sentencePool(L);
  ans = ans || shuffle(pool)[0];
  const wrong=shuffle(pool.filter(x=>norm(x)!==norm(ans))).slice(0,2);
  return {type:'choice', autosay:ans,
    prompt:`<div class="ask">🎧 Nghe và chọn câu đúng</div><button class="listen" data-say="${esc(ans)}" aria-label="Nghe">🔊</button>`,
    options:shuffle([ans,...wrong]).map(o=>({label:o,val:o})), answer:ans, show:ans};
}
function orderQ(s){ return {type:'order', answer:s}; }
function dialogQ(L,d){
  return {type:'choice',
    prompt:`<div class="ask">💬 Theo hội thoại:</div><div class="sent" style="font-size:24px">${d[0]}</div>`,
    options:shuffle(d[2]).map(o=>({label:o,val:o})), answer:d[1], show:d[1]};
}
function makePractice(L){
  const ws=shuffle(L.words);
  return shuffle([vocabQ(L,ws[0],'pic'),vocabQ(L,ws[1],'vi'),vocabQ(L,ws[2],'word'),vocabQ(L,ws[3],'en'),vocabQ(L,ws[4],'listen'),
    ...shuffle(L.fill).slice(0,2).map(fillQ), orderQ(shuffle(L.order)[0])]);
}
function makeTest(L, key){
  // 8 câu từ vựng (8 từ khác nhau) + 3 điền từ + 2 sắp xếp câu + 1 nghe câu + 1 hội thoại = 15
  // Mỗi phần ưu tiên những câu bé chưa gặp trong các lần kiểm tra trước.
  const K = t => x => key+'|'+t+'|'+(Array.isArray(x)?x[0]:x);
  const ws=fresh(L.words,8,K('w')), fs=fresh(L.fill,3,K('f')), os=fresh(L.order,2,K('o'));
  const ss=fresh(sentencePool(L),1,K('s')), ds=fresh(L.dq,1,K('d'));
  markSeen([...ws.map(K('w')),...fs.map(K('f')),...os.map(K('o')),...ss.map(K('s')),...ds.map(K('d'))]);
  const kinds=shuffle(['pic','pic','word','word','listen','listen','vi','en']);
  const qs=[...kinds.map((k,j)=>vocabQ(L,ws[j],k)), ...fs.map(fillQ), ...os.map(orderQ), sentenceQ(L,ss[0]), dialogQ(L,ds[0])];
  return shuffle(qs).slice(0,TEST_N);
}

/* ================== BỘ CHẠY CÂU HỎI ================== */
function runQuiz(P, qs, onDone, label){
  let k=0, score=0, streak=0;
  const praise=['🎉 Giỏi lắm!','🌟 Tuyệt vời!','👏 Chính xác!','🥳 Đúng rồi!','🚀 Siêu quá!','💯 Hoàn hảo!','🦄 Xuất sắc!','🎈 Con giỏi quá!'];
  const oopsMsg=['🙈 Ê xì! Sai mất rồi!','😜 Ê xì! Suýt nữa thì đúng!','🤪 Ối, ê xì!','🙊 Ê xì! Câu sau cố lên nhé!'];
  const streakMsg=n=> n>=TEST_N ? '👑 Không sai câu nào!' : n>=6 ? `🌈 ${n} câu đúng liên tiếp! Vô địch!` : `🔥 ${n} câu đúng liên tiếp!`;
  function show(){
    if(k>=qs.length) return onDone(score, qs.length);
    const q=qs[k];
    P.innerHTML=`<div class="qhead"><span>${label?label+' · ':''}Câu ${k+1}/${qs.length}</span><div class="qbar"><i style="width:${k/qs.length*100}%"></i></div><span id="qs">⭐ ${score}</span></div>
      <div class="qprompt">${q.type==='order'?'<div class="ask">🧩 Sắp xếp các từ thành câu đúng</div><button class="say" data-say="'+esc(q.answer)+'" aria-label="Nghe gợi ý" style="margin-top:8px">🔊</button>':q.prompt}</div>
      <div id="qb"></div><div class="feed" id="fd"></div>`;
    const B=$('#qb');
    if(q.autosay) setTimeout(()=>speak(q.autosay),250);
    if(q.type==='choice'){
      B.innerHTML=`<div class="opts">${q.options.map((o,n)=>`<button class="opt ${q.emo?'emo':''}" data-n="${n}">${o.label}</button>`).join('')}</div>`;
      B.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        const o=q.options[+b.dataset.n], ok=o.val===q.answer;
        B.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(q.options[+x.dataset.n].val===q.answer) x.classList.add('right');});
        if(!ok) b.classList.add('wrong'); else b.classList.add('yay');
        done(ok, q.show, q.sayAfter, b);
      });
    } else {
      const words=q.answer.split(' ');
      let bank=words.map((w,n)=>({w,n})); let tries=0;
      do{ bank=shuffle(bank); tries++; }while(bank.map(x=>x.w).join(' ')===q.answer && tries<10);
      let placed=[];
      const draw=()=>{
        B.innerHTML=`<div class="zone ans" id="za">${placed.length?placed.map((t,n)=>`<button class="tile" data-p="${n}">${t.w}</button>`).join(''):'<span class="hint" style="margin:0">Bấm vào các từ bên dưới…</span>'}</div>
          <div class="zone" id="zb">${bank.map((t,n)=>`<button class="tile" data-b="${n}">${t.w}</button>`).join('')}</div>
          <div class="row" style="margin-top:4px"><button class="btn" id="chk" ${bank.length?'disabled':''}>Kiểm tra</button></div>`;
        B.querySelectorAll('[data-b]').forEach(t=>t.onclick=()=>{placed.push(bank.splice(+t.dataset.b,1)[0]);draw();});
        B.querySelectorAll('[data-p]').forEach(t=>t.onclick=()=>{bank.push(placed.splice(+t.dataset.p,1)[0]);draw();});
        $('#chk').onclick=()=>{
          const ok=norm(placed.map(t=>t.w).join(' '))===norm(q.answer);
          $('#za').classList.add(ok?'right':'wrong');
          B.querySelectorAll('.tile,#chk').forEach(x=>x.disabled=true);
          done(ok, q.answer, q.answer, $('#za'));
        };
      };
      draw();
    }
  }
  function done(ok, right, say, el){
    if(ok){ score++; streak++; } else streak=0;
    const hot = ok && streak>=3 && streak%3===0;
    if(ok) tone(true); else { wahwah(); oops(el); }
    if(ok){
      cheer(el, streak>=3);
      const qs=$('#qs'); if(qs){ qs.textContent='⭐ '+score; qs.classList.remove('bump'); void qs.offsetWidth; qs.classList.add('bump'); }
      const pr=P.querySelector('.qprompt'); if(pr){ pr.classList.remove('cheer'); void pr.offsetWidth; pr.classList.add('cheer'); }
    }
    if(hot){ setTimeout(()=>{ fanfare(); FX.show(1400); FX.banner(streakMsg(streak)); },250); }
    if(ok && say) setTimeout(()=>speak(say),450);
    const F=$('#fd'); F.className='feed '+(ok?'ok':'no');
    F.innerHTML=`<span>${ok?praise[Math.floor(Math.random()*praise.length)]:oopsMsg[Math.floor(Math.random()*oopsMsg.length)]+' Đáp án: <b style="color:var(--ink)">'+right+'</b>'}</span>
      <button class="btn" id="cont">${k+1<qs.length?'Tiếp tục →':'Xem kết quả →'}</button>`;
    $('#cont').onclick=()=>{k++;show();};
    $('#cont').focus({preventScroll:true});
  }
  show();
}

function testResult(i,lvl,sc,n){
  const P=$('#panel'), ok=sc>=PASS, st= sc>=n?3: sc>=n-2?2: ok?1:0;
  const first=!passed(i,lvl), key=pk(i,lvl), N=nLevels(i), hasNext=lvl<N;
  if(ok){ progress[key]=Math.max(progress[key]||0,st); save(); confetti(); fanfare(); FX.show(st===3?5000:3000); }
  const last=i===LESSONS.length-1;
  const unlockMsg = !first ? 'Làm tốt lắm! Lần sau làm lại sẽ có câu hỏi mới 🆕'
    : lvl===1 ? [hasNext?`🆕 Đã mở <b>Cấp 2</b> của bài này`:'', last?'':`🔓 Đã mở khoá Bài ${i+2}: ${LESSONS[i+1].title}`].filter(Boolean).join('<br>') || 'Con đã hoàn thành tất cả các bài học! 🎓'
    : `🌟 Con đã chinh phục Cấp ${lvl}!`;
  P.innerHTML=`<div class="center result">
    <div class="big">${ok?'🏆':'🌱'}</div>
    <h3>${ok?'Con đã qua bài!':'Gần được rồi!'}</h3>
    <div class="sc">Đúng ${sc}/${n} câu ${ok?'':'— cần '+PASS+' câu để qua bài'}</div>
    ${ok?`<div class="st">${stars(st)}</div>`:''}
    <p class="hint">${ok?unlockMsg:'Ôn lại từ vựng và ngữ pháp rồi thử lại nhé (lần sau có câu hỏi mới). Con làm được mà! 💪'}</p>
    <div class="row">${ok
      ? `<button class="btn ghost" id="r1">🏠 Trang chủ</button>${hasNext?`<button class="btn" id="r3">🆕 Học Cấp ${lvl+1} →</button>`:''}${last?'':`<button class="btn ${hasNext?'ghost':''}" id="r2">Bài ${i+2} →</button>`}`
      : `<button class="btn ghost" id="r1">📚 Ôn lại bài</button><button class="btn" id="r2">🔁 Làm lại</button>`}</div></div>`;
  if(ok){ $('#r1').onclick=home;
    const r2=$('#r2'); if(r2) r2.onclick=()=>lesson(i+1,'vocab',startLevel(i+1));
    const r3=$('#r3'); if(r3) r3.onclick=()=>lesson(i,'vocab',lvl+1); }
  else { $('#r1').onclick=()=>lesson(i,'vocab',lvl); $('#r2').onclick=()=>runQuiz(P, makeTest(lv(i,lvl),key), (s,m)=>testResult(i,lvl,s,m), 'Kiểm tra'); }
}

home();

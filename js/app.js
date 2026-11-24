const PASS = 12, TEST_N = 15;   // bài kiểm tra 15 câu, đúng từ 12 câu là qua

/* ================== TIẾN ĐỘ ================== */
const KEY='beVuiHocTiengAnh.v1';
let progress = {};   // {lessonIndex: stars}
try{ progress = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ progress = {}; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){} scheduleSync(); }
/* Cấp độ: Cấp 1 là bài trong lessons.js, Cấp 2 lấy từ LEVEL2 (lessons2.js), Cấp 3 từ LEVEL3 (lessons3.js).
   Qua cấp trước mới mở cấp sau. Tiến độ lưu theo khoá "i" (Cấp 1, giữ tương thích bản cũ), "i-2", "i-3". */
const EXTRA = [typeof LEVEL2!=='undefined'?LEVEL2:{}, typeof LEVEL3!=='undefined'?LEVEL3:{}];   // Cấp 2, Cấp 3, ...
const nLevels = i => { let n=1; while(EXTRA[n-1] && EXTRA[n-1][LESSONS[i].title]) n++; return n; };
const lv = (i,n) => n===1 ? LESSONS[i] : Object.assign({}, LESSONS[i], EXTRA[n-2][LESSONS[i].title]);
const pk = (i,n) => n===1 ? String(i) : i+'-'+n;
const starsOf = (i,n) => progress[pk(i,n)]||0;
const passed = (i,n=1) => starsOf(i,n) > 0;
// Bé được tự chọn bài và cấp bất kỳ. Đổi thành false để quay lại kiểu khoá: qua bài trước mới mở bài sau.
const FREE_CHOICE = true;
const unlocked = i => FREE_CHOICE || i===0 || passed(i-1);
const lvUnlocked = (i,n) => FREE_CHOICE || (n===1 ? unlocked(i) : passed(i,n-1));
// Phần trăm hoàn thành: mỗi bài chiếm phần bằng nhau, qua mỗi cấp được 1/số cấp của bài đó
const lessonDone = i => { let c=0; for(let m=1;m<=nLevels(i);m++) if(passed(i,m)) c++; return c; };
const lessonPct = i => Math.round(lessonDone(i)/nLevels(i)*100);
const totalPct = () => Math.round(LESSONS.reduce((a,_,i)=>a+lessonDone(i)/nLevels(i),0)/LESSONS.length*100);
// Mở bài: vào cấp cao nhất đã mở (qua Cấp 1 thì vào thẳng Cấp 2, qua Cấp 2 thì vào Cấp 3 – nội dung mới)
const startLevel = i => { let n=1; while(n<nLevels(i) && passed(i,n)) n++; return n; };

/* Ghi nhớ câu hỏi đã gặp trong bài kiểm tra để lần sau ưu tiên câu mới */
const SEEN_KEY='beVuiHocTiengAnh.seen';
let seen = {};
try{ seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; }catch(e){ seen = {}; }
function saveSeen(){ try{ localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); }catch(e){} }
function markSeen(keys){ keys.forEach(k=>seen[k]=(seen[k]||0)+1); saveSeen(); scheduleSync(); }
// Lấy k phần tử ít gặp nhất; cùng số lần gặp thì chọn ngẫu nhiên
function fresh(items, k, keyOf){
  return items.map(x=>[seen[keyOf(x)]||0, Math.random(), x]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,k).map(a=>a[2]);
}

/* ================== NGƯỜI HỌC & ĐỒNG BỘ ==================
   Bé nhập tên (chỉ chữ không dấu và số, 3–20 ký tự, không trùng). Tiến độ lưu trên máy chủ
   (server/app.py) theo tên, nên học trên máy khác chỉ cần nhập đúng tên. Trình duyệt vẫn giữ
   một bản sao để học được khi mất mạng; có mạng lại thì tự gửi lên. Máy chủ gộp theo số sao
   lớn nhất nên hai thiết bị không ghi đè mất tiến độ của nhau. */
const USER_KEY='beVuiHocTiengAnh.user';
const NAME_RE=/^[A-Za-z0-9]{3,20}$/;
let user=null;
try{ user=localStorage.getItem(USER_KEY)||null; }catch(e){}
let syncTimer=0, syncState='ok';                       // 'ok' | 'saving' | 'offline'
const mergeMax=(a,b)=>{ const o=Object.assign({},a); for(const k in b) o[k]=Math.max(o[k]||0, b[k]||0); return o; };
async function api(method, path, body, keepalive){
  const r=await fetch(path,{method, keepalive:!!keepalive, cache:'no-store',
    headers: body?{'Content-Type':'application/json'}:{}, body: body?JSON.stringify(body):undefined});
  let data=null; try{ data=await r.json(); }catch(e){}
  return {status:r.status, data};
}
const userUrl = n => 'api/users/'+encodeURIComponent(n);
function setSync(st){ syncState=st; const el=$('#sync'); if(el) el.outerHTML=syncBadge(); }
const syncBadge = () => `<span id="sync" class="sync ${syncState}">${syncState==='ok'?'☁️ Đã lưu':syncState==='saving'?'⏳ Đang lưu…':'⚠️ Chưa lưu được — sẽ thử lại khi có mạng'}</span>`;
// Nhận dữ liệu từ máy chủ: gộp với bản trong máy (không bao giờ làm mất sao đã có)
function absorb(d){
  if(!d) return;
  progress=mergeMax(progress, d.progress||{}); seen=mergeMax(seen, d.seen||{});
  try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){}
  saveSeen();
}
function scheduleSync(){ if(!user) return; clearTimeout(syncTimer); setSync('saving'); syncTimer=setTimeout(()=>sync(),700); }
async function sync(keepalive){
  if(!user) return;
  clearTimeout(syncTimer);
  try{
    const r=await api('PUT', userUrl(user), {progress, seen}, keepalive);
    if(r.status===404){                                   // máy chủ chưa có (vd. dữ liệu bị xoá): tạo lại
      const c=await api('POST','api/users',{name:user, progress, seen});
      if(c.status!==201) throw new Error(c.status);
      absorb(c.data);
    } else if(r.status!==200) throw new Error(r.status);
    else absorb(r.data);
    setSync('ok');
  }catch(e){ setSync('offline'); syncTimer=setTimeout(()=>sync(),15000); }
}
addEventListener('online', ()=>{ if(syncState==='offline') sync(); });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden' && syncState!=='ok') sync(true); });
// Mở trang: lấy tiến độ mới nhất trên máy chủ (bé có thể vừa học ở máy khác)
async function refreshFromServer(){
  if(!user) return;
  try{
    const r=await api('GET', userUrl(user));
    if(r.status===200){ absorb(r.data); setSync('ok'); if($('.grid')) home(); }
    if(r.status===200 || r.status===404) sync();          // gửi phần máy này có mà máy chủ chưa có
  }catch(e){ setSync('offline'); }
}

function login(){
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#FF8A5B');
  const legacy = Object.keys(progress).length>0;          // tiến độ cũ trước khi có tính năng tên
  $('#app').innerHTML=`
  <div class="login">
    <div class="owl big">🦉</div>
    <h1>Bé Vui Học <span>Tiếng Anh</span></h1>
    <p class="hint">Nhập tên của con để lưu quá trình học. Sang máy khác, chỉ cần nhập đúng tên này là học tiếp được!</p>
    <form id="lf" autocomplete="off" novalidate>
      <label for="nm">Tên của con</label>
      <input id="nm" maxlength="20" inputmode="latin" autocapitalize="off" spellcheck="false" placeholder="ví dụ: Bong2019">
      <div class="nmhelp" id="nh">Chỉ dùng chữ không dấu (a–z) và số, dài 3–20 ký tự, không có dấu cách.</div>
      <button class="btn" id="go" type="submit">Bắt đầu học →</button>
    </form>
    <div id="lmsg"></div>
    ${legacy?'<p class="hint small">💡 Tiến độ con đã học trên máy này sẽ được chuyển vào tên mới.</p>':''}
  </div>`;
  const nm=$('#nm'), nh=$('#nh'), msg=$('#lmsg');
  const check=()=>{
    const v=nm.value, bad=v && !NAME_RE.test(v);
    nh.classList.toggle('bad', !!bad);
    nh.textContent = !v ? 'Chỉ dùng chữ không dấu (a–z) và số, dài 3–20 ký tự, không có dấu cách.'
      : /[^A-Za-z0-9]/.test(v) ? '❌ Không dùng dấu, dấu cách hay ký tự đặc biệt — chỉ chữ a–z và số.'
      : v.length<3 ? '❌ Tên cần ít nhất 3 ký tự.' : '✅ Tên hợp lệ';
    return !bad && !!v;
  };
  nm.oninput=()=>{ check(); msg.innerHTML=''; };
  nm.focus();
  const busy=on=>{ $('#go').disabled=on; $('#go').textContent=on?'Đang kiểm tra…':'Bắt đầu học →'; };
  const enter=d=>{
    user=d.name; try{ localStorage.setItem(USER_KEY,user); }catch(e){}
    absorb(d); setSync('ok'); sync(); home();
    toast(`👋 Chào ${user}! Tiến độ của con sẽ được lưu tự động.`);
  };
  const fail=()=>{ msg.innerHTML='<div class="lbox bad">📡 Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.</div>'; busy(false); };
  $('#lf').onsubmit=async e=>{
    e.preventDefault();
    if(!check()){ nm.focus(); return; }
    const name=nm.value; busy(true);
    try{
      const r=await api('GET', userUrl(name));
      busy(false);
      if(r.status===200){
        const d=r.data, n=LESSONS.filter((_,i)=>(d.progress||{})[pk(i,1)]>0).length;
        msg.innerHTML=`<div class="lbox"><div style="font-size:40px">🎒</div><b>Tên "${esc(d.name)}" đã có người học</b> — đã qua ${n}/${LESSONS.length} bài.
          <p class="hint" style="margin:6px 0 0">Đây có đúng là con không?</p>
          <div class="row"><button class="btn ghost" id="no">Không phải, đổi tên khác</button><button class="btn" id="yes">Đúng là con — học tiếp</button></div></div>`;
        $('#no').onclick=()=>{ msg.innerHTML=''; nm.select(); };
        $('#yes').onclick=()=>enter(d);
      } else if(r.status===404){
        msg.innerHTML=`<div class="lbox"><div style="font-size:40px">✨</div><b>"${esc(name)}"</b> là tên mới. Tạo hồ sơ cho con nhé?
          <div class="row"><button class="btn ghost" id="no">Sửa lại tên</button><button class="btn" id="yes">Tạo hồ sơ</button></div></div>`;
        $('#no').onclick=()=>{ msg.innerHTML=''; nm.select(); };
        $('#yes').onclick=async()=>{
          try{
            const c=await api('POST','api/users',{name, progress, seen});
            if(c.status===201) enter(c.data);
            else if(c.status===409) msg.innerHTML='<div class="lbox bad">😮 Tên này vừa có người khác dùng mất rồi. Chọn tên khác nhé!</div>';
            else msg.innerHTML=`<div class="lbox bad">❌ ${esc((c.data&&c.data.error)||'Có lỗi, thử lại nhé.')}</div>`;
          }catch(e){ fail(); }
        };
      } else msg.innerHTML=`<div class="lbox bad">❌ ${esc((r.data&&r.data.error)||'Có lỗi, thử lại nhé.')}</div>`;
    }catch(e){ fail(); }
  };
  window.scrollTo(0,0);
}
function logout(){
  const m=document.createElement('div'); m.className='modal';
  m.innerHTML=`<div class="box"><div style="font-size:50px">👋</div><h3>Đổi người học?</h3>
    <p class="hint">Tiến độ của <b>${esc(user)}</b> vẫn được lưu trên máy chủ. Lần sau nhập lại tên <b>${esc(user)}</b> để học tiếp.</p>
    ${syncState!=='ok'?'<p class="hint" style="color:var(--bad)">⚠️ Một phần tiến độ chưa lưu được lên máy chủ (đang mất mạng) và sẽ mất nếu đổi người lúc này.</p>':''}
    <div class="row"><button class="btn ghost" id="no">Ở lại</button><button class="btn" id="yes">Đổi người học</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#no').onclick=()=>m.remove();
  m.querySelector('#yes').onclick=async()=>{
    if(syncState!=='ok') await sync();
    user=null; progress={}; seen={}; clearTimeout(syncTimer); setSync('ok');
    try{ [USER_KEY,KEY,SEEN_KEY].forEach(k=>localStorage.removeItem(k)); }catch(e){}
    m.remove(); login();
  };
}

/* ================== TIỆN ÍCH ================== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const norm = s => s.toLowerCase().replace(/[^a-z' ]/g,'').replace(/\s+/g,' ').trim();
const pic = w => w[3] ? `<img src="${esc(w[3])}" alt="${esc(w[0])}">` : w[2];
const stars = n => '⭐'.repeat(n) + '☆'.repeat(3-n);
const pickOne = a => a[Math.floor(Math.random()*a.length)];

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
function ac(){ actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); return actx; }
// Phát một chuỗi nốt: [tần số, bắt đầu (giây), độ dài]
function notes(seq, type='triangle', vol=0.18){
  try{
    const A=ac();
    seq.forEach(([f,at,len=0.22])=>{
      const o=A.createOscillator(), g=A.createGain(), t=A.currentTime+at;
      o.type=type; o.frequency.value=f; o.connect(g); g.connect(A.destination);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+len);
      o.start(t); o.stop(t+len+0.03);
    });
  }catch(e){}
}
const TUNES=[
  [[523,0],[659,.09],[784,.18],[1047,.27],[784,.36],[1047,.45,.4]],                       // ta-ta-ta-taaa
  [[392,0],[523,.12],[659,.24],[784,.36,.15],[659,.5,.12],[784,.62,.5]],                   // kèn chiến thắng
  [[784,0,.12],[988,.1,.12],[1175,.2,.12],[1568,.3,.5],[1175,.3,.5],[988,.3,.5]],          // hợp âm lấp lánh
  [[659,0,.15],[659,.15,.15],[784,.3,.15],[880,.45,.15],[1047,.6,.15],[1319,.75,.45]],     // leo thang
  [[523,0,.1],[587,.08,.1],[659,.16,.1],[698,.24,.1],[784,.32,.1],[880,.4,.1],[988,.48,.1],[1047,.56,.5]], // chạy gam
];
let lastTune=-1;
function fanfare(){
  let k; do{ k=Math.floor(Math.random()*TUNES.length); }while(k===lastTune && TUNES.length>1);
  lastTune=k; notes(TUNES[k]);
}
// Âm thanh cho từng kiểu hiệu ứng
function sfx(type){
  try{
    const A=ac(), t=A.currentTime;
    if(type==='boom') return boom();
    if(type==='sparkle') return notes(Array.from({length:7},(_,k)=>[1200+Math.random()*1400,k*0.06,0.15]),'sine',0.08);
    if(type==='pop') return notes(Array.from({length:4},(_,k)=>[500+Math.random()*400,k*0.13,0.07]),'square',0.05);
    if(type==='magic'){ const o=A.createOscillator(), g=A.createGain();
      o.type='sine'; o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(1800,t+0.7);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.1,t+0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+0.8);
      o.connect(g); g.connect(A.destination); o.start(t); o.stop(t+0.85); return; }
    if(type==='whoosh'){ const len=A.sampleRate*0.9, buf=A.createBuffer(1,len,A.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/len);
      const src=A.createBufferSource(), f=A.createBiquadFilter(), g=A.createGain();
      src.buffer=buf; f.type='bandpass'; f.Q.value=2; f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(3000,t+0.9);
      g.gain.value=0.15; src.connect(f); f.connect(g); g.connect(A.destination); src.start(); }
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
FX.onSound = sfx;
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
// Ăn mừng qua bài: càng nhiều sao, cấp càng cao thì càng nhiều hiệu ứng; mỗi lần một kiểu khác
const isEmoji = e => /\p{Extended_Pictographic}/u.test(e);
function celebrate(L, power){
  fanfare();
  return FX.celebrate({ power, emojis:[L.icon, ...L.words.map(w=>w[2])].filter(isEmoji) });
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-say]'); if(s) speak(s.dataset.say);
});

/* ================== TRANG CHỦ ================== */
function home(){
  document.documentElement.style.setProperty('--c','#FF8A5B');
  const done = LESSONS.filter((_,i)=>passed(i)).length;
  const cur = LESSONS.findIndex((_,i)=>!passed(i));
  const pct = totalPct();
  const lvTotal = LESSONS.reduce((a,_,i)=>a+nLevels(i),0), lvDone = LESSONS.reduce((a,_,i)=>a+lessonDone(i),0);
  $('#app').innerHTML = `
  <div class="top">
    <div class="logo"><div class="owl">🦉</div><div><h1>Bé Vui Học <span>Tiếng Anh</span></h1><p>Học mỗi ngày một chút — vui ơi là vui!</p></div></div>
    <div class="who"><span class="avatar">🧒</span><div><div class="hint" style="margin:0">Người học</div><b>${esc(user||'')}</b></div><button class="link" id="switch">Đổi người</button></div>
    <div class="prog"><div class="pct"><b>📊 Hoàn thành ${pct}%</b><span>${lvDone}/${lvTotal} cấp đã qua</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
  </div>
  <div class="hello"><div style="font-size:40px">🦉</div><div class="bubble">${
    pct===100 ? 'Tuyệt vời! Con đã hoàn thành 100% — qua tất cả các cấp của mọi bài! 🎓👑 Làm lại để gặp câu hỏi mới nhé.'
    : lvDone===0 ? 'Xin chào! Mình là cú Ollie. Con thích bài nào thì bấm vào bài đó để học nhé! Chưa biết chọn gì thì bắt đầu với <b>Bài 1</b> 😊'
    : done===LESSONS.length ? `Giỏi quá! Con đã hoàn thành ${pct}%. Bấm vào một bài để học <b>cấp tiếp theo</b> với nội dung mới nhé.`
    : `Giỏi quá! Con đã hoàn thành ${pct}%. Gợi ý: <b>Bài ${cur+1}: ${LESSONS[cur].title}</b> — hoặc chọn bài con thích!`}</div></div>
  <div class="grid">${LESSONS.map((L,i)=>{
    const lock=!unlocked(i), st=starsOf(i,1), N=nLevels(i), nx=startLevel(i);
    const lp = lessonPct(i);
    const state = lock ? 'Qua bài '+i+' để mở khoá'
      : !lessonDone(i) ? '▶ Bắt đầu học'
      : !passed(i,nx) ? `▶ Học tiếp Cấp ${nx}`
      : '✅ Hoàn thành — làm lại với câu hỏi mới';
    const lvTags = Array.from({length:N},(_,k)=>k+1).map(m=>{
      const s2=starsOf(i,m), open=lvUnlocked(i,m);
      return `<span class="lvtag ${s2?'':'todo'} ${open?'':'off'}">Cấp ${m} ${s2?stars(s2):open?'':'🔒'}</span>`; }).join('');
    return `<button class="lcard ${lock?'locked':''} ${i===cur?'current':''}" style="--c:${L.color}" data-open="${i}" aria-label="Bài ${i+1} ${L.title}${lock?' (đang khoá)':''}">
      ${lock?'<span class="lock">🔒</span>':st?`<span class="stars">${stars(st)}</span>`:''}
      <div class="ic">${L.icon}</div>
      <div class="num">Bài ${i+1}</div><h3>${L.title}</h3><div class="vi">${L.vi}</div>
      ${N>1&&(FREE_CHOICE||st)?`<div class="lvrow">${lvTags}</div>`:''}
      <div class="lpct"><div class="lbar"><i style="width:${lp}%"></i></div><span>${lp}%</span></div>
      <div class="state">${state}</div>
    </button>`;}).join('')}</div>
  <div class="foot"><span>${syncBadge()} · Học trên máy khác: nhập tên <b>${esc(user||'')}</b>. Bật loa để nghe phát âm 🔊</span><button class="link" id="reset">Xoá tiến độ</button></div>`;
  $('#switch').onclick=logout;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.open;
    if(!unlocked(i)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast(`🔒 Con cần qua bài kiểm tra Bài ${i} trước nhé!`); return; }
    lesson(i,'vocab',startLevel(i));
  });
  $('#reset').onclick=()=>{
    const m=document.createElement('div'); m.className='modal';
    m.innerHTML=`<div class="box"><div style="font-size:50px">🗑️</div><h3>Xoá toàn bộ tiến độ?</h3><p class="hint">Toàn bộ sao và tiến độ của <b>${esc(user||'')}</b> sẽ bị xoá (về 0%), trên mọi thiết bị.</p><div class="row"><button class="btn ghost" id="no">Không</button><button class="btn" id="yes" style="--c:#F0554A">Xoá</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#no').onclick=()=>m.remove();
    m.querySelector('#yes').onclick=async()=>{
      progress={}; seen={};
      try{ localStorage.setItem(KEY,'{}'); localStorage.removeItem(SEEN_KEY); }catch(e){}
      m.remove(); home();
      try{ const r=await api('PUT', userUrl(user), {progress:{}, seen:{}, replace:true}); setSync(r.status===200?'ok':'offline'); }
      catch(e){ setSync('offline'); toast('⚠️ Chưa xoá được trên máy chủ — kiểm tra mạng rồi thử lại'); }
    };
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
  ${N>1?`<div class="lvsw">${Array.from({length:N},(_,k)=>k+1).map(m=>`<button class="lvbtn ${m===n?'on':''} ${lvUnlocked(i,m)?'':'locked'}" data-lv="${m}">Cấp ${m} ${!lvUnlocked(i,m)?'🔒':starsOf(i,m)?stars(starsOf(i,m)):''}</button>`).join('')}</div>`:''}
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
      if(sc>=q-1) celebrate(L, 1);
    });
    start();
  }
  if(tab==='test'){
    const unlockMsg = FREE_CHOICE ? (n<N ? `🎯 Qua bài để hoàn thành Cấp ${n}` : '👑 Thử thách cấp cao nhất')
      : n===1 ? (N>1?'🔓 Qua bài để mở bài tiếp theo và Cấp 2':'🔓 Qua bài để mở bài tiếp theo') : n<N ? `🔓 Qua bài để mở Cấp ${n+1}` : '👑 Thử thách cấp cao nhất';
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
  if(ok){ progress[key]=Math.max(progress[key]||0,st); save(); celebrate(lv(i,lvl), st+lvl-1); }   // sức mạnh 1–5
  const last=i===LESSONS.length-1;
  const unlockMsg = !first ? 'Làm tốt lắm! Lần sau làm lại sẽ có câu hỏi mới 🆕'
    : FREE_CHOICE ? (hasNext ? `✅ Hoàn thành Cấp ${lvl}! Thử thách tiếp theo: <b>Cấp ${lvl+1}</b>` : `👑 Con đã chinh phục cấp cao nhất của bài ${LESSONS[i].title}!`)
      + `<br>📊 Con đã hoàn thành <b>${totalPct()}%</b> chương trình`
    : lvl===1 ? [hasNext?`🆕 Đã mở <b>Cấp 2</b> của bài này`:'', last?'':`🔓 Đã mở khoá Bài ${i+2}: ${LESSONS[i+1].title}`].filter(Boolean).join('<br>') || 'Con đã hoàn thành tất cả các bài học! 🎓'
    : hasNext ? `🌟 Con đã chinh phục Cấp ${lvl}!<br>🆕 Đã mở <b>Cấp ${lvl+1}</b> của bài này`
    : `👑 Con đã chinh phục cấp cao nhất của bài ${LESSONS[i].title}!`;
  P.innerHTML=`<div class="center result">
    <div class="big ${ok?'trophy':''}">${ok?pickOne(['🏆','🥇','👑','🎖️','🏅','🦄','🚀','🌟']):'🌱'}</div>
    <h3>${ok?pickOne(['Con đã qua bài!','Qua bài rồi! Hoan hô!','Con giỏi quá đi!','Xuất sắc! Qua bài rồi!','Siêu sao tiếng Anh!']):'Gần được rồi!'}</h3>
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

// Chưa có tên thì bắt buộc nhập tên trước khi học
if(user && NAME_RE.test(user)){ home(); refreshFromServer(); } else { user=null; login(); }

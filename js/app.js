const PASS = 12, TEST_N = 15;   // bài kiểm tra 15 câu, đúng từ 12 câu là qua

/* ================== TIẾN ĐỘ ================== */
const KEY='beVuiHocTiengAnh.v1';
let progress = {};   // {lessonIndex: stars}
try{ progress = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ progress = {}; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){} scheduleSync(); }
/* Cấp độ: Cấp 1 là bài trong lessons.js, Cấp 2 lấy từ LEVEL2 (lessons2.js), Cấp 3 từ LEVEL3 (lessons3.js).
   Qua cấp trước mới mở cấp sau. Tiến độ lưu theo khoá "i" (Cấp 1, giữ tương thích bản cũ), "i-2", "i-3". */
const EXTRA = [typeof LEVEL2!=='undefined'?LEVEL2:{}, typeof LEVEL3!=='undefined'?LEVEL3:{}];   // Cấp 2, Cấp 3, ...
/* Bài trong gói nội dung mới (packs/*.json) được thêm vào cuối LESSONS khi bé tải gói. Mỗi bài đó có
   `key` cố định (>= 100) để lưu tiến độ không trùng với bài gốc, và khai báo Level 2, 3 ngay trong bài (`levels`). */
const CORE_N = LESSONS.length;                     // số bài gốc (js/lessons.js)
const lkey = i => LESSONS[i].key ?? i;            // khoá lưu tiến độ của bài thứ i
const nLevels = i => { if(LESSONS[i].levels) return 1+Object.keys(LESSONS[i].levels).length;
  let n=1; while(EXTRA[n-1] && EXTRA[n-1][LESSONS[i].title]) n++; return n; };
const lv = (i,n) => n===1 ? LESSONS[i] : Object.assign({}, LESSONS[i], LESSONS[i].levels ? LESSONS[i].levels[n] : EXTRA[n-2][LESSONS[i].title]);
const pk = (i,n) => n===1 ? String(lkey(i)) : lkey(i)+'-'+n;
const starsOf = (i,n) => progress[pk(i,n)]||0;
const passed = (i,n=1) => starsOf(i,n) > 0;
// Bé được tự chọn bài và cấp bất kỳ. Đổi thành false để quay lại kiểu khoá: qua bài trước mới mở bài sau.
const FREE_CHOICE = true;
// Bài trong gói nội dung mới: tải về lúc nào cũng được, nhưng chỉ học được khi đã qua Level 1 của mọi bài đứng trước gói.
const packStart = i => LESSONS.findIndex(L=>L.pack && L.pack===LESSONS[i].pack);
const leftBefore = i => LESSONS.slice(0, packStart(i)).filter((_,j)=>!passed(j)).length;   // số bài trước gói chưa qua
const unlocked = i => LESSONS[i].pack ? leftBefore(i)===0 : (FREE_CHOICE || i===0 || passed(i-1));
const lvUnlocked = (i,n) => unlocked(i) && (FREE_CHOICE || n===1 || passed(i,n-1));
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
   Bé nhập tên (chỉ chữ không dấu và số, 3–20 ký tự, không trùng) và mã PIN 4 số. Đăng nhập đúng thì
   máy chủ (server/app.py) cấp một "vé" cho thiết bị; trình duyệt dùng vé đó để đọc / ghi tiến độ
   (không lưu mã PIN). Sang máy khác chỉ cần nhập đúng tên + PIN. Trình duyệt vẫn giữ một bản sao để
   học được khi mất mạng; có mạng lại thì tự gửi lên. Máy chủ gộp theo số sao lớn nhất nên hai thiết bị
   không ghi đè mất tiến độ của nhau. */
const USER_KEY='beVuiHocTiengAnh.user', TOKEN_KEY='beVuiHocTiengAnh.token';
const NAME_RE=/^[A-Za-z0-9]{3,20}$/, PIN_RE=/^[0-9]{4}$/;
let user=null, token=null;
try{ user=localStorage.getItem(USER_KEY)||null; token=localStorage.getItem(TOKEN_KEY)||null; }catch(e){}
let syncTimer=0, syncState='ok';                       // 'ok' | 'saving' | 'offline' | 'auth'
const mergeMax=(a,b)=>{ const o=Object.assign({},a); for(const k in b) o[k]=Math.max(o[k]||0, b[k]||0); return o; };
async function api(method, path, body, keepalive){
  const headers={};
  if(body) headers['Content-Type']='application/json';
  if(token) headers['Authorization']='Bearer '+token;
  const r=await fetch(path,{method, keepalive:!!keepalive, cache:'no-store', headers, body: body?JSON.stringify(body):undefined});
  let data=null; try{ data=await r.json(); }catch(e){}
  return {status:r.status, data};
}
const userUrl = n => 'api/users/'+encodeURIComponent(n);
function setSync(st){ syncState=st; const el=$('#sync'); if(el){ el.outerHTML=syncBadge(); wireSync(); } }
const syncBadge = () => `<span id="sync" class="sync ${syncState}">${
  syncState==='ok'?'☁️ Đã lưu' : syncState==='saving'?'⏳ Đang lưu…'
  : syncState==='auth'?'<button class="link" id="relogin">🔑 Cần nhập lại mã PIN để lưu — bấm vào đây</button>'
  : '⚠️ Chưa lưu được — sẽ thử lại khi có mạng'}</span>`;
function wireSync(){ const b=$('#relogin'); if(b) b.onclick=()=>login(user); }
// Nhận dữ liệu từ máy chủ: gộp với bản trong máy (không bao giờ làm mất sao đã có)
function absorb(d){
  if(!d) return;
  progress=mergeMax(progress, d.progress||{}); seen=mergeMax(seen, d.seen||{});
  try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){}
  saveSeen();
}
// Vé không còn hợp lệ (vd. mã PIN vừa được đặt lại): giữ tiến độ trong máy, nhắc nhập lại PIN
function lostToken(){ token=null; try{ localStorage.removeItem(TOKEN_KEY); }catch(e){} clearTimeout(syncTimer); setSync('auth'); }
function scheduleSync(){ if(!user||!token) return; clearTimeout(syncTimer); setSync('saving'); syncTimer=setTimeout(()=>sync(),700); }
async function sync(keepalive){
  if(!user||!token) return;
  clearTimeout(syncTimer);
  try{
    const r=await api('PUT','api/me',{progress, seen}, keepalive);
    if(r.status===401) return lostToken();
    if(r.status!==200) throw new Error(r.status);
    absorb(r.data); setSync('ok');
  }catch(e){ setSync('offline'); syncTimer=setTimeout(()=>sync(),15000); }
}
addEventListener('online', ()=>{ if(syncState==='offline') sync(); });
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden' && (syncState==='saving'||syncState==='offline')) sync(true); });
// Mở trang: lấy tiến độ mới nhất trên máy chủ (bé có thể vừa học ở máy khác)
async function refreshFromServer(){
  if(!user || !token) return;
  try{
    const r=await api('GET','api/me');
    if(r.status===401){ lostToken(); return login(user); }
    if(r.status===200){ absorb(r.data); setSync('ok'); if($('.grid')) home(); sync(); }
  }catch(e){ setSync('offline'); }
}

/* ================== THỐNG KÊ HÀNH VI ==================
   Ghi lại bé dùng phần nào và bao lâu (để biết bé thích học hay chơi phần nào), xem ở admin.duyetnt.com.
   Không ghi câu trả lời hay bất cứ thứ gì bé gõ. Chỉ gửi khi đã đăng nhập; gửi lỗi thì bỏ qua.
   trackScreen(khu vực, {l, lv, x}) – gọi khi đổi màn hình; thời gian ở màn trước được gửi thành sự kiện "view"
     (không tính lúc trang bị ẩn, tối đa 30 phút một lần).
   track('start'|'done', hoạt động, {l, lv, x, s, n, ok}) – bắt đầu / làm xong luyện tập, kiểm tra, trò chơi.
   Gom lại, gửi mỗi 20 giây và khi bé rời trang (POST api/track). */
const TR = {q:[], cur:null, paused:null, timer:0};
function track(e, a, x){
  if(!user || !token) return;
  TR.q.push(Object.assign({e, a, t:Math.floor(Date.now()/1000)}, x||{}));
  if(TR.q.length >= 40) flushTrack(); else if(!TR.timer) TR.timer = setTimeout(()=>flushTrack(), 20000);
}
function trackScreen(a, x){
  const now = Date.now(), c = TR.cur;
  if(c){ const d = Math.round((now - c.t0)/1000); if(d >= 2) track('view', c.a, Object.assign({d:Math.min(d, 1800)}, c.x)); }
  TR.cur = a ? {a, x:x||{}, t0:now} : null;
}
function flushTrack(keepalive){
  clearTimeout(TR.timer); TR.timer = 0;
  if(!TR.q.length || !token) return;
  const events = TR.q.splice(0);
  try{
    fetch('api/track', {method:'POST', keepalive:!!keepalive, cache:'no-store',
      headers:{'Content-Type':'application/json', 'Authorization':'Bearer '+token}, body:JSON.stringify({events})}).catch(()=>{});
  }catch(e){}
}
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden'){ if(TR.cur){ TR.paused = TR.cur; trackScreen(null); } flushTrack(true); }
  else if(TR.paused){ const p = TR.paused; TR.paused = null; trackScreen(p.a, p.x); }
});

/* Màn hình đăng nhập: tên → (tên mới: đặt PIN) / (tên đã có: nhập PIN) / (hồ sơ cũ chưa có PIN: đặt PIN) */
function login(prefill){
  trackScreen(null); flushTrack(true);
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#FF8A5B');
  const legacy = !user && Object.keys(progress).length>0;  // tiến độ cũ trước khi có tính năng tên
  $('#app').innerHTML=`
  <div class="login">
    <div class="owl big">🦉</div>
    <h1>Bé Vui Học <span>Tiếng Anh</span></h1>
    <p class="hint">Nhập tên và mã PIN của con để lưu quá trình học. Sang máy khác, chỉ cần nhập đúng tên và mã PIN là học tiếp được!</p>
    <form id="lf" autocomplete="off" novalidate>
      <label for="nm">Tên của con</label>
      <input id="nm" maxlength="20" inputmode="latin" autocapitalize="off" spellcheck="false" placeholder="ví dụ: Bong2019">
      <div class="nmhelp" id="nh">Chỉ dùng chữ không dấu (a–z) và số, dài 3–20 ký tự, không có dấu cách.</div>
      <button class="btn" id="go" type="submit">Tiếp tục →</button>
    </form>
    <div id="lmsg"></div>
    ${legacy?'<p class="hint small">💡 Tiến độ con đã học trên máy này sẽ được chuyển vào hồ sơ.</p>':''}
  </div>`;
  const nm=$('#nm'), nh=$('#nh'), msg=$('#lmsg'), form=$('#lf');
  const check=()=>{
    const v=nm.value, bad=v && !NAME_RE.test(v);
    nh.classList.toggle('bad', !!bad);
    nh.textContent = !v ? 'Chỉ dùng chữ không dấu (a–z) và số, dài 3–20 ký tự, không có dấu cách.'
      : /[^A-Za-z0-9]/.test(v) ? '❌ Không dùng dấu, dấu cách hay ký tự đặc biệt — chỉ chữ a–z và số.'
      : v.length<3 ? '❌ Tên cần ít nhất 3 ký tự.' : '✅ Tên hợp lệ';
    return !bad && !!v;
  };
  const resetName=()=>{ msg.innerHTML=''; form.style.display=''; nm.disabled=false; nm.select(); };
  nm.oninput=()=>{ check(); msg.innerHTML=''; };
  const busy=(btn,on,label)=>{ btn.disabled=on; btn.textContent=on?'Đang kiểm tra…':label; };
  const fail=()=>{ msg.insertAdjacentHTML('beforeend','<div class="lbox bad">📡 Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.</div>'); };
  // Máy này đang giữ tiến độ của người khác thì không mang sang hồ sơ mới
  const sameAsDevice = n => !user || user.toLowerCase()===n.toLowerCase();
  const enter=d=>{
    if(!sameAsDevice(d.name)){ progress={}; seen={}; }
    user=d.name; token=d.token;
    try{ localStorage.setItem(USER_KEY,user); localStorage.setItem(TOKEN_KEY,token); }catch(e){}
    absorb(d); setSync('ok'); sync(); home(); loadPacks();
    toast(`👋 Chào ${user}! Tiến độ của con sẽ được lưu tự động.`);
  };

  // Ô nhập PIN (mode: 'enter' nhập PIN | 'create' tên mới | 'claim' hồ sơ cũ chưa có PIN)
  function pinStep(name, mode){
    form.style.display='none';
    const head = mode==='enter' ? `<div style="font-size:40px">🔑</div><b>Chào ${esc(name)}!</b> Nhập mã PIN 4 số của con:`
      : mode==='create' ? `<div style="font-size:40px">✨</div><b>"${esc(name)}"</b> là tên mới! Đặt mã PIN 4 số để giữ hồ sơ của con — chỉ ai biết mã này mới vào được.`
      : `<div style="font-size:40px">🔒</div>Hồ sơ <b>"${esc(name)}"</b> chưa có mã PIN. Nếu đây là hồ sơ của con, hãy đặt mã PIN 4 số để không ai khác dùng được.`;
    const label = mode==='enter' ? 'Vào học →' : mode==='create' ? 'Tạo hồ sơ' : 'Đặt mã PIN';
    msg.innerHTML=`<div class="lbox">${head}
      <form id="pf" novalidate>
        <input id="pin" class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••" aria-label="Mã PIN">
        ${mode!=='enter'?'<input id="pin2" class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••" aria-label="Nhập lại mã PIN"><div class="nmhelp">Nhập lại mã PIN để chắc chắn</div>':''}
        <label class="showpin"><input type="checkbox" id="sp"> 👁 Hiện mã PIN</label>
        <div class="nmhelp" id="ph"></div>
        <div class="row"><button type="button" class="btn ghost" id="back">← Đổi tên</button><button class="btn" id="pgo">${label}</button></div>
      </form>
      <p class="hint small">${mode==='enter'?`Quên mã PIN? Bố mẹ nhắn Zalo <a href="${SUPPORT_ZALO_URL}" target="_blank" rel="noopener">${SUPPORT_ZALO}</a> để được đặt lại.`:'💡 Bố mẹ ghi nhớ mã PIN giúp con nhé.'}</p></div>`;
    const pin=$('#pin'), pin2=$('#pin2'), ph=$('#ph'), go=$('#pgo');
    [pin,pin2].filter(Boolean).forEach(x=>x.oninput=()=>{ x.value=x.value.replace(/\D/g,'').slice(0,4); ph.textContent=''; ph.classList.remove('bad'); });
    $('#sp').onchange=e=>[pin,pin2].filter(Boolean).forEach(x=>x.type=e.target.checked?'text':'password');
    $('#back').onclick=resetName;
    pin.focus();
    const say=t=>{ ph.textContent=t; ph.classList.add('bad'); };
    $('#pf').onsubmit=async e=>{
      e.preventDefault();
      if(!PIN_RE.test(pin.value)) return say('❌ Mã PIN gồm đúng 4 chữ số.');
      if(pin2 && pin2.value!==pin.value) return say('❌ Hai lần nhập mã PIN chưa giống nhau.');
      busy(go,true,label);
      try{
        const carry = sameAsDevice(name);            // mang tiến độ trong máy vào hồ sơ?
        const r = mode==='enter' ? await api('POST','api/login',{name, pin:pin.value})
          : mode==='create' ? await api('POST','api/users',{name, pin:pin.value, progress:carry?progress:{}, seen:carry?seen:{}})
          : await api('POST', userUrl(name)+'/pin', {pin:pin.value});
        busy(go,false,label);
        const d=r.data||{};
        if(r.status===200||r.status===201) return enter(d);
        if(r.status===401){ pin.value=''; pin.focus(); return say(`❌ Mã PIN chưa đúng. Còn ${d.triesLeft} lần thử.`); }
        if(r.status===423) return say(`⏳ Sai mã PIN quá nhiều lần. Thử lại sau ${Math.ceil((d.retryAfter||900)/60)} phút nhé.`);
        if(r.status===409 && d.needPin) return pinStep(name,'claim');
        if(r.status===409 && mode==='claim') return pinStep(name,'enter');      // vừa có người đặt PIN
        if(r.status===409) return say('😮 Tên này vừa có người khác dùng mất rồi. Bấm "Đổi tên" để chọn tên khác nhé!');
        say('❌ '+(d.error||'Có lỗi, thử lại nhé.'));
      }catch(e){ busy(go,false,label); say('📡 Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.'); }
    };
  }

  form.onsubmit=async e=>{
    e.preventDefault();
    if(!check()){ nm.focus(); return; }
    const name=nm.value, go=$('#go'); busy(go,true,'Tiếp tục →'); msg.innerHTML='';
    try{
      const r=await api('GET', userUrl(name));
      busy(go,false,'Tiếp tục →');
      if(r.status===200) pinStep(r.data.name, r.data.hasPin?'enter':'claim');
      else if(r.status===404) pinStep(name,'create');
      else msg.innerHTML=`<div class="lbox bad">❌ ${esc((r.data&&r.data.error)||'Có lỗi, thử lại nhé.')}</div>`;
    }catch(e){ busy(go,false,'Tiếp tục →'); fail(); }
  };
  if(prefill && NAME_RE.test(prefill)){ nm.value=prefill; check(); form.requestSubmit ? form.requestSubmit() : form.onsubmit(new Event('submit')); }
  else nm.focus();
  window.scrollTo(0,0);
}
function logout(){
  const m=document.createElement('div'); m.className='modal';
  m.innerHTML=`<div class="box"><div style="font-size:50px">👋</div><h3>Đổi người học?</h3>
    <p class="hint">Tiến độ của <b>${esc(user)}</b> vẫn được lưu trên máy chủ. Lần sau nhập lại tên <b>${esc(user)}</b> và mã PIN để học tiếp.</p>
    ${syncState!=='ok'?'<p class="hint" style="color:var(--bad)">⚠️ Một phần tiến độ chưa lưu được lên máy chủ và sẽ mất nếu đổi người lúc này.</p>':''}
    <div class="row"><button class="btn ghost" id="no">Ở lại</button><button class="btn" id="yes">Đổi người học</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#no').onclick=()=>m.remove();
  m.querySelector('#yes').onclick=async()=>{
    if(syncState==='saving'||syncState==='offline') await sync();
    trackScreen(null); flushTrack(true);
    try{ if(token) await api('POST','api/logout'); }catch(e){}     // huỷ vé của máy này
    user=null; token=null; progress={}; seen={}; resetPacks(); clearTimeout(syncTimer); setSync('ok');
    try{ [USER_KEY,TOKEN_KEY,KEY,SEEN_KEY].forEach(k=>localStorage.removeItem(k)); }catch(e){}
    m.remove(); login();
  };
}

/* ================== HỖ TRỢ ================== */
const SUPPORT_ZALO = '0985 626 134', SUPPORT_ZALO_URL = 'https://zalo.me/0985626134';
const supportHTML = () => `<div class="support">
  <span class="sic">💬</span>
  <div><b>Cần hỗ trợ?</b> Quên mã PIN, báo lỗi hay góp ý, bố mẹ nhắn Zalo:
    <a href="${SUPPORT_ZALO_URL}" target="_blank" rel="noopener">${SUPPORT_ZALO}</a></div>
  <button class="link" id="copyzalo" type="button" onclick="copyZalo()">Sao chép số</button></div>`;
function copyZalo(){
  const n=SUPPORT_ZALO.replace(/\s/g,'');
  const done=()=>toast('📋 Đã sao chép số Zalo '+SUPPORT_ZALO);
  try{ navigator.clipboard.writeText(n).then(done, ()=>toast('Số Zalo: '+SUPPORT_ZALO)); }catch(e){ toast('Số Zalo: '+SUPPORT_ZALO); }
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

/* ================== GÓI NỘI DUNG MỚI ==================
   Danh sách gói: GET api/packs (chỉ các gói đang bật; nội dung ở packs/index.json và packs/<file>).
   Bé qua bài kiểm tra Level 1 của mọi bài đang có thì được tải gói tiếp theo (lần lượt từng gói).
   Tải xong ghi "pack|<id>" vào seen (tự đồng bộ sang máy khác); file gói giữ lại trong máy để học khi mất mạng. */
const PACK_CACHE='beVuiHocTiengAnh.packs';
let packList=null;                               // [{id, file, title, icon, color, date, desc}] – null: chưa biết
let packStore={}; try{ packStore=JSON.parse(localStorage.getItem(PACK_CACHE))||{}; }catch(e){ packStore={}; }   // id → {meta, data}
const packAdded = id => (seen['pack|'+id]||0) > 0;
const allPassed = () => LESSONS.every((_,i)=>passed(i));
const nextPack = () => (packList||[]).find(p=>!packAdded(p.id)) || null;
function savePackStore(){ try{ localStorage.setItem(PACK_CACHE, JSON.stringify(packStore)); }catch(e){} }
function resetPacks(){ LESSONS.length = CORE_N; }
function mountPack(meta, data){
  (data.lessons||[]).forEach(L=>{ if(Number.isInteger(L.key) && !LESSONS.some(x=>x.key===L.key)) LESSONS.push(Object.assign({}, L, {pack:meta.id})); });
}
async function fetchPack(meta){
  const c=packStore[meta.id];
  if(c && c.meta.date===meta.date) return c.data;
  const r=await fetch('packs/'+encodeURIComponent(meta.file)+'?v='+encodeURIComponent(meta.date||''), {cache:'no-cache'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const data=await r.json(); packStore[meta.id]={meta, data}; savePackStore(); return data;
}
// Gắn các gói bé đã tải vào danh sách bài, theo đúng thứ tự trong packs/index.json
async function loadPacks(){
  let list=null;
  try{ const r=await api('GET','api/packs'); if(r.status===200 && Array.isArray(r.data.packs)) list=r.data.packs; }catch(e){}
  if(!list) list=Object.values(packStore).map(x=>x.meta);        // mất mạng: dùng các gói đã lưu trong máy
  packList=list; resetPacks();
  for(const meta of list){
    if(!packAdded(meta.id)) continue;
    try{ mountPack(meta, await fetchPack(meta)); }catch(e){ break; }   // lỗi một gói thì dừng, để số thứ tự bài không bị lệch
  }
  if($('.grid')) home();
}
async function downloadPack(id, btn){
  const meta=(packList||[]).find(p=>p.id===id); if(!meta) return;
  if(btn){ btn.disabled=true; btn.textContent='⏳ Đang tải…'; }
  try{
    const data=await fetchPack(meta);
    markSeen(['pack|'+id]); mountPack(meta, data); home();
    fanfare(); FX.show && FX.show(1600);
    const i0=LESSONS.findIndex(L=>L.pack===id);
    toast(i0>=0 && !unlocked(i0) ? `🎁 Đã tải ${meta.title}! Học hết các bài còn lại để mở nhé` : `🎁 Đã tải ${meta.title}!`);
    setTimeout(()=>{ const el=document.getElementById('pack-'+id); if(el) el.scrollIntoView({behavior:'smooth', block:'start'}); }, 300);
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='⬇️ Tải nội dung mới'; }
    toast('📡 Chưa tải được, kiểm tra mạng rồi thử lại nhé');
  }
}
function packOffer(){
  const p=nextPack(), ok=allPassed(), left=LESSONS.filter((_,i)=>!passed(i)).length;
  return `<div class="packoffer ${ok?'ready':''}" style="--pc:${esc(p.color||'#7C5CFF')}">
    <div class="pic">${p.icon||'🎁'}</div>
    <div class="ptxt"><div class="ptag">🆕 Nội dung mới</div><h3>${esc(p.title)}</h3>${p.desc?`<p>${esc(p.desc)}</p>`:''}
      ${ok?'':`<p class="hint small">Con tải trước được, nhưng cần qua bài kiểm tra Level 1 của tất cả các bài (còn <b>${left}</b> bài) mới học được nội dung mới nhé!</p>`}</div>
    <button class="btn" id="getpack" data-id="${esc(p.id)}">⬇️ Tải nội dung mới</button>
  </div>`;
}
function packSections(cur){
  const ids=[...new Set(LESSONS.slice(CORE_N).map(L=>L.pack))];
  return ids.map(id=>{
    const meta=(packList||[]).find(p=>p.id===id) || (packStore[id]||{}).meta || {title:id};
    const idx=LESSONS.map((L,i)=>L.pack===id?i:-1).filter(i=>i>=0);
    const left=leftBefore(idx[0]);
    return `<div class="packhead" id="pack-${esc(id)}"><span>${meta.icon||'🎁'}</span><div><b>${esc(meta.title)}</b>${meta.desc?`<small>${esc(meta.desc)}</small>`:''}
      ${left?`<small class="plocked">🔒 Qua bài kiểm tra Level 1 của ${left} bài còn lại để mở gói này</small>`:''}</div></div>
      <div class="grid">${idx.map(i=>lessonCard(LESSONS[i],i,cur)).join('')}</div>`; }).join('');
}

/* ================== TRANG CHỦ ================== */
function home(){
  trackScreen('home');
  document.documentElement.style.setProperty('--c','#FF8A5B');
  const done = LESSONS.filter((_,i)=>passed(i)).length;
  const cur = LESSONS.findIndex((_,i)=>!passed(i));
  const pct = totalPct();
  const lvTotal = LESSONS.reduce((a,_,i)=>a+nLevels(i),0), lvDone = LESSONS.reduce((a,_,i)=>a+lessonDone(i),0);
  $('#app').innerHTML = `
  <div class="top">
    <div class="logo"><div class="owl">🦉</div><div><h1>Bé Vui Học <span>Tiếng Anh</span></h1><p>Học mỗi ngày một chút — vui ơi là vui!</p></div></div>
    <div class="who"><span class="avatar">${avatar(user||'').e}</span><div><div class="hint" style="margin:0">Người học</div><b>${esc(user||'')}</b></div><button class="link" id="switch">Đổi người</button></div>
    <button class="fame-btn" id="fame"><span class="cup">🏆</span><span class="t">Bảng vinh danh<small id="myrank">${rankLabel(lastRank)}</small></span></button>
    ${typeof castle==='function'?`<button class="fame-btn castle-btn" id="castle"><span class="cup">🏰</span><span class="t">Giải cứu công chúa<small>${castleLabel()}</small></span></button>`:''}
    ${typeof treasure==='function'?`<button class="fame-btn treasure-btn" id="treasure"><span class="cup">🗺️</span><span class="t">Đi tìm kho báu<small>${treasureLabel()}</small></span></button>`:''}
    ${typeof explore==='function'?`<button class="fame-btn explore-btn" id="explore"><span class="cup">🧭</span><span class="t">Nhà thám hiểm thiên tài<small>${exploreLabel()}</small></span></button>`:''}
    <div class="prog"><div class="pct"><b>📊 Hoàn thành ${pct}%</b><span>${lvDone}/${lvTotal} level đã qua</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
  </div>
  <div class="hello"><div style="font-size:40px">🦉</div><div class="bubble">${
    allPassed() && nextPack() ? 'Giỏi quá! Con đã qua bài kiểm tra của tất cả các bài! 🎉 Có <b>nội dung mới</b> đang chờ con ở ngay bên dưới.'
    : pct===100 ? 'Tuyệt vời! Con đã hoàn thành 100% — qua tất cả các level của mọi bài! 🎓👑 Làm lại để gặp câu hỏi mới nhé.'
    : lvDone===0 ? 'Xin chào! Mình là cú Ollie. Con thích bài nào thì bấm vào bài đó để học nhé! Chưa biết chọn gì thì bắt đầu với <b>Lesson 1</b> 😊'
    : done===LESSONS.length ? `Giỏi quá! Con đã hoàn thành ${pct}%. Bấm vào một bài để học <b>level tiếp theo</b> với nội dung mới nhé.`
    : `Giỏi quá! Con đã hoàn thành ${pct}%. Gợi ý: <b>Lesson ${cur+1}: ${LESSONS[cur].title}</b> — hoặc chọn bài con thích!`}</div></div>
  ${allPassed() && nextPack() ? packOffer() : ''}
  <div class="grid">${LESSONS.slice(0, CORE_N).map((L,i)=>lessonCard(L,i,cur)).join('')}</div>
  ${packSections(cur)}
  ${!allPassed() && nextPack() ? packOffer() : ''}
  <div class="foot"><span>${syncBadge()} · Học trên máy khác: nhập tên <b>${esc(user||'')}</b>. Bật loa để nghe phát âm 🔊</span><button class="link" id="reset">Xoá tiến độ</button></div>
  ${supportHTML()}`;
  homeWire();
}
function lessonCard(L,i,cur){
    const lock=!unlocked(i), st=starsOf(i,1), N=nLevels(i), nx=startLevel(i);
    const lp = lessonPct(i);
    const state = lock ? (L.pack ? `🔒 Học hết ${leftBefore(i)} bài còn lại để mở` : 'Qua bài '+i+' để mở khoá')
      : !lessonDone(i) ? '▶ Bắt đầu học'
      : !passed(i,nx) ? `▶ Học tiếp Level ${nx}`
      : '✅ Hoàn thành — làm lại với câu hỏi mới';
    const lvTags = Array.from({length:N},(_,k)=>k+1).map(m=>{
      const s2=starsOf(i,m), open=lvUnlocked(i,m);
      return `<span class="lvtag ${s2?'':'todo'} ${open?'':'off'}">Level ${m} ${s2?stars(s2):open?'':'🔒'}</span>`; }).join('');
    return `<button class="lcard ${lock?'locked':''} ${i===cur?'current':''}" style="--c:${L.color}" data-open="${i}" aria-label="Lesson ${i+1} ${L.title}${lock?' (đang khoá)':''}">
      ${lock?'<span class="lock">🔒</span>':st?`<span class="stars">${stars(st)}</span>`:''}
      <div class="ic">${L.icon}</div>
      <div class="num">Lesson ${i+1}</div><h3>${L.title}</h3><div class="vi">${L.vi}</div>
      ${N>1&&(FREE_CHOICE||st)?`<div class="lvrow">${lvTags}</div>`:''}
      <div class="lpct"><div class="lbar"><i style="width:${lp}%"></i></div><span>${lp}%</span></div>
      <div class="state">${state}</div>
    </button>`;
}
function homeWire(){
  $('#switch').onclick=logout; wireSync();
  const pd=$('#getpack'); if(pd) pd.onclick=()=>downloadPack(pd.dataset.id, pd);
  $('#fame').onclick=()=>fame('all');
  const cb=$('#castle'); if(cb) cb.onclick=()=>castle();
  const tb=$('#treasure'); if(tb) tb.onclick=()=>treasure();
  const xb=$('#explore'); if(xb) xb.onclick=()=>explore();
  loadMyRank();
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.open;
    if(!unlocked(i)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      toast(LESSONS[i].pack ? `🔒 Con cần qua bài kiểm tra Level 1 của ${leftBefore(i)} bài còn lại trước nhé!` : `🔒 Con cần qua bài kiểm tra Lesson ${i} trước nhé!`); return; }
    lesson(i,'vocab',startLevel(i));
  });
  $('#reset').onclick=()=>{
    const m=document.createElement('div'); m.className='modal';
    m.innerHTML=`<div class="box"><div style="font-size:50px">🗑️</div><h3>Xoá toàn bộ tiến độ?</h3><p class="hint">Toàn bộ sao và tiến độ của <b>${esc(user||'')}</b> sẽ bị xoá (về 0%), trên mọi thiết bị.</p><div class="row"><button class="btn ghost" id="no">Không</button><button class="btn" id="yes" style="--c:#F0554A">Xoá</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#no').onclick=()=>m.remove();
    m.querySelector('#yes').onclick=async()=>{
      progress={}; seen={}; resetPacks();
      try{ localStorage.setItem(KEY,'{}'); localStorage.removeItem(SEEN_KEY); }catch(e){}
      m.remove(); home();
      try{ const r=await api('PUT','api/me', {progress:{}, seen:{}, replace:true}); if(r.status===401) lostToken(); else setSync(r.status===200?'ok':'offline'); }
      catch(e){ setSync('offline'); toast('⚠️ Chưa xoá được trên máy chủ — kiểm tra mạng rồi thử lại'); }
    };
  };
  stopAll();
  window.scrollTo(0,0);
}

/* ================== BẢNG VINH DANH ==================
   Top 10 theo tổng số sao (Mọi lúc) hoặc theo số sao giành được từ thứ Hai (Tuần này).
   Bằng điểm thì ai qua nhiều cấp hơn đứng trước. Dữ liệu từ GET api/leaderboard. */
const AVATARS=['🐶','🐱','🐰','🐼','🦊','🐯','🐸','🐵','🐻','🐨','🦁','🐷','🐥','🦄','🐙','🐳'];
const AVBG=['#FFE9D6','#FFF4CC','#FDE7F3','#E6F0FF','#FFE3D6','#FFF1CC','#E3F7E8','#F6E8DA','#F1E4D8','#E8EEF2','#FFF1CC','#FDE7F3','#FFF7C2','#EFE6FF','#E6F0FF','#E0F4FF'];
// Mỗi tên luôn được cùng một con vật (tính từ chữ trong tên, không phân biệt hoa thường)
function avatar(name){ let h=0; for(const ch of String(name).toLowerCase()) h=(h*31+ch.charCodeAt(0))>>>0; return {e:AVATARS[h%AVATARS.length], bg:AVBG[(h>>4)%AVBG.length]}; }
let lastRank;   // undefined: chưa biết; null: chưa lên bảng; số: hạng
const rankLabel = r => r===undefined ? 'Xem các bạn giỏi nhất' : r ? `Con đang hạng ${r}` : 'Có sao là lên bảng!';
async function loadMyRank(){
  try{
    const r=await api('GET','api/leaderboard?period=all');
    if(r.status!==200 || !r.data.me) return;
    lastRank=r.data.me.rank; const el=$('#myrank'); if(el) el.textContent=rankLabel(lastRank);
  }catch(e){}
}
async function fame(period){
  trackScreen('fame');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#FF8A5B');
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button>
    <div><h2>🏆 Bảng vinh danh</h2><div class="sub">Những bạn nhỏ học chăm và giỏi nhất</div></div></div>
  <div class="panel fame">
    <div class="tabs" role="tablist">
      <button class="tab ${period==='all'?'on':''}" role="tab" aria-selected="${period==='all'}" data-p="all">⭐ Mọi lúc</button>
      <button class="tab ${period==='week'?'on':''}" role="tab" aria-selected="${period==='week'}" data-p="week">🔥 Tuần này</button>
    </div>
    <p class="hint">${period==='week'?'Xếp theo số sao giành được từ thứ Hai tuần này. Bảng tuần làm mới mỗi thứ Hai, nên bạn mới học cũng có cơ hội đứng đầu.':'Xếp theo tổng số sao từ trước đến nay.'}</p>
    <div id="fbody"><p class="hint center">⏳ Đang tải bảng vinh danh…</p></div>
  </div>`;
  $('#back').onclick=home;
  document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>fame(b.dataset.p));
  window.scrollTo(0,0);
  let d;
  try{ const r=await api('GET','api/leaderboard?period='+period); if(r.status!==200) throw 0; d=r.data; }
  catch(e){ const fb=$('#fbody'); if(fb) fb.innerHTML='<div class="lbox bad">📡 Không tải được bảng vinh danh. Kiểm tra mạng rồi thử lại nhé.</div>'; return; }
  const fb=$('#fbody'); if(!fb || !$('.fame')) return;          // bé đã rời trang
  if(period==='all' && d.me){ lastRank=d.me.rank; }
  const pts = p => period==='week' ? `+${p.score} ⭐` : `${p.score} ⭐`;
  const me = (user||'').toLowerCase();
  const pct = p => Math.round(p.levels/LESSONS.reduce((a,_,i)=>a+nLevels(i),0)*100);
  if(!d.top.length){
    fb.innerHTML=`<div class="lbox"><div style="font-size:44px">🌱</div><b>${period==='week'?'Tuần này chưa có bạn nào giành sao.':'Chưa có bạn nào trên bảng.'}</b><br>Qua một bài kiểm tra để là người đầu tiên được vinh danh nhé!</div>`;
    return;
  }
  const place=(p,cls)=>{ if(!p) return '<div class="place"></div>'; const a=avatar(p.name);
    const isMe=p.name.toLowerCase()===me;
    return `<div class="place ${cls} ${isMe?'me':''}"><div class="crown">${p.rank===1?'👑':''}</div>
      <div class="av" style="--avbg:${a.bg}">${a.e}</div>
      <div class="nm" title="${esc(p.name)}${isMe?' (con)':''}">${esc(p.name)}</div>
      <div class="st">${pts(p)}</div><div class="block">${p.rank}</div></div>`; };
  const [a,b,c]=d.top;
  const m=d.me;
  const mine = !m ? '' : m.rank ? `<div class="mine"><div class="big">${m.rank<=3?'🥳':'💪'}</div><div class="txt"><b>Con đang ở hạng ${m.rank}${period==='week'?' tuần này':''}</b><br>
      <span class="goal">${m.ahead?`Thêm ${m.ahead.score-m.score+1} ⭐ nữa là vượt ${esc(m.ahead.name)} để lên hạng ${m.rank-1}!`:'Con đang dẫn đầu, giữ vững nhé!'}</span></div></div>`
    : `<div class="mine"><div class="big">🌱</div><div class="txt"><b>Con chưa có tên trên bảng${period==='week'?' tuần này':''}</b><br><span class="goal">Qua một bài kiểm tra để giành sao và lên bảng nhé!</span></div></div>`;
  fb.innerHTML=`
    <div class="podium">${place(b,'p2')}${place(a,'p1')}${place(c,'p3')}</div>
    ${mine}
    <div class="rlist">${d.top.slice(3).map(p=>{ const av=avatar(p.name), isMe=p.name.toLowerCase()===me;
      return `<div class="rrow ${isMe?'me':''}"><div class="rk">${p.rank}</div><div class="av" style="--avbg:${av.bg}">${av.e}</div>
        <div class="rwho"><b>${esc(p.name)}${isMe?' (con)':''}</b><div class="rbar"><i style="width:${pct(p)}%"></i></div>
          <div class="badges"><span class="pc">Hoàn thành ${pct(p)}%</span>${p.badges.map(x=>`<span class="badge">${esc(x)}</span>`).join('')}</div></div>
        <div class="sc">${pts(p)}<small>${p.levels} level</small></div></div>`; }).join('')}</div>
    ${a.badges.length||(b&&b.badges.length)||(c&&c.badges.length)?`<div class="topbadges">${[a,b,c].filter(Boolean).filter(p=>p.badges.length).map(p=>`<span><b>${esc(p.name)}</b> ${p.badges.map(x=>`<span class="badge">${esc(x)}</span>`).join(' ')}</span>`).join('')}</div>`:''}
    <p class="hint center small">Bằng điểm thì ai qua nhiều level hơn đứng trước. ${d.total>10?`Có ${d.total} bạn trên bảng, hiện 10 bạn đứng đầu.`:''}</p>`;
}

/* ================== BÀI HỌC ================== */
const TABS=[['vocab','📚 Từ vựng'],['dialog','💬 Hội thoại'],['grammar','✏️ Ngữ pháp'],['practice','🎯 Luyện tập'],['test','🏆 Kiểm tra']];
function lesson(i,tab,n=1){
  const L=lv(i,n), N=nLevels(i), st=starsOf(i,n);
  trackScreen('lesson.'+tab, {l:lkey(i), lv:n});
  document.documentElement.style.setProperty('--c',L.color);
  stopAll();
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">${L.icon}</div>
    <div><div class="sub">Lesson ${i+1} · ${N>1?'Level '+n+' · ':''}${L.vi} ${st?'· '+stars(st):''}</div><h2>${L.title}</h2></div></div>
  ${N>1?`<div class="lvsw">${Array.from({length:N},(_,k)=>k+1).map(m=>`<button class="lvbtn ${m===n?'on':''} ${lvUnlocked(i,m)?'':'locked'}" data-lv="${m}">Level ${m} ${!lvUnlocked(i,m)?'🔒':starsOf(i,m)?stars(starsOf(i,m)):''}</button>`).join('')}</div>`:''}
  <div class="tabs">${TABS.map(([k,t])=>`<button class="tab ${k===tab?'on':''}" data-tab="${k}">${t}</button>`).join('')}</div>
  <div class="panel" id="panel"></div>`;
  $('#back').onclick=home;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>lesson(i,b.dataset.tab,n));
  document.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{
    const m=+b.dataset.lv;
    if(!lvUnlocked(i,m)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast(`🔒 Qua bài kiểm tra Level ${m-1} để mở Level ${m} nhé!`); return; }
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
    const start=()=>{ track('start','practice',{l:lkey(i),lv:n}); runQuiz(P, makePractice(L), (sc,q)=>{
      track('done','practice',{l:lkey(i),lv:n,s:sc,n:q});
      P.innerHTML=`<div class="center result"><div class="big">${sc>=q-1?'🌟':sc>=q/2?'👍':'💪'}</div><h3>Luyện tập xong!</h3>
      <div class="sc">Đúng ${sc}/${q} câu</div><p class="hint">${sc>=q-1?'Con đã sẵn sàng làm bài kiểm tra!':'Luyện thêm một lượt nữa cho chắc nhé.'}</p>
      <div class="row"><button class="btn ghost" id="again">🔁 Luyện tiếp</button><button class="btn" id="totest">🏆 Làm bài kiểm tra</button></div></div>`;
      $('#again').onclick=start; $('#totest').onclick=()=>lesson(i,'test',n);
      if(sc>=q-1) celebrate(L, 1);
    }); };
    start();
  }
  if(tab==='test'){
    const unlockMsg = FREE_CHOICE ? (n<N ? `🎯 Qua bài để hoàn thành Level ${n}` : '👑 Thử thách level cao nhất')
      : n===1 ? (N>1?'🔓 Qua bài để mở bài tiếp theo và Level 2':'🔓 Qua bài để mở bài tiếp theo') : n<N ? `🔓 Qua bài để mở Level ${n+1}` : '👑 Thử thách level cao nhất';
    P.innerHTML=`<div class="testintro"><div class="big">🏆</div><h3>Bài kiểm tra Lesson ${i+1}${N>1?' · Level '+n:''}</h3>
      <p class="hint">Gồm từ vựng, nghe, ngữ pháp, sắp xếp câu và hội thoại.</p>
      <div><span class="pill">📝 ${TEST_N} câu</span><span class="pill">✅ Cần đúng ${PASS} câu</span><span class="pill">${unlockMsg}</span></div>
      ${st?`<p class="hint" style="margin-top:12px">Kết quả tốt nhất: ${stars(st)} · Lần này có câu hỏi mới 🆕</p>`:''}
      <div class="row"><button class="btn" id="go">Bắt đầu kiểm tra</button></div></div>`;
    $('#go').onclick=()=>{ track('start','test',{l:lkey(i),lv:n}); runQuiz(P, makeTest(L,pk(i,n)), (sc,q)=>testResult(i,n,sc,q), 'Kiểm tra'); };
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

/* ================== BỘ CHẠY CÂU HỎI ==================
   hooks (tuỳ chọn, dùng cho trò chơi): over() → true thì kết thúc sớm, head() → HTML thay cho dòng "Câu k/n",
   answer(ok, el, q) gọi sau mỗi câu, explain(q, ok) → HTML giải thích hiện dưới đáp án,
   doneLabel – chữ trên nút ở câu cuối, wrongSfx() – âm thanh thay cho tiếng "wah wah" khi sai,
   feedDelay(ok) → số mili-giây chờ trước khi hiện thông báo đúng / sai (để hiệu ứng của trò chơi chạy xong). */
function runQuiz(P, qs, onDone, label, hooks){
  let k=0, score=0, streak=0;
  const praise=['🎉 Giỏi lắm!','🌟 Tuyệt vời!','👏 Chính xác!','🥳 Đúng rồi!','🚀 Siêu quá!','💯 Hoàn hảo!','🦄 Xuất sắc!','🎈 Con giỏi quá!'];
  const oopsMsg=['🙈 Ê xì! Sai mất rồi!','😜 Ê xì! Suýt nữa thì đúng!','🤪 Ối, ê xì!','🙊 Ê xì! Câu sau cố lên nhé!'];
  const streakMsg=n=> n>=TEST_N ? '👑 Không sai câu nào!' : n>=6 ? `🌈 ${n} câu đúng liên tiếp! Vô địch!` : `🔥 ${n} câu đúng liên tiếp!`;
  function show(){
    if(k>=qs.length || (hooks && hooks.over())) return onDone(score, qs.length);
    const q=qs[k];
    P.innerHTML=`<div class="qhead">${hooks && hooks.head ? hooks.head() : `<span>${label?label+' · ':''}Câu ${k+1}/${qs.length}</span><div class="qbar"><i style="width:${k/qs.length*100}%"></i></div><span id="qs">⭐ ${score}</span>`}</div>
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
    if(ok) tone(true); else { hooks && hooks.wrongSfx ? hooks.wrongSfx() : wahwah(); oops(el); }
    if(ok){
      cheer(el, streak>=3);
      const qs=$('#qs'); if(qs){ qs.textContent='⭐ '+score; qs.classList.remove('bump'); void qs.offsetWidth; qs.classList.add('bump'); }
      const pr=P.querySelector('.qprompt'); if(pr){ pr.classList.remove('cheer'); void pr.offsetWidth; pr.classList.add('cheer'); }
    }
    if(hot){ setTimeout(()=>{ fanfare(); FX.show(1400); FX.banner(streakMsg(streak)); },250); }
    if(ok && say) setTimeout(()=>speak(say),450);
    if(hooks && hooks.answer) hooks.answer(ok, el, qs[k]);
    const last = k+1>=qs.length || (hooks && hooks.over());
    const F=$('#fd'), q=qs[k];
    const feed=()=>{
      if(!F.isConnected) return;                 // bé đã rời màn hình trong lúc chờ
      F.className='feed '+(ok?'ok':'no');
      F.innerHTML=`<span>${ok?praise[Math.floor(Math.random()*praise.length)]:oopsMsg[Math.floor(Math.random()*oopsMsg.length)]+' Đáp án: <b style="color:var(--ink)">'+right+'</b>'}</span>
        ${hooks && hooks.explain ? hooks.explain(q, ok) : ''}
        <button class="btn" id="cont">${!last?'Tiếp tục →':(hooks&&hooks.doneLabel)||'Xem kết quả →'}</button>`;
      const c=F.querySelector('#cont'); c.onclick=()=>{k++;show();}; c.focus({preventScroll:true});
    };
    const wait = hooks && hooks.feedDelay ? hooks.feedDelay(ok) : 0;
    if(wait){ F.className='feed'; F.innerHTML=''; setTimeout(feed, wait); } else feed();
  }
  show();
}

function testResult(i,lvl,sc,n){
  const P=$('#panel'), ok=sc>=PASS, st= sc>=n?3: sc>=n-2?2: ok?1:0;
  track('done','test',{l:lkey(i),lv:lvl,s:sc,n,ok:ok?1:0});
  const first=!passed(i,lvl), key=pk(i,lvl), N=nLevels(i), hasNext=lvl<N;
  if(ok){ progress[key]=Math.max(progress[key]||0,st); save(); celebrate(lv(i,lvl), st+lvl-1); }   // sức mạnh 1–5
  const last=i===LESSONS.length-1;
  const newPack = ok && allPassed() && nextPack();
  const unlockMsg = !first ? 'Làm tốt lắm! Lần sau làm lại sẽ có câu hỏi mới 🆕'
    : FREE_CHOICE ? (hasNext ? `✅ Hoàn thành Level ${lvl}! Thử thách tiếp theo: <b>Level ${lvl+1}</b>` : `👑 Con đã chinh phục level cao nhất của bài ${LESSONS[i].title}!`)
      + `<br>📊 Con đã hoàn thành <b>${totalPct()}%</b> chương trình`
    : lvl===1 ? [hasNext?`🆕 Đã mở <b>Level 2</b> của bài này`:'', last?'':`🔓 Đã mở khoá Lesson ${i+2}: ${LESSONS[i+1].title}`].filter(Boolean).join('<br>') || 'Con đã hoàn thành tất cả các bài học! 🎓'
    : hasNext ? `🌟 Con đã chinh phục Level ${lvl}!<br>🆕 Đã mở <b>Level ${lvl+1}</b> của bài này`
    : `👑 Con đã chinh phục level cao nhất của bài ${LESSONS[i].title}!`;
  const packMsg = newPack ? `<br>🎉 Con đã qua bài kiểm tra của tất cả các bài! Về trang chủ để <b>tải nội dung mới</b> nhé.` : '';
  P.innerHTML=`<div class="center result">
    <div class="big ${ok?'trophy':''}">${ok?pickOne(['🏆','🥇','👑','🎖️','🏅','🦄','🚀','🌟']):'🌱'}</div>
    <h3>${ok?pickOne(['Con đã qua bài!','Qua bài rồi! Hoan hô!','Con giỏi quá đi!','Xuất sắc! Qua bài rồi!','Siêu sao tiếng Anh!']):'Gần được rồi!'}</h3>
    <div class="sc">Đúng ${sc}/${n} câu ${ok?'':'— cần '+PASS+' câu để qua bài'}</div>
    ${ok?`<div class="st">${stars(st)}</div>`:''}
    <p class="hint">${ok?unlockMsg+packMsg:'Ôn lại từ vựng và ngữ pháp rồi thử lại nhé (lần sau có câu hỏi mới). Con làm được mà! 💪'}</p>
    <div class="row">${ok
      ? `<button class="btn ghost" id="r1">🏠 Trang chủ</button>${hasNext?`<button class="btn" id="r3">🆕 Học Level ${lvl+1} →</button>`:''}${last||!unlocked(i+1)?'':`<button class="btn ${hasNext?'ghost':''}" id="r2">Lesson ${i+2} →</button>`}`
      : `<button class="btn ghost" id="r1">📚 Ôn lại bài</button><button class="btn" id="r2">🔁 Làm lại</button>`}</div></div>`;
  if(ok){ $('#r1').onclick=home;
    const r2=$('#r2'); if(r2) r2.onclick=()=>lesson(i+1,'vocab',startLevel(i+1));
    const r3=$('#r3'); if(r3) r3.onclick=()=>lesson(i,'vocab',lvl+1); }
  else { $('#r1').onclick=()=>lesson(i,'vocab',lvl); $('#r2').onclick=()=>{ track('start','test',{l:lkey(i),lv:lvl}); runQuiz(P, makeTest(lv(i,lvl),key), (s,m)=>testResult(i,lvl,s,m), 'Kiểm tra'); }; }
}

// Chưa có tên thì bắt buộc nhập tên trước khi học
if(user && NAME_RE.test(user) && token){ home(); refreshFromServer().finally(loadPacks); }
else if(user && NAME_RE.test(user)) login(user);      // đã có tên từ trước khi có mã PIN → nhập / đặt PIN
else { user=null; login(); }

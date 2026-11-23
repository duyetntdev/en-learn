const PASS = 8, TEST_N = 10;

/* ================== TIẾN ĐỘ ================== */
const KEY='beVuiHocTiengAnh.v1';
let progress = {};   // {lessonIndex: stars}
try{ progress = JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ progress = {}; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(progress)); }catch(e){} }
const passed = i => (progress[i]||0) > 0;
const unlocked = i => i===0 || passed(i-1);

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
  $('#app').innerHTML = `
  <div class="top">
    <div class="logo"><div class="owl">🦉</div><div><h1>Bé Vui Học <span>Tiếng Anh</span></h1><p>Học mỗi ngày một chút — vui ơi là vui!</p></div></div>
    <div class="prog"><b>🏅 ${done}/${LESSONS.length} bài đã qua</b><div class="bar"><i style="width:${done/LESSONS.length*100}%"></i></div></div>
  </div>
  <div class="hello"><div style="font-size:40px">🦉</div><div class="bubble">${
    done===LESSONS.length ? 'Tuyệt vời! Con đã hoàn thành tất cả bài học! 🎓 Hãy ôn lại để giữ 3 sao nhé.'
    : done===0 ? 'Xin chào! Mình là cú Ollie. Bắt đầu với <b>Bài 1</b> nhé! Làm đúng bài kiểm tra để mở khoá bài tiếp theo 🔓'
    : `Giỏi quá! Tiếp tục với <b>Bài ${cur+1}: ${LESSONS[cur].title}</b> nào!`}</div></div>
  <div class="grid">${LESSONS.map((L,i)=>{
    const lock=!unlocked(i), st=progress[i]||0;
    return `<button class="lcard ${lock?'locked':''} ${i===cur?'current':''}" style="--c:${L.color}" data-open="${i}" aria-label="Bài ${i+1} ${L.title}${lock?' (đang khoá)':''}">
      ${lock?'<span class="lock">🔒</span>':st?`<span class="stars">${stars(st)}</span>`:''}
      <div class="ic">${L.icon}</div>
      <div class="num">Bài ${i+1}</div><h3>${L.title}</h3><div class="vi">${L.vi}</div>
      <div class="state">${lock?'Qua bài '+i+' để mở khoá':st?'✅ Đã qua — học lại':'▶ Bắt đầu học'}</div>
    </button>`;}).join('')}</div>
  <div class="foot"><span>Tiến độ được lưu trên trình duyệt này. Bật loa để nghe phát âm 🔊</span><button class="link" id="reset">Xoá tiến độ</button></div>`;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.open;
    if(!unlocked(i)){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast(`🔒 Con cần qua bài kiểm tra Bài ${i} trước nhé!`); return; }
    lesson(i,'vocab');
  });
  $('#reset').onclick=()=>{
    const m=document.createElement('div'); m.className='modal';
    m.innerHTML=`<div class="box"><div style="font-size:50px">🗑️</div><h3>Xoá toàn bộ tiến độ?</h3><p class="hint">Tất cả bài sẽ bị khoá lại trừ Bài 1.</p><div class="row"><button class="btn ghost" id="no">Không</button><button class="btn" id="yes" style="--c:#F0554A">Xoá</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#no').onclick=()=>m.remove();
    m.querySelector('#yes').onclick=()=>{progress={};save();m.remove();home();};
  };
  stopAll();
  window.scrollTo(0,0);
}

/* ================== BÀI HỌC ================== */
const TABS=[['vocab','📚 Từ vựng'],['dialog','💬 Hội thoại'],['grammar','✏️ Ngữ pháp'],['practice','🎯 Luyện tập'],['test','🏆 Kiểm tra']];
function lesson(i,tab){
  const L=LESSONS[i];
  document.documentElement.style.setProperty('--c',L.color);
  stopAll();
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">${L.icon}</div>
    <div><div class="sub">Bài ${i+1} · ${L.vi} ${progress[i]?'· '+stars(progress[i]):''}</div><h2>${L.title}</h2></div></div>
  <div class="tabs">${TABS.map(([k,t])=>`<button class="tab ${k===tab?'on':''}" data-tab="${k}">${t}</button>`).join('')}</div>
  <div class="panel" id="panel"></div>`;
  $('#back').onclick=home;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>lesson(i,b.dataset.tab));
  const P=$('#panel');
  const next=(k,label)=>`<div class="nextrow"><button class="btn" id="nx">${label} →</button></div>`;
  const wireNext=k=>{const b=$('#nx'); if(b) b.onclick=()=>{lesson(i,k);window.scrollTo({top:0,behavior:'smooth'});};};

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
    const start=()=>runQuiz(P, makePractice(i), (sc,n)=>{
      P.innerHTML=`<div class="center result"><div class="big">${sc>=n-1?'🌟':sc>=n/2?'👍':'💪'}</div><h3>Luyện tập xong!</h3>
      <div class="sc">Đúng ${sc}/${n} câu</div><p class="hint">${sc>=n-1?'Con đã sẵn sàng làm bài kiểm tra!':'Luyện thêm một lượt nữa cho chắc nhé.'}</p>
      <div class="row"><button class="btn ghost" id="again">🔁 Luyện tiếp</button><button class="btn" id="totest">🏆 Làm bài kiểm tra</button></div></div>`;
      $('#again').onclick=start; $('#totest').onclick=()=>lesson(i,'test');
    });
    start();
  }
  if(tab==='test'){
    P.innerHTML=`<div class="testintro"><div class="big">🏆</div><h3>Bài kiểm tra Bài ${i+1}</h3>
      <p class="hint">Gồm từ vựng, nghe, ngữ pháp, sắp xếp câu và hội thoại.</p>
      <div><span class="pill">📝 ${TEST_N} câu</span><span class="pill">✅ Cần đúng ${PASS} câu</span><span class="pill">🔓 Qua bài để mở bài tiếp theo</span></div>
      ${progress[i]?`<p class="hint" style="margin-top:12px">Kết quả tốt nhất: ${stars(progress[i])}</p>`:''}
      <div class="row"><button class="btn" id="go">Bắt đầu kiểm tra</button></div></div>`;
    $('#go').onclick=()=>runQuiz(P, makeTest(i), (sc,n)=>testResult(i,sc,n), 'Kiểm tra');
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
  return {type:'choice', autosay:w[0],
    prompt:`<div class="ask">🎧 Nghe và chọn từ đúng</div><button class="listen" data-say="${esc(w[0])}" aria-label="Nghe">🔊</button>`,
    options:opts.map(o=>({label:o[0],val:o[0]})), answer:w[0], show:w[0]};
}
function fillQ(f){
  return {type:'choice',
    prompt:`<div class="ask">Chọn từ đúng điền vào chỗ trống:</div><div class="sent">${f[0].replace('___','<span class="blank">&nbsp;?&nbsp;</span>')}</div>`,
    options:shuffle(f[2]).map(o=>({label:o,val:o})), answer:f[1], show:f[1], sayAfter:/[a-z]/i.test(f[0].split('=')[0]) && !f[0].includes('=') ? f[0].replace('___',f[1]).replace(/[^\x00-\x7F]/g,'') : null};
}
function orderQ(s){ return {type:'order', answer:s}; }
function dialogQ(L,d){
  return {type:'choice',
    prompt:`<div class="ask">💬 Theo hội thoại:</div><div class="sent" style="font-size:24px">${d[0]}</div>`,
    options:shuffle(d[2]).map(o=>({label:o,val:o})), answer:d[1], show:d[1]};
}
function makePractice(i){
  const L=LESSONS[i], ws=shuffle(L.words);
  return shuffle([vocabQ(L,ws[0],'pic'),vocabQ(L,ws[1],'pic'),vocabQ(L,ws[2],'word'),vocabQ(L,ws[3],'word'),vocabQ(L,ws[4],'listen'),
    ...shuffle(L.fill).slice(0,2).map(fillQ), orderQ(shuffle(L.order)[0])]);
}
function makeTest(i){
  const L=LESSONS[i], ws=shuffle(L.words);
  const qs=[vocabQ(L,ws[0],'pic'),vocabQ(L,ws[1],'word'),vocabQ(L,ws[2],'listen'),vocabQ(L,ws[3],'pic'),
    ...shuffle(L.fill).slice(0,3).map(fillQ), ...shuffle(L.order).slice(0,2).map(orderQ), dialogQ(L,shuffle(L.dq)[0])];
  return shuffle(qs).slice(0,TEST_N);
}

/* ================== BỘ CHẠY CÂU HỎI ================== */
function runQuiz(P, qs, onDone, label){
  let k=0, score=0;
  const praise=['🎉 Giỏi lắm!','🌟 Tuyệt vời!','👏 Chính xác!','🥳 Đúng rồi!'];
  function show(){
    if(k>=qs.length) return onDone(score, qs.length);
    const q=qs[k];
    P.innerHTML=`<div class="qhead"><span>${label?label+' · ':''}Câu ${k+1}/${qs.length}</span><div class="qbar"><i style="width:${k/qs.length*100}%"></i></div><span>⭐ ${score}</span></div>
      <div class="qprompt">${q.type==='order'?'<div class="ask">🧩 Sắp xếp các từ thành câu đúng</div><button class="say" data-say="'+esc(q.answer)+'" aria-label="Nghe gợi ý" style="margin-top:8px">🔊</button>':q.prompt}</div>
      <div id="qb"></div><div class="feed" id="fd"></div>`;
    const B=$('#qb');
    if(q.autosay) setTimeout(()=>speak(q.autosay),250);
    if(q.type==='choice'){
      B.innerHTML=`<div class="opts">${q.options.map((o,n)=>`<button class="opt ${q.emo?'emo':''}" data-n="${n}">${o.label}</button>`).join('')}</div>`;
      B.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        const o=q.options[+b.dataset.n], ok=o.val===q.answer;
        B.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(q.options[+x.dataset.n].val===q.answer) x.classList.add('right');});
        if(!ok) b.classList.add('wrong');
        done(ok, q.show, q.sayAfter);
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
          done(ok, q.answer, q.answer);
        };
      };
      draw();
    }
  }
  function done(ok, right, say){
    if(ok) score++;
    tone(ok);
    if(ok && say) setTimeout(()=>speak(say),450);
    const F=$('#fd'); F.className='feed '+(ok?'ok':'no');
    F.innerHTML=`<span>${ok?praise[Math.floor(Math.random()*praise.length)]:'😅 Chưa đúng rồi! Đáp án: <b style="color:var(--ink)">'+right+'</b>'}</span>
      <button class="btn" id="cont">${k+1<qs.length?'Tiếp tục →':'Xem kết quả →'}</button>`;
    $('#cont').onclick=()=>{k++;show();};
    $('#cont').focus({preventScroll:true});
  }
  show();
}

function testResult(i,sc,n){
  const P=$('#panel'), ok=sc>=PASS, st= sc>=n?3: sc>=n-1?2: ok?1:0;
  const first=!passed(i);
  if(ok){ progress[i]=Math.max(progress[i]||0,st); save(); confetti(); tone(true); }
  const last=i===LESSONS.length-1;
  P.innerHTML=`<div class="center result">
    <div class="big">${ok?'🏆':'🌱'}</div>
    <h3>${ok?'Con đã qua bài!':'Gần được rồi!'}</h3>
    <div class="sc">Đúng ${sc}/${n} câu ${ok?'':'— cần '+PASS+' câu để qua bài'}</div>
    ${ok?`<div class="st">${stars(st)}</div>`:''}
    <p class="hint">${ok?(last?'Con đã hoàn thành tất cả các bài học! 🎓':(first?`🔓 Đã mở khoá Bài ${i+2}: ${LESSONS[i+1].title}!`:'Làm tốt lắm!')):'Ôn lại từ vựng và ngữ pháp rồi thử lại nhé. Con làm được mà! 💪'}</p>
    <div class="row">${ok
      ? `<button class="btn ghost" id="r1">🏠 Trang chủ</button>${last?'':`<button class="btn" id="r2">Học Bài ${i+2} →</button>`}`
      : `<button class="btn ghost" id="r1">📚 Ôn lại bài</button><button class="btn" id="r2">🔁 Làm lại</button>`}</div></div>`;
  if(ok){ $('#r1').onclick=home; const r2=$('#r2'); if(r2) r2.onclick=()=>lesson(i+1,'vocab'); }
  else { $('#r1').onclick=()=>lesson(i,'vocab'); $('#r2').onclick=()=>runQuiz(P, makeTest(i), (s,m)=>testResult(i,s,m), 'Kiểm tra'); }
}

home();

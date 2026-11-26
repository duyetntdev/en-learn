/* ================== TRÒ CHƠI: NHÀ THÁM HIỂM THIÊN TÀI ==================
   Bé chọn một trong 6 vùng đất (EXPEDITIONS trong js/explore-data.js) để thám hiểm, chơi theo thứ tự nào cũng được.
   - Mỗi chuyến 8 câu: 3 từ vựng, 3 câu kiến thức khoa học (kèm "Điều thú vị"), 1 câu tìm quy luật hoặc đếm số,
     1 câu tìm vật khác loại. Ưu tiên câu bé chưa gặp.
   - Sai không bị trừ: câu đó quay lại cuối lượt. Phải đúng hết mới xong chuyến.
   - Trả lời đúng câu kiến thức → nhận "thẻ khám phá" (cất trong Sổ tay nhà thám hiểm).
   - Xong chuyến → huy hiệu vùng đất, 1–3 sao (sai càng ít càng nhiều sao). Đủ 6 huy hiệu → Bằng Nhà thám hiểm thiên tài.
   Dữ liệu ghi vào `seen` (tự đồng bộ lên máy chủ, chỉ tăng không giảm):
     explore|best|<vùng>        số sao cao nhất của chuyến
     explore|card|<vùng>|<đáp án>  thẻ khám phá đã nhận
     explore|diploma            đã nhận bằng (1)
     explore|q|<vùng>|<loại>|<câu> số lần đã gặp câu hỏi (để ưu tiên câu mới)
   File này phải nạp TRƯỚC app.js. */
const XK = k => 'explore|'+k;
const xCount = k => (typeof seen!=='undefined' && seen[XK(k)]) || 0;
const xBest = id => xCount('best|'+id);
const xBadges = () => EXPEDITIONS.filter(e=>xBest(e.id)>0).length;
const xHasCard = (e,f) => xCount('card|'+e.id+'|'+f[2]) > 0;
const xCards = () => EXPEDITIONS.reduce((a,e)=>a+e.facts.filter(f=>xHasCard(e,f)).length, 0);
const xCardsTotal = () => EXPEDITIONS.reduce((a,e)=>a+e.facts.length, 0);
const exploreLabel = () => { const b=xBadges(); return b ? `${b}/${EXPEDITIONS.length} huy hiệu · ${xCards()} thẻ` : 'Trò chơi mới!'; };
const NUMW = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
function xSetMax(k, v){ if(xCount(k) < v){ seen[XK(k)]=v; saveSeen(); scheduleSync(); } }

/* ---------- câu hỏi ---------- */
function factQ(e, f){
  return {type:'choice', autosay:f[0], fact:f,
    prompt:`<div class="ask">🔬 Câu hỏi khám phá</div><div class="sent">${esc(f[0])} <button class="say" data-say="${esc(f[0])}" aria-label="Nghe">🔊</button></div><div class="vihint">${esc(f[1])}</div>`,
    options:shuffle([f[2],...f[3]]).map(o=>({label:esc(o),val:o})), answer:f[2], show:esc(f[2]), sayAfter:f[2],
    why:`🌟 <b>Điều thú vị:</b> ${f[5]}`};
}
function patternQ(p){
  const seq=p[0]; let k=1; while(k<seq.length && !seq.every((x,i)=>x===seq[i%k])) k++;
  return {type:'choice', emo:true,
    prompt:`<div class="ask">🧩 What comes next? <button class="say" data-say="What comes next?" aria-label="Nghe">🔊</button></div><div class="vihint">Hình nào tiếp theo?</div>
      <div class="pseq">${seq.map(x=>`<span>${x}</span>`).join('')}<span class="pq">?</span></div>`,
    options:shuffle([p[1],...p[2]]).map(o=>({label:o,val:o})), answer:p[1], show:p[1],
    why:`🧠 <b>Quy luật:</b> nhóm <b>${seq.slice(0,k).join(' ')}</b> lặp đi lặp lại, nên tiếp theo là ${p[1]}.`};
}
function countQ(e){
  const w=pickOne(e.words.filter(x=>[...x[2]].length<=2)), n=3+Math.floor(Math.random()*7);
  const opts=shuffle([n, n>3?n-1:n+2, n<10?n+1:n-2]);
  return {type:'choice', autosay:'How many can you count?',
    prompt:`<div class="ask">🔢 How many can you count? <button class="say" data-say="How many can you count?" aria-label="Nghe">🔊</button></div><div class="vihint">Con đếm được bao nhiêu?</div>
      <div class="pseq count">${Array.from({length:n},()=>`<span>${w[2]}</span>`).join('')}</div>`,
    options:opts.map(x=>({label:NUMW[x],val:NUMW[x]})), answer:NUMW[n], show:NUMW[n], sayAfter:NUMW[n],
    why:`🧮 Có <b>${n}</b> ${w[2]} (${esc(w[1])}). Số ${n} trong tiếng Anh là <b>${NUMW[n]}</b>.`};
}
function oddQ(o){
  return {type:'choice', autosay:o[0],
    prompt:`<div class="ask">🔍 Tìm vật khác loại</div><div class="sent">${esc(o[0])} <button class="say" data-say="${esc(o[0])}" aria-label="Nghe">🔊</button></div><div class="vihint">${esc(o[1])}</div>`,
    options:shuffle([o[2],...o[3]]).map(x=>({label:`<span class="oe">${x[1]}</span> ${esc(x[0])}`,val:x[0]})), answer:o[2][0], show:esc(o[2][0]), sayAfter:o[2][0],
    why:`💡 ${o[4]}`};
}
function expeditionQs(e){
  const K = t => x => XK('q|'+e.id+'|'+t+'|'+(t==='f'?x[2]:x[0]));
  const ws=fresh(e.words,3,K('w')), fs=fresh(e.facts,3,K('f'));
  markSeen([...ws.map(K('w')), ...fs.map(K('f'))]);
  const L={words:e.words}, kinds=shuffle(['pic','word','listen','vi','en']);
  const mk=[
    ...ws.map((w,j)=>()=>Object.assign(vocabQ(L,w,kinds[j]), {why:`<b>${esc(w[0])}</b> = ${esc(w[1])} ${w[2]}`})),
    ...fs.map(f=>()=>factQ(e,f)),
    Math.random()<0.5 ? ()=>patternQ(e.pattern) : ()=>countQ(e),
    ()=>oddQ(e.odd),
  ];
  return shuffle(mk).map(f=>Object.assign(f(), {mk:f}));
}

/* ---------- bản đồ các vùng đất ---------- */
function explore(){
  trackScreen('explore');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#1F8A70');
  const b=xBadges(), name=esc(user||'');
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">🧭</div>
    <div><div class="sub">Trò chơi · Khoa học và tư duy</div><h2>Nhà thám hiểm thiên tài</h2></div></div>
  <div class="panel">
    <div class="tintro">
      <p class="hint">Con là nhà thám hiểm! Chọn một vùng đất để khám phá. Mỗi chuyến có <b>8 thử thách</b>: từ vựng, câu hỏi khoa học
        và câu đố tư duy. Trả lời đúng câu khoa học để nhận <b>thẻ khám phá</b> 🃏. Hoàn thành chuyến đi để nhận <b>huy hiệu</b> 🏅.
        Đủ ${EXPEDITIONS.length} huy hiệu là con nhận <b>Bằng Nhà thám hiểm thiên tài</b> mang tên mình! 🎓</p>
      <div><span class="pill">🏅 ${b}/${EXPEDITIONS.length} huy hiệu</span><span class="pill">🃏 ${xCards()}/${xCardsTotal()} thẻ khám phá</span></div>
    </div>
    <div class="xgrid">${EXPEDITIONS.map((e,i)=>{ const st=xBest(e.id), got=e.facts.filter(f=>xHasCard(e,f)).length;
      return `<button class="xcard ${st?'done':''}" data-x="${i}" style="--x1:${e.bg[0]};--x2:${e.bg[1]};--xc:${e.color}">
        <span class="xic">${e.icon}</span>${st?`<span class="xbadge" title="Đã có huy hiệu">🏅</span>`:''}
        <b>${esc(e.name)}</b><span class="xvi">${esc(e.vi)}</span>
        <span class="xst">${st?stars(st):'Chưa khám phá'}</span>
        <span class="xcards">🃏 ${got}/${e.facts.length} thẻ</span>
        <span class="xgo">${st?'▶ Thám hiểm lại':'▶ Khám phá'}</span></button>`; }).join('')}</div>
    <div class="treward xdip">
      <div class="trw-txt">
        <h3>🎓 Bằng Nhà thám hiểm thiên tài</h3>
        <p class="hint" style="margin:0">Hoàn thành cả ${EXPEDITIONS.length} chuyến thám hiểm để nhận bằng mang tên <b>${name}</b>, có đủ ${EXPEDITIONS.length} huy hiệu,
          số sao của từng chuyến và số thẻ khám phá con sưu tầm được. Bố mẹ chụp màn hình để khen con nhé! 📸</p>
        <p class="trw-left">${b<EXPEDITIONS.length ? `Còn <b>${EXPEDITIONS.length-b}</b> chuyến nữa là con nhận được bằng!` : 'Con đã nhận bằng rồi! 🎉'}</p>
        ${xCount('diploma')?'<button class="btn" id="seedip">🎓 Xem bằng của con</button>':''}
      </div>
      <div class="cert mini"><div class="ctitle">Bằng</div><div class="cname">Nhà thám hiểm thiên tài</div><div class="cwho">${name}</div>
        <div class="cgems">${EXPEDITIONS.map(e=>`<span class="${xBest(e.id)?'':'no'}" title="${esc(e.vi)}">${e.icon}</span>`).join('')}</div>
        ${b<EXPEDITIONS.length?`<div class="clock">🔒 Còn ${EXPEDITIONS.length-b} chuyến</div>`:''}</div>
    </div>
    <h3 style="margin-top:22px">📔 Sổ tay nhà thám hiểm</h3>
    <p class="hint">Thẻ khám phá con đã nhận. Trả lời đúng câu hỏi khoa học để mở thêm thẻ.</p>
    ${EXPEDITIONS.map(e=>`<details class="xbook" ${e.facts.some(f=>xHasCard(e,f))?'open':''}><summary>${e.icon} ${esc(e.vi)} · ${e.facts.filter(f=>xHasCard(e,f)).length}/${e.facts.length}</summary>
      <div class="xcardlist">${e.facts.map(f=>xHasCard(e,f)
        ? `<div class="fcard"><span class="fe">${f[4]}</span><div><b lang="en">${esc(f[2])}</b><small>${f[5]}</small></div></div>`
        : `<div class="fcard no"><span class="fe">❔</span><div><b>Chưa tìm thấy</b><small>${esc(f[1])}</small></div></div>`).join('')}</div></details>`).join('')}
  </div>`;
  $('#back').onclick=home;
  document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>expedition(+b.dataset.x));
  const sd=$('#seedip'); if(sd) sd.onclick=diploma;
  window.scrollTo(0,0);
}

/* ---------- một chuyến thám hiểm ---------- */
function expedition(i){
  const e=EXPEDITIONS[i];
  trackScreen('expedition', {x:e.id}); track('start','expedition',{x:e.id});
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c', e.color);
  const hero=avatar(user||'').e, deco=e.words.slice(0,6).map(w=>w[2]);
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về bản đồ">⬅</button><div class="ic">${e.icon}</div>
    <div><div class="sub">Nhà thám hiểm thiên tài · ${esc(e.vi)}</div><h2>${esc(e.name)}</h2></div></div>
  <div class="xscene" style="--x1:${e.bg[0]};--x2:${e.bg[1]};--xc:${e.color}" aria-hidden="true">
    ${deco.map((d,k)=>`<span class="xd" style="left:${8+k*15}%;top:${k%2?14:46}%">${d}</span>`).join('')}
    <div class="xpath" id="xpath">${Array.from({length:8},()=>'<i></i>').join('')}</div>
    <span class="xhero" id="xhero" style="--p:0">${hero}<small>🎒</small></span><span class="xflag">🚩</span>
  </div>
  <div class="panel" id="panel"></div>`;
  $('#back').onclick=explore;
  const P=$('#panel'), qs=expeditionQs(e), need=qs.length, newCards=[];
  let right=0, wrong=0;
  const draw=()=>{ const h=$('#xhero'); if(h) h.style.setProperty('--p', right/need);
    document.querySelectorAll('#xpath i').forEach((x,k)=>x.classList.toggle('on', k<right)); };
  const head=()=>`<span>🧭 Chặng <b>${right}/${need}</b></span><div class="qbar"><i style="width:${right/need*100}%"></i></div><span title="Thẻ khám phá mới">🃏 ${newCards.length}</span>`;
  const hooks={
    over:()=>right>=need, head, doneLabel:'🏅 Nhận huy hiệu →',
    answer:(ok, el, q)=>{
      if(ok){ right++;
        if(q.fact && !xHasCard(e, q.fact)){ markSeen([XK('card|'+e.id+'|'+q.fact[2])]); newCards.push(q.fact); q.newCard=true;
          const r=(el||P).getBoundingClientRect(); setTimeout(()=>FX.float(r.left+r.width/2, r.top-20, '🃏 +1'), 300); } }
      else { wrong++; qs.push(Object.assign(q.mk(), {mk:q.mk, retry:true})); }
      draw(); const h=P.querySelector('.qhead'); if(h) h.innerHTML=head();
    },
    explain:(q, ok)=>`<div class="why">${!ok?'<div class="grit">🔁 Câu này sẽ quay lại để con thử lần nữa nhé.</div>':''}
      ${ok&&q.newCard?`<div class="grit">🃏 Thẻ khám phá mới: ${q.fact[4]} đã cất vào sổ tay!</div>`:''}${q.why||''}</div>`,
  };
  runQuiz(P, qs, ()=>expeditionDone(i, wrong, newCards), '', hooks);
  window.scrollTo(0,0);
}

function expeditionDone(i, wrong, newCards){
  const e=EXPEDITIONS[i], st = wrong===0 ? 3 : wrong<=2 ? 2 : 1, first=!xBest(e.id);
  track('done','expedition',{x:e.id, s:8, n:8+wrong, ok:1});
  xSetMax('best|'+e.id, st);
  const allDone=xBadges()===EXPEDITIONS.length, newDip=allDone && !xCount('diploma');
  if(newDip) markSeen([XK('diploma')]);
  const nextI=EXPEDITIONS.findIndex((x,k)=>k!==i && !xBest(x.id));
  const P=$('#panel');
  P.innerHTML=`<div class="center result xwon" style="--xc:${e.color};--x1:${e.bg[0]};--x2:${e.bg[1]}">
    <div class="xmedal"><span>${e.icon}</span></div>
    <h3>${first?'Con đã nhận huy hiệu':'Hoàn thành chuyến thám hiểm'} ${esc(e.vi)}!</h3>
    <div class="st">${stars(st)}</div>
    <div class="sc">${wrong?`Con trả lời sai ${wrong} lần nhưng đã thử lại đến cùng 💪`:'Đúng hết ngay từ lần đầu, đúng là thiên tài! 💡'}</div>
    ${newCards.length?`<div class="xnew"><b>🃏 ${newCards.length} thẻ khám phá mới</b>${newCards.map(f=>`<div class="fcard"><span class="fe">${f[4]}</span><div><b lang="en">${esc(f[2])}</b><small>${f[5]}</small></div></div>`).join('')}</div>`:''}
    <p class="hint">${allDone?'🎓 Con đã có đủ huy hiệu của tất cả các vùng đất!':`🏅 Con đã có <b>${xBadges()}/${EXPEDITIONS.length}</b> huy hiệu. Còn ${EXPEDITIONS.length-xBadges()} chuyến nữa là nhận <b>Bằng Nhà thám hiểm thiên tài</b>!`}</p>
    <div class="row"><button class="btn ghost" id="xmap">🧭 Về bản đồ</button>
      ${newDip?'<button class="btn" id="xdip">🎓 Nhận bằng →</button>':nextI>=0?`<button class="btn" id="xnext">${EXPEDITIONS[nextI].icon} Chuyến tiếp theo →</button>`:''}</div>
  </div>`;
  setTimeout(()=>{ fanfare(); FX.celebrate({power:st+1, emojis:[e.icon,'🏅','🃏',...newCards.map(f=>f[4])]}); }, 300);
  $('#xmap').onclick=explore;
  const n=$('#xnext'); if(n) n.onclick=()=>expedition(nextI);
  const d=$('#xdip'); if(d) d.onclick=diploma;
  window.scrollTo(0,0);
}

/* ---------- Bằng Nhà thám hiểm thiên tài ---------- */
function diploma(){
  trackScreen('diploma');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#1F8A70');
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về bản đồ">⬅</button><div class="ic">🎓</div>
    <div><div class="sub">Nhà thám hiểm thiên tài</div><h2>Bằng của con</h2></div></div>
  <div class="panel center">
    <div class="cert xcert">
      <div class="ctitle">Bằng</div>
      <div class="cname">Nhà thám hiểm thiên tài</div>
      <div class="cwho">${esc(user||'')}</div>
      <p class="hint">đã hoàn thành ${EXPEDITIONS.length} chuyến thám hiểm khắp các vùng đất</p>
      <div class="xbadges">${EXPEDITIONS.map(e=>`<div style="--xc:${e.color}"><span>${e.icon}</span><b>${esc(e.vi)}</b><small>${stars(xBest(e.id))}</small></div>`).join('')}</div>
      <div class="cfoot">🃏 ${xCards()}/${xCardsTotal()} thẻ khám phá · ${new Date().toLocaleDateString('vi-VN')}</div>
    </div>
    <p class="hint">📸 Bố mẹ chụp màn hình bằng này để khen con nhé!</p>
    <div class="row"><button class="btn ghost" id="h">🏠 Trang chủ</button><button class="btn" id="xm">🧭 Thám hiểm tiếp</button></div>
  </div>`;
  $('#back').onclick=explore; $('#xm').onclick=explore; $('#h').onclick=home;
  setTimeout(()=>{ fanfare(); FX.celebrate({power:5, emojis:['🎓','🏅','🧭',...EXPEDITIONS.map(e=>e.icon)]}); }, 500);
  window.scrollTo(0,0);
}

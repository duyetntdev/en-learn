/* ================== TRÒ CHƠI: ĐI TÌM KHO BÁU ==================
   Hướng tới giáo dục nhân cách và rèn tính kiên trì. Nội dung ở js/virtues.js.
   - Bản đồ có các hòn đảo đức tính (VIRTUES), đi lần lượt: qua đảo trước mới mở đảo sau.
   - Mỗi lượt chơi một đảo 7 câu: 3 từ vựng, 2 tình huống ứng xử, 1 điền từ, 1 sắp xếp câu, chọn từ kho câu
     của đảo, ưu tiên câu bé chưa gặp. Câu nào cũng có giải thích.
   - Trả lời sai không bị trừ gì: câu đó quay lại cuối lượt (đáp án xáo lại) cho tới khi con làm đúng.
     Làm đúng một câu từng sai → +1 "hạt kiên trì" 🌱. Phải đúng hết mới qua đảo.
   - Qua đảo: nhận viên đá quý và một lời hứa để đọc to. Qua hết đảo: mở kho báu, nhận giấy khen,
     rồi bắt đầu hành trình mới.
   Dữ liệu ghi vào `seen` với khoá "treasure|…" (tự đồng bộ lên máy chủ như tiến độ, chỉ tăng không giảm):
     treasure|chests       số kho báu đã tìm = số hành trình đã xong (hành trình hiện tại có số thứ tự này)
     treasure|j<n>|<đảo>   đảo đã qua trong hành trình thứ n
     treasure|seeds        tổng số hạt kiên trì
   File này phải nạp TRƯỚC app.js. */
const TK = k => 'treasure|'+k;
const tCount = k => (typeof seen!=='undefined' && seen[TK(k)]) || 0;
const tJourney = () => tCount('chests');
const isleDone = (id, j=tJourney()) => tCount('j'+j+'|'+id) > 0;
const islesDone = () => VIRTUES.filter(v=>isleDone(v.id)).length;
const treasureLabel = () => { const c=tCount('chests'), d=islesDone();
  return d ? `Đã qua ${d}/${VIRTUES.length} đảo` : c ? `Đã tìm được ${c} kho báu` : 'Trò chơi mới!'; };

function situQ(s){
  return {type:'choice',
    prompt:`<div class="ask">🤔 Tình huống</div><div class="situ">${esc(s[0])}</div>`,
    options:shuffle([s[1],...s[2]]).map(o=>({label:esc(o),val:o})), answer:s[1], show:esc(s[1]), sayAfter:s[1], why:s[3]};
}
// Chọn câu cho một lượt: ưu tiên câu bé ít gặp nhất (đếm trong `seen`, khoá treasure|q|<đảo>|<loại>|<câu>)
function isleQs(v){
  const L={words:v.words}, kinds=shuffle(['vi','en','listen']);   // từ trừu tượng nên không hỏi kiểu nhìn hình
  const K = t => x => TK('q|'+v.id+'|'+t+'|'+(t==='s'?x[1]:x[0]));
  const ws=fresh(v.words,3,K('w')), ss=fresh(v.situations,2,K('s')), fs=fresh(v.fills,1,K('f')), os=fresh(v.orders,1,K('o'));
  markSeen([...ws.map(K('w')), ...ss.map(K('s')), ...fs.map(K('f')), ...os.map(K('o'))]);
  const mk=[
    ...ws.map((w,j)=>()=>Object.assign(vocabQ(L,w,kinds[j]),
      {why:`<b>${esc(w[0])}</b> = ${esc(w[1])} ${w[2]}. ${v.notes[w[0]]||''}`})),
    ...ss.map(s=>()=>situQ(s)),
    ...fs.map(f=>()=>Object.assign(fillQ(f), {why:f[3]})),
    ...os.map(o=>()=>Object.assign(orderQ(o[0]), {why:`<b>${esc(o[0])}</b> = ${esc(o[1])} ${o[2]}`})),
  ];
  return shuffle(mk).map(f=>Object.assign(f(), {mk:f}));
}

/* ---------- Bản đồ ---------- */
function treasure(){
  trackScreen('treasure');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#1F8FBF');
  const j=tJourney(), d=islesDone(), hero=avatar(user||'').e, seeds=tCount('seeds');
  const cur = VIRTUES.findIndex(v=>!isleDone(v.id, j));
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về trang chủ">⬅</button><div class="ic">🗺️</div>
    <div><div class="sub">Trò chơi · Đức tính và kiên trì</div><h2>Đi tìm kho báu</h2></div></div>
  <div class="panel">
    <div class="tintro">
      <p class="hint">Cú Ollie tìm thấy một tấm bản đồ cũ! Kho báu nằm sau <b>${VIRTUES.length} hòn đảo</b>, mỗi đảo giữ một viên đá quý đức tính.
        Trả lời đúng hết câu hỏi của đảo để nhận đá quý. Trả lời sai cũng không sao: câu đó sẽ <b>quay lại</b> để con thử lần nữa.
        Mỗi lần con thử lại và làm đúng, con nhận được 1 <b>hạt kiên trì</b> 🌱.</p>
      <div><span class="pill">🏝️ Đã qua ${d}/${VIRTUES.length} đảo</span><span class="pill">🌱 ${seeds} hạt kiên trì</span>${tCount('chests')?`<span class="pill">🏆 Đã tìm được ${tCount('chests')} kho báu</span>`:''}</div>
    </div>
    <ol class="tmap" aria-label="Bản đồ các hòn đảo">
      ${VIRTUES.map((v,i)=>{ const done=isleDone(v.id,j), open=done||i===cur;
        return `<li class="isle ${done?'done':''} ${i===cur?'cur':''} ${open?'':'off'}" style="--ic:${v.color}">
          <button class="inode" data-i="${i}" ${open?'':'aria-disabled="true"'} aria-label="${v.place}${done?' (đã qua)':open?'':' (chưa mở)'}">
            <span class="iemo">${open?v.icon:'🔒'}</span>${i===cur?`<span class="boat" aria-hidden="true">⛵${hero}</span>`:''}</button>
          <div class="itxt"><b>${v.place}</b><span>${v.title}</span>
            <em>${done?'💎 Đã nhận đá quý · chơi lại':i===cur?'▶ Lên đảo':'Qua đảo trước để mở'}</em></div></li>`; }).join('')}
      <li class="isle chestrow ${d===VIRTUES.length?'cur':'off'}"><div class="inode"><span class="iemo">🧰</span></div>
        <div class="itxt"><b>Kho báu</b><span>Rương báu đức tính</span><em>Qua đủ ${VIRTUES.length} đảo để mở · có giấy khen mang tên con</em></div></li>
    </ol>
    ${rewardHTML(j)}
  </div>`;
  $('#back').onclick=home;
  document.querySelectorAll('.inode[data-i]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    if(b.getAttribute('aria-disabled')){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); toast('🔒 Con cần qua đảo trước đã nhé!'); return; }
    playIsle(i);
  });
  window.scrollTo(0,0);
}

/* ---------- Phần thưởng cuối hành trình (hiện trên bản đồ, cho bé biết mình đang cố gắng vì điều gì) ---------- */
function rewardHTML(j){
  const left=VIRTUES.filter(v=>!isleDone(v.id, j)).length, name=esc(user||'');
  return `<div class="treward">
    <div class="trw-txt">
      <h3>🧰 Phần thưởng cuối hành trình</h3>
      <ul>
        <li><span>🎉</span><div>Mở <b>rương kho báu</b>: ${VIRTUES.length} viên đá quý con sưu tầm bay lên, có pháo hoa và nhạc chúc mừng.</div></li>
        <li><span>📜</span><div>Nhận <b>Giấy khen "Nhà thám hiểm đức tính"</b> mang tên <b>${name}</b>.</div></li>
        <li><span>💎</span><div>Trên giấy khen có <b>${VIRTUES.length} lời hứa</b> của con (bấm vào là nghe đọc), số <b>hạt kiên trì</b> con đã nhận và ngày hoàn thành.</div></li>
        <li><span>📸</span><div>Bố mẹ chụp màn hình giấy khen để khen con, gửi ông bà hoặc in ra dán ở góc học tập nhé!</div></li>
      </ul>
      <p class="trw-left">${left ? `Còn <b>${left}</b> đảo nữa là con mở được kho báu!` : 'Con đã qua đủ các đảo, mở kho báu thôi!'}</p>
    </div>
    <div class="cert mini" aria-label="Giấy khen xem trước">
      <div class="ctitle">Giấy khen</div>
      <div class="cname">Nhà thám hiểm đức tính</div>
      <div class="cwho">${name}</div>
      <div class="cgems">${VIRTUES.map(v=>`<span class="${isleDone(v.id, j)?'':'no'}" title="${esc(v.place)}">${v.icon}</span>`).join('')}</div>
      ${left?`<div class="clock">🔒 Còn ${left} đảo</div>`:''}
    </div>
  </div>`;
}

/* ---------- Trên đảo ---------- */
function playIsle(i){
  const v=VIRTUES[i];
  trackScreen('island', {x:v.id}); track('start','island',{x:v.id});
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c', v.color);
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về bản đồ">⬅</button><div class="ic">${v.icon}</div>
    <div><div class="sub">Đi tìm kho báu · Đảo ${i+1}/${VIRTUES.length}</div><h2>${v.place}</h2></div></div>
  <div class="panel" id="panel"></div>`;
  $('#back').onclick=treasure;
  const P=$('#panel'), qs=isleQs(v), need=qs.length;
  let right=0, wrong=0, seeds=0;
  const head=()=>`<span>${v.icon} Đúng <b>${right}/${need}</b></span><div class="qbar"><i style="width:${right/need*100}%"></i></div><span id="tseed" title="Hạt kiên trì">🌱 ${seeds}</span>`;
  const hooks={
    over:()=>right>=need,
    head,
    doneLabel:'💎 Nhận đá quý →',
    answer:(ok, el, q)=>{
      if(ok){ right++;
        if(q.retry){ seeds++; markSeen([TK('seeds')]);
          const r=(el||P).getBoundingClientRect(); setTimeout(()=>FX.float(r.left+r.width/2, r.top-30, '🌱 +1'), 300); } }
      else { wrong++; qs.push(Object.assign(q.mk(), {mk:q.mk, retry:true})); }    // câu sai quay lại cuối lượt
      const h=P.querySelector('.qhead'); if(h) h.innerHTML=head();
    },
    explain:(q, ok)=>`<div class="why">
      ${ok&&q.retry?'<div class="grit">🌱 Con đã không bỏ cuộc! +1 hạt kiên trì</div>':''}
      ${!ok?'<div class="grit">🔁 Câu này sẽ quay lại để con thử lần nữa nhé.</div>':''}
      <b>💡 Giải thích:</b> ${q.why||''}</div>`,
  };
  runQuiz(P, qs, ()=>{ track('done','island',{x:v.id, s:need, n:need+wrong, ok:1}); isleWon(i, wrong, seeds); }, '', hooks);
}

function isleWon(i, wrong, seeds){
  const v=VIRTUES[i], j=tJourney(), first=!isleDone(v.id, j);
  markSeen([TK('j'+j+'|'+v.id)]);
  const all = islesDone()===VIRTUES.length;
  if(all) markSeen([TK('chests')]);                       // hành trình xong: lần sau bắt đầu hành trình mới
  const P=$('#panel'), last=i===VIRTUES.length-1;
  P.innerHTML=`<div class="center result isle-won" style="--ic:${v.color}">
    <div class="gem"><span>${v.icon}</span></div>
    <h3>Con đã nhận viên đá quý ${v.place.replace('Đảo ','')}!</h3>
    <div class="sc">${wrong ? `Con trả lời sai ${wrong} lần nhưng không bỏ cuộc 🌱 +${seeds} hạt kiên trì` : 'Đúng hết ngay từ lần đầu! Tuyệt vời!'}</div>
    <div class="pledge">
      <div class="plabel">Lời hứa của ${v.place}</div>
      <button class="pbtn" data-say="${esc(v.pledge[0])}">🔊 ${esc(v.pledge[0])}</button>
      <div class="pvi">${esc(v.pledge[1])}</div>
      <p class="hint small">Con hãy đọc to lời hứa này cùng bố mẹ nhé!</p>
    </div>
    ${all ? '' : `<p class="hint">🧰 Còn <b>${VIRTUES.length - islesDone()}</b> đảo nữa là con mở được kho báu và nhận <b>giấy khen mang tên ${esc(user||'con')}</b>!</p>`}
    <div class="row"><button class="btn ghost" id="map">🗺️ Về bản đồ</button>${
      all ? '<button class="btn" id="open">🧰 Mở kho báu →</button>'
      : !last && first ? `<button class="btn" id="next">⛵ Đảo tiếp theo →</button>` : ''}</div>
  </div>`;
  setTimeout(()=>{ fanfare(); FX.celebrate({power:2, emojis:[v.icon,'💎','🌱','⭐']}); speak(v.pledge[0]); }, 400);
  $('#map').onclick=treasure;
  const nx=$('#next'); if(nx) nx.onclick=()=>playIsle(i+1);
  const op=$('#open'); if(op) op.onclick=openChest;
  window.scrollTo(0,0);
}

/* ---------- Kho báu ---------- */
function openChest(){
  trackScreen('chest'); track('done','chest');
  stopAll(); FX.stop && FX.stop();
  document.documentElement.style.setProperty('--c','#D99A00');
  const today=new Date().toLocaleDateString('vi-VN');
  $('#app').innerHTML=`
  <div class="lhead"><button class="back" id="back" aria-label="Về bản đồ">⬅</button><div class="ic">🧰</div>
    <div><div class="sub">Đi tìm kho báu</div><h2>Kho báu đức tính</h2></div></div>
  <div class="panel center">
    <div class="chest" aria-hidden="true"><div class="gems">${VIRTUES.map((v,k)=>`<span style="--d:${k*0.18+0.9}s">${v.icon}</span>`).join('')}</div>
      <div class="lid"></div><div class="box"></div></div>
    <h3 class="chest-h">Con đã tìm thấy kho báu!</h3>
    <p class="hint">Kho báu thật sự là những đức tính tốt con mang theo mỗi ngày.</p>
    <div class="cert">
      <div class="ctitle">Giấy khen</div>
      <div class="cname">Nhà thám hiểm đức tính</div>
      <div class="cwho">${esc(user||'')}</div>
      <ul class="cplist">${VIRTUES.map(v=>`<li><span>${v.icon}</span><button class="link" data-say="${esc(v.pledge[0])}">🔊 ${esc(v.pledge[0])}</button></li>`).join('')}</ul>
      <div class="cfoot">🌱 ${tCount('seeds')} hạt kiên trì · 🏆 Kho báu thứ ${tCount('chests')} · ${today}</div>
    </div>
    <div class="row"><button class="btn ghost" id="h">🏠 Trang chủ</button><button class="btn" id="again">🗺️ Bắt đầu hành trình mới</button></div>
    ${shareHTML(false)}
  </div>`;
  $('#back').onclick=treasure; $('#again').onclick=treasure; $('#h').onclick=home;
  setTimeout(()=>{ fanfare(); FX.celebrate({power:5, emojis:['💎','👑','🌱',...VIRTUES.map(v=>v.icon)]}); }, 900);
  window.scrollTo(0,0);
}

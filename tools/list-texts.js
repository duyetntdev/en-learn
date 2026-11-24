// Liệt kê mọi câu/từ mà website sẽ đọc to, kèm giọng đọc và tên file mp3.
// Dùng: node tools/list-texts.js   (in ra JSON)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const ctx = {};
vm.runInNewContext(read('lessons.js') + '\n' + read('lessons2.js') + '\n' + read('lessons3.js') + '\n' + read('virtues.js') +
  '\nthis.LESSONS = LESSONS; this.LEVEL2 = LEVEL2; this.LEVEL3 = LEVEL3; this.VIRTUES = VIRTUES;', ctx);

// Phải giống hệt hàm slug() trong js/app.js
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const BOYS = ['Nam', 'Tom', 'Bin'];          // nhân vật nam dùng giọng nam (còn lại: giọng nữ)
const out = new Map();
const add = (text, voice = 'af_heart') => {
  text = String(text).trim();
  const s = slug(text);
  if (s && !out.has(s)) out.set(s, { text, voice, file: s + '.mp3' });
};

for (const L of [...ctx.LESSONS, ...Object.values(ctx.LEVEL2), ...Object.values(ctx.LEVEL3)]) {
  L.words.forEach(w => add(w[0]));
  L.dialog.forEach(d => add(d[1], BOYS.includes(d[0]) ? 'am_puck' : 'af_heart'));
  L.grammar.examples.forEach(x => add(x[0]));
  L.order.forEach(s => add(s));
  L.fill.forEach(f => {
    if (!f[0].includes('=')) add(f[0].replace('___', f[1]).replace(/[^\x00-\x7F]/g, ''));
  });
}
// Trò chơi Đi tìm kho báu (js/virtues.js): từ, câu tình huống, câu điền từ, câu sắp xếp, lời hứa
for (const V of ctx.VIRTUES) {
  V.words.forEach(w => add(w[0]));
  V.situations.forEach(x => add(x[1]));
  add(V.fill[0].replace('___', V.fill[1]));
  add(V.order[0]);
  add(V.pledge[0]);
}
console.log(JSON.stringify([...out.values()], null, 1));

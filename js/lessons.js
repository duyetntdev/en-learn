/* ================== NỘI DUNG BÀI HỌC ==================
   Sửa / thêm bài ở file này. Sau khi thêm câu hoặc từ mới, chạy:
     python3 tools/generate_audio.py
   để tạo file âm thanh còn thiếu trong thư mục audio/.

   words: [tiếng Anh, nghĩa, emoji, (tuỳ chọn) đường dẫn ảnh]
   Muốn dùng ảnh thật: chép ảnh vào thư mục images/ rồi thêm phần tử thứ 4,
   ví dụ: ['dog','con chó','🐶','images/dog.png']  (không có ảnh thì hiển thị emoji) */
const LESSONS = [
{icon:'🐶',title:'Animals',vi:'Con vật',color:'#FF8A5B',
 words:[['dog','con chó','🐶'],['cat','con mèo','🐱'],['bird','con chim','🐦'],['fish','con cá','🐟'],['rabbit','con thỏ','🐰'],['duck','con vịt','🦆'],['cow','con bò','🐮'],['pig','con lợn','🐷']],
 people:{Nam:'👦',Lan:'👧'},
 dialog:[['Nam','Hello, Lan!','Chào Lan!'],['Lan','Hi, Nam! What is it?','Chào Nam! Đó là con gì vậy?'],['Nam','It is a rabbit.','Đó là một con thỏ.'],['Lan','Wow! And what is it?','Ồ! Còn kia là con gì?'],['Nam','It is a duck.','Đó là một con vịt.'],['Lan','I like ducks!','Mình thích vịt lắm!']],
 grammar:{title:'What is it? – It is a ...',points:['Hỏi: <b>What is it?</b> = Đó là cái gì / con gì?','Trả lời: <b>It is a</b> + tên con vật. (It is viết tắt là <b>It\'s</b>)','Chữ <b>a</b> nghĩa là "một", đứng trước danh từ số ít.'],
  examples:[['What is it?','Đó là con gì?'],['It is a dog.','Đó là một con chó.'],["It's a fish.",'Đó là một con cá.']],tip:'💡 Nhớ thêm "a" trước tên một con vật: a cat, a bird, a cow.'},
 fill:[['___ is it?','What',['What','Who','How']],['It ___ a cat.','is',['is','am','are']],['It is ___ dog.','a',['a','is','it']],['It is a ___. 🐷','pig',['pig','cow','duck']]],
 order:['What is it','It is a bird','I like ducks'],
 dq:[['Nam chỉ con vật đầu tiên là con gì?','a rabbit',['a rabbit','a cat','a cow']],['Lan thích con gì?','ducks',['ducks','dogs','fish']]]},

{icon:'🎨',title:'Colors',vi:'Màu sắc',color:'#4F86F7',
 words:[['red','màu đỏ','🔴'],['blue','màu xanh dương','🔵'],['yellow','màu vàng','🟡'],['green','màu xanh lá','🟢'],['orange','màu cam','🟠'],['purple','màu tím','🟣'],['black','màu đen','⚫'],['white','màu trắng','⚪']],
 people:{Tom:'👦',Mai:'👧'},
 dialog:[['Tom','Hello, Mai! What color is your bag?','Chào Mai! Cặp của bạn màu gì?'],['Mai','It is red. What color is your bag?','Màu đỏ. Cặp của bạn màu gì?'],['Tom','It is blue.','Màu xanh dương.'],['Mai','I like blue!','Mình thích màu xanh dương!'],['Tom','Look! A yellow bird!','Nhìn kìa! Một con chim màu vàng!'],['Mai','Wow, it is beautiful!','Ồ, nó đẹp quá!']],
 grammar:{title:'What color is it? – It is red.',points:['Hỏi màu: <b>What color is it?</b> = Nó màu gì?','Trả lời: <b>It is</b> + màu. Ví dụ: It is green.','Màu đứng <b>trước</b> đồ vật: <b>a red apple</b> (một quả táo đỏ) — ngược với tiếng Việt!'],
  examples:[['What color is it?','Nó màu gì?'],['It is green.','Nó màu xanh lá.'],['a blue bird','một con chim xanh dương'],['a black cat','một con mèo đen']],tip:'💡 Tiếng Việt nói "con mèo đen", tiếng Anh nói "black cat" (đen trước, mèo sau).'},
 fill:[['What ___ is it?','color',['color','is','name']],['It is ___. 🟡','yellow',['yellow','green','red']],['Một con mèo đen = a ___','black cat',['black cat','cat black','black a cat']],['Một quả táo đỏ = a ___ apple 🍎','red',['red','blue','green']]],
 order:['What color is it','It is a blue bird','I like green'],
 dq:[['Cặp của Mai màu gì?','red',['red','blue','yellow']],['Con chim Tom nhìn thấy màu gì?','yellow',['yellow','black','white']]]},

{icon:'🔢',title:'Numbers',vi:'Số đếm',color:'#F5A300',
 words:[['one','số một','1️⃣'],['two','số hai','2️⃣'],['three','số ba','3️⃣'],['four','số bốn','4️⃣'],['five','số năm','5️⃣'],['six','số sáu','6️⃣'],['seven','số bảy','7️⃣'],['eight','số tám','8️⃣']],
 people:{Teacher:'👩‍🏫',Bin:'👦'},
 dialog:[['Teacher','Hello, Bin! How many apples?','Chào Bin! Có bao nhiêu quả táo?'],['Bin','One, two, three. Three apples!','Một, hai, ba. Ba quả táo!'],['Teacher','Good! How many cats?','Giỏi lắm! Có bao nhiêu con mèo?'],['Bin','Two cats!','Hai con mèo!'],['Teacher','Great job!','Làm tốt lắm!'],['Bin','Thank you, teacher!','Em cảm ơn cô!']],
 grammar:{title:'How many ...? – Số nhiều thêm -s',points:['Hỏi số lượng: <b>How many</b> + đồ vật số nhiều + ?','Từ 2 trở lên, thêm <b>-s</b> vào cuối: one cat → two cat<b>s</b>.','Chỉ có 1 thì không thêm -s: <b>one dog</b>.'],
  examples:[['How many dogs?','Có bao nhiêu con chó?'],['Four dogs.','Bốn con chó.'],['one bird','một con chim'],['five birds','năm con chim']],tip:'💡 Đếm thử đồ vật quanh nhà bằng tiếng Anh nhé: one chair, two chairs...'},
 fill:[['two ___','cats',['cats','cat','a cat']],['one ___','dog',['dog','dogs','two dog']],['How ___ birds?','many',['many','is','color']],['3 = ___','three',['three','two','five']]],
 order:['How many cats','I see four birds','Three red apples'],
 dq:[['Bin đếm được bao nhiêu quả táo?','three',['three','two','five']],['Có bao nhiêu con mèo?','two',['two','one','four']]]},

{icon:'👨‍👩‍👧',title:'Family',vi:'Gia đình',color:'#E8559A',
 words:[['father','bố','👨'],['mother','mẹ','👩'],['brother','anh / em trai','👦'],['sister','chị / em gái','👧'],['baby','em bé','👶'],['grandpa','ông','👴'],['grandma','bà','👵'],['family','gia đình','👨‍👩‍👧‍👦']],
 people:{Lan:'👧',Nam:'👦'},
 dialog:[['Lan','Look, Nam! This is my family.','Nhìn này Nam! Đây là gia đình mình.'],['Nam','Who is he?','Đây là ai?'],['Lan','He is my father.','Đó là bố mình.'],['Nam','Who is she?','Còn đây là ai?'],['Lan','She is my mother.','Đó là mẹ mình.'],['Nam','And the baby?','Còn em bé?'],['Lan','This is my baby brother.','Đây là em trai nhỏ của mình.']],
 grammar:{title:'This is my ... / He is – She is',points:['Giới thiệu: <b>This is my</b> + người. (my = của tôi)','Hỏi ai đó là ai: <b>Who is he?</b> / <b>Who is she?</b>','<b>He</b> = anh ấy, ông ấy (con trai). <b>She</b> = cô ấy, bà ấy (con gái).'],
  examples:[['This is my mother.','Đây là mẹ tôi.'],['He is my brother.','Anh ấy là anh trai tôi.'],['She is my grandma.','Bà ấy là bà tôi.']],tip:'💡 Bố, ông, anh trai → He. Mẹ, bà, chị gái → She.'},
 fill:[['This ___ my mother.','is',['is','are','am']],['___ is my father. 👨','He',['He','She','It']],['___ is my sister. 👧','She',['She','He','It']],['This is ___ grandma.','my',['my','I','is']]],
 order:['This is my family','She is my mother','Who is he'],
 dq:[['"Who is he?" – Lan trả lời thế nào?','He is my father.',['He is my father.','He is my brother.','He is my grandpa.']],['Em bé là ai của Lan?','brother',['brother','sister','mother']]]},

{icon:'🍎',title:'Food',vi:'Đồ ăn',color:'#2FB36B',
 words:[['apple','quả táo','🍎'],['banana','quả chuối','🍌'],['bread','bánh mì','🍞'],['milk','sữa','🥛'],['egg','quả trứng','🥚'],['rice','cơm','🍚'],['cake','bánh ngọt','🍰'],['water','nước','💧']],
 people:{Tom:'👦',Mai:'👧'},
 dialog:[['Mai','I am hungry!','Mình đói quá!'],['Tom','Do you like bananas?','Bạn có thích chuối không?'],['Mai','Yes, I do. I like bananas.','Có. Mình thích chuối.'],['Tom','Do you like milk?','Bạn có thích sữa không?'],['Mai',"No, I don't. I like water.",'Không. Mình thích nước lọc.'],['Tom','Here you are!','Của bạn đây!'],['Mai','Thank you, Tom!','Cảm ơn Tom!']],
 grammar:{title:"I like / I don't like / Do you like ...?",points:['<b>I like</b> ... = Tôi thích ...','<b>I don\'t like</b> ... = Tôi không thích ...','Hỏi: <b>Do you like</b> ...? → <b>Yes, I do.</b> / <b>No, I don\'t.</b>'],
  examples:[['I like apples.','Tôi thích táo.'],["I don't like eggs.",'Tôi không thích trứng.'],['Do you like cake?','Bạn có thích bánh ngọt không?'],['Yes, I do.','Có, tôi thích.']],tip:"💡 don't = do not (không)."},
 fill:[['I ___ apples. 😋','like',['like','am','is']],['Do you like cake? – Yes, I ___.','do',['do','am','like']],['Do you like eggs? – No, I ___.',"don't",["don't",'do','am']],['___ you like rice?','Do',['Do','Is','Are']]],
 order:['I like bananas',"I don't like milk",'Do you like cake'],
 dq:[['Mai có thích chuối không?','Yes',['Yes','No']],['Mai thích uống gì?','water',['water','milk','cake']]]},

{icon:'🎒',title:'School',vi:'Trường học',color:'#8E62F0',
 words:[['book','quyển sách','📕'],['pen','bút mực','🖊️'],['pencil','bút chì','✏️'],['bag','cặp sách','🎒'],['ruler','thước kẻ','📏'],['chair','cái ghế','🪑'],['teacher','giáo viên','🧑‍🏫'],['school','trường học','🏫']],
 people:{Teacher:'👩‍🏫',Bin:'👦'},
 dialog:[['Teacher','Good morning, class!','Chào buổi sáng cả lớp!'],['Bin','Good morning, teacher!','Chúng em chào cô ạ!'],['Teacher','Bin, do you have a pencil?','Bin, em có bút chì không?'],['Bin','Yes, I do. I have a pencil.','Có ạ. Em có một cái bút chì.'],['Teacher','Do you have a ruler?','Em có thước kẻ không?'],['Bin',"No, I don't. Sorry!",'Không ạ. Em xin lỗi!']],
 grammar:{title:'I have ... / Do you have ...?',points:['<b>I have a</b> ... = Tôi có một ...','Hỏi: <b>Do you have a</b> ...? → <b>Yes, I do.</b> / <b>No, I don\'t.</b>','Nhớ có <b>a</b> trước một đồ vật: a book, a pen.'],
  examples:[['I have a book.','Tôi có một quyển sách.'],['Do you have a pen?','Bạn có bút mực không?'],["No, I don't.",'Không, tôi không có.']],tip:'💡 Câu hỏi "Do you ...?" luôn trả lời bằng "do" hoặc "don\'t".'},
 fill:[['I ___ a book.','have',['have','am','is']],['Do you ___ a pen?','have',['have','is','are']],['Do you have a bag? – Yes, I ___.','do',['do','have','am']],['I have ___ ruler.','a',['a','is','do']]],
 order:['I have a pencil','Do you have a ruler','Good morning teacher'],
 dq:[['Bin có bút chì không?','Yes',['Yes','No']],['Bin không có đồ gì?','a ruler',['a ruler','a pencil','a book']]]}
];

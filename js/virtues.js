/* ================== NỘI DUNG TRÒ CHƠI "ĐI TÌM KHO BÁU" ==================
   Hành trình qua các hòn đảo, mỗi đảo là một đức tính. Sửa / thêm đảo ở file này.
   Sau khi thêm câu mới, chạy  python3 tools/generate_audio.py  để tạo file mp3 (thiếu file thì dùng giọng trình duyệt).

   words:      [tiếng Anh, nghĩa, emoji]  – nên có 6 từ (mỗi lượt hỏi 3 từ, các từ còn lại làm đáp án nhiễu)
   notes:      giải thích cho từng từ (hiện sau khi bé trả lời)
   situations: [tình huống (tiếng Việt), câu đúng, [2 câu sai], giải thích]
   fill:       [câu có ___, từ đúng, [các lựa chọn], giải thích ngữ pháp]
   order:      [câu để sắp xếp (không dấu câu), nghĩa tiếng Việt, giải thích]
   pledge:     [lời hứa tiếng Anh, nghĩa] – bé đọc to khi qua đảo */
const VIRTUES = [
{id:'kind', icon:'💖', place:'Đảo Tốt Bụng', title:'Kind', color:'#F2557F',
 words:[['kind','tốt bụng','💖'],['help','giúp đỡ','🤝'],['share','chia sẻ','🍪'],['hug','ôm','🤗'],['smile','mỉm cười','😊'],['gentle','nhẹ nhàng','🕊️']],
 notes:{
  kind:'Người tốt bụng đối xử dịu dàng và luôn nghĩ đến cảm giác của người khác.',
  help:'Giúp đỡ là làm một việc nhỏ cho người đang cần, như nhặt đồ rơi hay xách đồ cùng mẹ.',
  share:'Chia sẻ là cho bạn cùng dùng đồ của mình. Khi chia sẻ, cả hai đều vui.',
  hug:'Một cái ôm làm người buồn thấy ấm áp hơn. Nhớ hỏi bạn có muốn được ôm không nhé.',
  smile:'Nụ cười là món quà miễn phí. Con cười với bạn, bạn cũng sẽ cười với con.',
  gentle:'Nhẹ nhàng là nói khẽ, chạm khẽ, nhất là với em nhỏ và con vật.'},
 situations:[
  ['Bạn của con bị ngã. Con nói gì?','Are you OK?',['Ha ha!','Go away!'],'"Are you OK?" nghĩa là "Bạn có sao không?". Hỏi han khi bạn bị đau là cách thể hiện lòng tốt. Không bao giờ cười khi bạn bị ngã nhé.'],
  ['Con có 2 cái bánh, bạn không có cái nào. Con nói:',"Let's share!",["It's mine!",'No, thanks.'],'"Let\'s share!" nghĩa là "Mình cùng chia nhé!". Một cái bánh chia đôi thì hai bạn cùng vui.'],
  ['Mẹ đang xách túi đồ nặng. Con nói:','Can I help you?',["I'm busy.","I'm hungry."],'"Can I help you?" nghĩa là "Con giúp mẹ nhé?". Lòng tốt bắt đầu từ những việc nhỏ ngay trong nhà mình.']],
 fill:['I ___ my toys with my friends.','share',['share','shares','sharing'],'Với "I" (tôi), động từ giữ nguyên: I share. Với he / she thì thêm -s: She shares.'],
 order:['I help my mom','Con giúp đỡ mẹ.','Câu tiếng Anh đi theo thứ tự: Ai (I) → làm gì (help) → cho ai (my mom).'],
 pledge:['I am kind. I help others.','Con là người tốt bụng. Con giúp đỡ mọi người.']},

{id:'honest', icon:'🌟', place:'Đảo Trung Thực', title:'Honest', color:'#E0A100',
 words:[['honest','trung thực','🌟'],['truth','sự thật','✅'],['lie','nói dối','🤥'],['sorry','xin lỗi','🙇'],['promise','lời hứa','🤞'],['mistake','lỗi sai','❌']],
 notes:{
  honest:'Trung thực là nói đúng sự thật, kể cả khi mình làm sai. Người trung thực được mọi người tin tưởng.',
  truth:'"Tell the truth" nghĩa là "nói sự thật".',
  lie:'Nói dối có thể tránh bị mắng một lúc, nhưng làm mọi người mất lòng tin vào mình rất lâu.',
  sorry:'Nói "I\'m sorry" khi mình làm sai là việc của người dũng cảm.',
  promise:'Đã hứa thì phải cố gắng làm. Vì vậy chỉ hứa điều mình làm được.',
  mistake:'Ai cũng có lỗi sai. Nhận lỗi và sửa lỗi giúp con lớn lên mỗi ngày.'},
 situations:[
  ['Con làm vỡ cốc. Mẹ hỏi "Who broke the cup?". Con nói:',"I did. I'm sorry.",['The cat did.',"I don't know."],'"I did. I\'m sorry." nghĩa là "Con làm ạ. Con xin lỗi.". Đổ lỗi cho mèo là nói dối. Nhận lỗi thì mẹ sẽ tin con hơn.'],
  ['Con nhặt được hộp bút của bạn. Con nói:','This is yours.',['I want it.','Finders keepers!'],'"This is yours." nghĩa là "Cái này của bạn.". Trả lại đồ cho người mất là trung thực, dù không ai nhìn thấy.'],
  ['Con chưa làm xong bài tập. Cô hỏi. Con nói:',"I didn't finish it.",['My dog ate it.','I finished it.'],'"I didn\'t finish it." nghĩa là "Con chưa làm xong.". Nói thật thì cô có thể giúp con làm tiếp.']],
 fill:['I always ___ the truth.','tell',['tell','tells','telling'],'"always" nghĩa là "luôn luôn", đứng trước động từ: I always tell the truth (Con luôn nói thật).'],
 order:['I am sorry','Con xin lỗi.','Với "I" thì dùng "am": I am sorry. Nói nhanh thì thành I\'m sorry.'],
 pledge:['I am honest. I tell the truth.','Con là người trung thực. Con luôn nói thật.']},

{id:'brave', icon:'🦁', place:'Đảo Dũng Cảm', title:'Brave', color:'#E8742F',
 words:[['brave','dũng cảm','🦁'],['try','thử','💪'],['afraid','sợ hãi','😨'],['new','mới','🆕'],['ask','hỏi','❓'],['stand up','đứng lên bảo vệ','🛡️']],
 notes:{
  brave:'Dũng cảm không phải là không biết sợ. Dũng cảm là vẫn làm điều đúng khi đang thấy sợ.',
  try:'Thử điều mới có thể chưa làm được ngay, nhưng không thử thì không bao giờ làm được.',
  afraid:'Sợ là cảm xúc bình thường. Con có thể nói "I am afraid" với bố mẹ để được giúp.',
  new:'Món ăn mới, bạn mới, trò chơi mới: thử một chút là đã dũng cảm rồi.',
  ask:'Dám hỏi khi chưa hiểu là dũng cảm. Người hay hỏi là người học nhanh.',
  'stand up':'"Stand up for" là đứng lên bảo vệ một người đang bị bắt nạt.'},
 situations:[
  ['Có bạn mới vào lớp, đứng một mình. Con nói:','Hi! Do you want to play?',['Who are you?','Go home!'],'"Do you want to play?" nghĩa là "Bạn có muốn chơi cùng không?". Làm quen với bạn mới cũng cần dũng cảm, và bạn ấy sẽ rất vui.'],
  ['Con chưa hiểu bài. Con giơ tay nói với cô:','Can you help me, please?',['I am bored.','I know everything.'],'"Can you help me, please?" nghĩa là "Cô giúp con được không ạ?". Dám hỏi là dũng cảm, không phải là kém.'],
  ['Một bạn đang bị trêu chọc. Con nói với người trêu:',"Stop, please. That's not nice.",['Ha ha, funny!','Me too!'],'"That\'s not nice" nghĩa là "Như vậy không hay đâu". Dũng cảm là bảo vệ bạn. Nếu không dừng lại, con hãy nhờ người lớn giúp.']],
 fill:['I ___ afraid, but I will try.','am',['am','is','are'],'Với "I" luôn dùng "am": I am. Với he / she dùng "is", với you / we / they dùng "are".'],
 order:['I can do it','Con làm được!','"can" nghĩa là "có thể". Hãy nói câu này mỗi khi con thấy việc gì đó khó.'],
 pledge:['I am brave. I can try new things.','Con dũng cảm. Con dám thử những điều mới.']},

{id:'polite', icon:'🙏', place:'Đảo Lễ Phép', title:'Polite', color:'#2F9E6B',
 words:[['please','làm ơn','🙏'],['thank you','cảm ơn','💐'],['excuse me','xin phép','✋'],['hello','xin chào','👋'],['listen','lắng nghe','👂'],['wait','chờ đợi','⏳']],
 notes:{
  please:'Thêm "please" vào lời nhờ thì lời nói trở nên nhẹ nhàng và lịch sự hơn.',
  'thank you':'Cảm ơn mỗi khi được giúp, dù là việc nhỏ. Người nghe sẽ muốn giúp con nữa.',
  'excuse me':'"Excuse me" dùng khi muốn đi qua, muốn hỏi, hoặc lỡ làm phiền ai đó.',
  hello:'Chào hỏi khi gặp người lớn là phép lịch sự đầu tiên con học được.',
  listen:'Lắng nghe là nhìn vào người đang nói và không ngắt lời.',
  wait:'Chờ đến lượt mình, khi xếp hàng hay khi người khác đang nói, là lễ phép.'},
 situations:[
  ['Bà tặng con một món quà. Con nói:','Thank you, Grandma!',['Give me more!','Bye!'],'"Thank you, Grandma!" nghĩa là "Con cảm ơn bà!". Món quà nào cũng chứa tình thương, nên hãy luôn cảm ơn.'],
  ['Con muốn mượn bút của bạn. Con nói:','Can I use your pen, please?',['Give me your pen!','Pen!'],'"Can I ..., please?" là cách hỏi mượn lịch sự. Hỏi trước khi lấy đồ của bạn nhé.'],
  ['Con muốn đi qua nhưng có người đứng chắn. Con nói:','Excuse me.',['Move!','Hey you!'],'"Excuse me" nghĩa là "Xin lỗi, cho con đi qua ạ". Nói nhẹ nhàng thì ai cũng vui vẻ nhường đường.']],
 fill:['___ you, Dad!','Thank',['Thank','Thanks','Thanking'],'"Thank you" nghĩa là cảm ơn. Không nói "Thanks you". Với bạn bè có thể nói ngắn: "Thanks!".'],
 order:['May I come in','Con xin phép vào được không ạ?','"May I ...?" là cách xin phép rất lễ phép, dùng khi vào phòng cô giáo hay phòng của người khác.'],
 pledge:['I am polite. I say please and thank you.','Con lễ phép. Con luôn nói "làm ơn" và "cảm ơn".']},

{id:'persevere', icon:'🐢', place:'Đảo Kiên Trì', title:'Never give up', color:'#4A7BE0',
 words:[['practice','luyện tập','🎹'],['again','lần nữa','🔁'],['slowly','chậm rãi','🐢'],['step','bước','👣'],['finish','hoàn thành','🏁'],['hard','khó','🧗']],
 notes:{
  practice:'Không ai giỏi ngay từ đầu. Luyện tập mỗi ngày một chút là bí quyết của mọi người giỏi.',
  again:'"Try again" nghĩa là "thử lại". Mỗi lần thử lại, con giỏi hơn lần trước một chút.',
  slowly:'Rùa đi chậm nhưng không dừng lại, nên vẫn về đích. Chậm mà chắc cũng rất tốt.',
  step:'Việc lớn chia thành từng bước nhỏ thì sẽ dễ hơn. "Step by step" nghĩa là "từng bước một".',
  finish:'Làm đến cùng, không bỏ dở giữa chừng, là kiên trì.',
  hard:'Thấy khó là lúc não đang lớn lên. Khó không có nghĩa là không làm được.'},
 situations:[
  ['Con tập đi xe đạp và bị ngã. Con nói:','I will try again!',['I give up.','Bikes are bad.'],'"I will try again!" nghĩa là "Con sẽ thử lại!". Ai mới học xe đạp cũng ngã. Người biết đi xe là người đã đứng dậy nhiều lần.'],
  ['Bài toán khó quá. Con nói:','Let me think again.',["It's too hard. Stop!",'I hate math.'],'"Let me think again" nghĩa là "Để con nghĩ lại". Hít thở sâu, đọc lại đề, thử thêm một cách nữa.'],
  ['Bạn con đang tập đàn mà chưa hay. Con nói:','Keep going! You can do it!',["That's bad.",'Stop playing.'],'"Keep going!" nghĩa là "Cố lên, tiếp tục nào!". Cổ vũ bạn kiên trì cũng là một cách tốt bụng.']],
 fill:['I practice English ___ day.','every',['every','all','many'],'"every day" nghĩa là "mỗi ngày". Học mỗi ngày 10 phút tốt hơn học một lần thật lâu rồi bỏ.'],
 order:['Never give up','Đừng bao giờ bỏ cuộc!','"give up" nghĩa là "bỏ cuộc", thêm "never" (không bao giờ) ở đầu thành lời nhắc nhở mình.'],
 pledge:['I never give up. I try again and again.','Con không bao giờ bỏ cuộc. Con thử lại nhiều lần.']},
];

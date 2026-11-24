/* ================== NỘI DUNG TRÒ CHƠI "ĐI TÌM KHO BÁU" ==================
   Hành trình qua các hòn đảo, mỗi đảo là một đức tính, đi theo đúng thứ tự trong danh sách này.
   Sửa / thêm câu hoặc thêm đảo ở file này. Sau khi thêm câu mới, tạo file mp3 còn thiếu:
     tools/.venv/bin/python tools/generate_audio.py      (thiếu file thì website dùng giọng trình duyệt)

   Mỗi lượt chơi một đảo hỏi 7 câu: 3 từ vựng + 2 tình huống + 1 điền từ + 1 sắp xếp câu,
   ưu tiên những câu bé chưa gặp. Càng nhiều câu thì mỗi lần chơi lại càng ít bị lặp.
   words:      [tiếng Anh, nghĩa, emoji]  – ít nhất 4 từ (từ không được hỏi dùng làm đáp án nhiễu)
   notes:      giải thích cho từng từ (hiện sau khi bé trả lời)
   situations: [tình huống (tiếng Việt), câu đúng, [2 câu sai], giải thích]
   fills:      [[câu có ___, từ đúng, [các lựa chọn], giải thích ngữ pháp], ...]
   orders:     [[câu để sắp xếp (không dấu câu), nghĩa tiếng Việt, giải thích], ...]
   pledge:     [lời hứa tiếng Anh, nghĩa] – bé đọc to khi qua đảo
   Khi thêm đảo mới: đặt `id` mới (không đổi id cũ, vì tiến độ của bé lưu theo id). */
const VIRTUES = [
{id:'kind', icon:'💖', place:'Đảo Tốt Bụng', title:'Kind', color:'#F2557F',
 words:[['kind','tốt bụng','💖'],['help','giúp đỡ','🤝'],['share','chia sẻ','🍪'],['hug','ôm','🤗'],['smile','mỉm cười','😊'],['gentle','nhẹ nhàng','🕊️'],
  ['friend','bạn bè','👫'],['give','cho, tặng','🎁']],
 notes:{
  kind:'Người tốt bụng đối xử dịu dàng và luôn nghĩ đến cảm giác của người khác.',
  help:'Giúp đỡ là làm một việc nhỏ cho người đang cần, như nhặt đồ rơi hay xách đồ cùng mẹ.',
  share:'Chia sẻ là cho bạn cùng dùng đồ của mình. Khi chia sẻ, cả hai đều vui.',
  hug:'Một cái ôm làm người buồn thấy ấm áp hơn. Nhớ hỏi bạn có muốn được ôm không nhé.',
  smile:'Nụ cười là món quà miễn phí. Con cười với bạn, bạn cũng sẽ cười với con.',
  gentle:'Nhẹ nhàng là nói khẽ, chạm khẽ, nhất là với em nhỏ và con vật.',
  friend:'Bạn tốt là người chơi cùng, giúp nhau và không bỏ rơi nhau khi bạn buồn.',
  give:'Cho đi một thứ mình có, dù nhỏ, làm người nhận vui và mình cũng vui.'},
 situations:[
  ['Bạn của con bị ngã. Con nói gì?','Are you OK?',['Ha ha!','Go away!'],'"Are you OK?" nghĩa là "Bạn có sao không?". Hỏi han khi bạn bị đau là cách thể hiện lòng tốt. Không bao giờ cười khi bạn bị ngã nhé.'],
  ['Con có 2 cái bánh, bạn không có cái nào. Con nói:',"Let's share!",["It's mine!",'No, thanks.'],'"Let\'s share!" nghĩa là "Mình cùng chia nhé!". Một cái bánh chia đôi thì hai bạn cùng vui.'],
  ['Mẹ đang xách túi đồ nặng. Con nói:','Can I help you?',["I'm busy.","I'm hungry."],'"Can I help you?" nghĩa là "Con giúp mẹ nhé?". Lòng tốt bắt đầu từ những việc nhỏ ngay trong nhà mình.'],
  ['Bà đang tìm kính. Con thấy kính ở trên bàn. Con nói:','Here are your glasses, Grandma.',["I don't know.",'Find them yourself.'],'"Here are your glasses" nghĩa là "Kính của bà đây ạ". Để ý và giúp ông bà những việc nhỏ là tốt bụng.'],
  ['Em của con buồn vì đồ chơi bị hỏng. Con nói:',"Don't be sad. Let's fix it.",["Ha ha, it's broken!","That's your problem."],'"Don\'t be sad" nghĩa là "Đừng buồn nhé". An ủi và cùng em sửa đồ chơi làm em thấy được yêu thương.'],
  ['Bạn ngồi cạnh quên mang bút chì. Con nói:','You can use my pencil.',['No pencil for you!','Ask someone else.'],'"You can use my pencil" nghĩa là "Bạn dùng bút chì của mình đi". Cho bạn mượn đồ khi bạn cần là tốt bụng.'],
  ['Có bạn mới ngồi ăn trưa một mình. Con nói:','Come and sit with us!',["You can't sit here.",'Go away!'],'"Come and sit with us!" nghĩa là "Lại ngồi với tụi mình nè!". Không để ai bị bỏ lại một mình.']],
 fills:[
  ['I ___ my toys with my friends.','share',['share','shares','sharing'],'Với "I" (tôi), động từ giữ nguyên: I share. Với he / she thì thêm -s: She shares.'],
  ['She ___ her little brother.','helps',['help','helps','helping'],'Với "she" (bạn ấy, cô ấy), động từ thêm -s: She helps. Với I / you / we thì giữ nguyên: I help.'],
  ['Can I ___ you?','help',['help','helps','helped'],'Sau "can" động từ luôn giữ nguyên: Can I help you? (Tớ giúp bạn nhé?)']],
 orders:[
  ['I help my mom','Con giúp đỡ mẹ.','Câu tiếng Anh đi theo thứ tự: Ai (I) → làm gì (help) → cho ai (my mom).'],
  ['You are my friend','Bạn là bạn của tớ.','Với "you" dùng "are": You are. Câu này nói ra làm bạn mình rất vui.'],
  ['I give her a hug','Con ôm bạn ấy một cái.','"give someone a hug" nghĩa là ôm ai đó. "her" là bạn ấy (con gái), "him" là bạn ấy (con trai).']],
 pledge:['I am kind. I help others.','Con là người tốt bụng. Con giúp đỡ mọi người.']},

{id:'honest', icon:'🌟', place:'Đảo Trung Thực', title:'Honest', color:'#E0A100',
 words:[['honest','trung thực','🌟'],['truth','sự thật','✅'],['lie','nói dối','🤥'],['sorry','xin lỗi','🙇'],['promise','lời hứa','🤞'],['mistake','lỗi sai','❌'],
  ['fair','công bằng','⚖️'],['trust','tin tưởng','🧡']],
 notes:{
  honest:'Trung thực là nói đúng sự thật, kể cả khi mình làm sai. Người trung thực được mọi người tin tưởng.',
  truth:'"Tell the truth" nghĩa là "nói sự thật".',
  lie:'Nói dối có thể tránh bị mắng một lúc, nhưng làm mọi người mất lòng tin vào mình rất lâu.',
  sorry:'Nói "I\'m sorry" khi mình làm sai là việc của người dũng cảm.',
  promise:'Đã hứa thì phải cố gắng làm. Vì vậy chỉ hứa điều mình làm được.',
  mistake:'Ai cũng có lỗi sai. Nhận lỗi và sửa lỗi giúp con lớn lên mỗi ngày.',
  fair:'Công bằng là chơi đúng luật, không gian lận, và chia phần đều cho mọi người.',
  trust:'Lòng tin giống như một chiếc cốc: làm vỡ thì rất khó dán lại. Trung thực giúp giữ lòng tin.'},
 situations:[
  ['Con làm vỡ cốc. Mẹ hỏi "Who broke the cup?". Con nói:',"I did. I'm sorry.",['The cat did.',"I don't know."],'"I did. I\'m sorry." nghĩa là "Con làm ạ. Con xin lỗi.". Đổ lỗi cho mèo là nói dối. Nhận lỗi thì mẹ sẽ tin con hơn.'],
  ['Con nhặt được hộp bút của bạn. Con nói:','This is yours.',['I want it.','Finders keepers!'],'"This is yours." nghĩa là "Cái này của bạn.". Trả lại đồ cho người mất là trung thực, dù không ai nhìn thấy.'],
  ['Con chưa làm xong bài tập. Cô hỏi. Con nói:',"I didn't finish it.",['My dog ate it.','I finished it.'],'"I didn\'t finish it." nghĩa là "Con chưa làm xong.". Nói thật thì cô có thể giúp con làm tiếp.'],
  ['Chơi cờ với bạn, con bị thua. Con nói:','Good game! You win.',['You cheated!',"I don't want to play anymore."],'"Good game! You win." nghĩa là "Ván hay lắm! Bạn thắng rồi.". Chấp nhận thua một cách vui vẻ là công bằng và trung thực.'],
  ['Cô bán hàng trả lại thừa tiền. Con nói với mẹ:','Mom, she gave us too much money.',["Shh! Let's keep it.","Let's buy candy!"],'"too much money" nghĩa là "thừa tiền". Trả lại tiền thừa là trung thực, cô bán hàng sẽ rất cảm ơn.'],
  ['Con lỡ ăn hết bánh của anh. Anh hỏi. Con nói:',"I ate it. I'm sorry.",['The dog ate it.','What cake?'],'"I ate it" nghĩa là "Em ăn rồi". Nói thật và xin lỗi, lần sau nhớ hỏi trước khi ăn đồ của người khác nhé.'],
  ['Con hứa dọn phòng nhưng chưa làm. Mẹ hỏi. Con nói:','Not yet. I will do it now.',["Yes, it's clean.",'I forgot. Never mind.'],'"Not yet" nghĩa là "Chưa ạ". Nói thật rồi làm ngay là cách giữ lời hứa.']],
 fills:[
  ['I always ___ the truth.','tell',['tell','tells','telling'],'"always" nghĩa là "luôn luôn", đứng trước động từ: I always tell the truth (Con luôn nói thật).'],
  ['I ___ lie.','never',['never','always','am'],'"never" nghĩa là "không bao giờ": I never lie (Con không bao giờ nói dối).'],
  ['He ___ the truth.','tells',['tell','tells','telling'],'Với "he" (bạn ấy, anh ấy), động từ thêm -s: He tells the truth.']],
 orders:[
  ['I am sorry','Con xin lỗi.','Với "I" thì dùng "am": I am sorry. Nói nhanh thì thành I\'m sorry.'],
  ['I broke the cup','Con đã làm vỡ cốc.','"broke" là dạng quá khứ của "break" (làm vỡ). Nói rõ mình đã làm gì là trung thực.'],
  ['I keep my promise','Con giữ lời hứa.','"keep a promise" nghĩa là giữ lời hứa. "break a promise" là thất hứa.']],
 pledge:['I am honest. I tell the truth.','Con là người trung thực. Con luôn nói thật.']},

{id:'brave', icon:'🦁', place:'Đảo Dũng Cảm', title:'Brave', color:'#E8742F',
 words:[['brave','dũng cảm','🦁'],['try','thử','💪'],['afraid','sợ hãi','😨'],['new','mới','🆕'],['ask','hỏi','❓'],['stand up','đứng lên bảo vệ','🛡️'],
  ['dark','bóng tối','🌙'],['speak','nói lên','🗣️']],
 notes:{
  brave:'Dũng cảm không phải là không biết sợ. Dũng cảm là vẫn làm điều đúng khi đang thấy sợ.',
  try:'Thử điều mới có thể chưa làm được ngay, nhưng không thử thì không bao giờ làm được.',
  afraid:'Sợ là cảm xúc bình thường. Con có thể nói "I am afraid" với bố mẹ để được giúp.',
  new:'Món ăn mới, bạn mới, trò chơi mới: thử một chút là đã dũng cảm rồi.',
  ask:'Dám hỏi khi chưa hiểu là dũng cảm. Người hay hỏi là người học nhanh.',
  'stand up':'"Stand up for" là đứng lên bảo vệ một người đang bị bắt nạt.',
  dark:'Sợ bóng tối là bình thường. Con có thể bật đèn ngủ nhỏ và tự nhủ "I am brave".',
  speak:'Dám nói lên điều mình nghĩ, nói nhẹ nhàng và lễ phép, là một kiểu dũng cảm.'},
 situations:[
  ['Có bạn mới vào lớp, đứng một mình. Con nói:','Hi! Do you want to play?',['Who are you?','Go home!'],'"Do you want to play?" nghĩa là "Bạn có muốn chơi cùng không?". Làm quen với bạn mới cũng cần dũng cảm, và bạn ấy sẽ rất vui.'],
  ['Con chưa hiểu bài. Con giơ tay nói với cô:','Can you help me, please?',['I am bored.','I know everything.'],'"Can you help me, please?" nghĩa là "Cô giúp con được không ạ?". Dám hỏi là dũng cảm, không phải là kém.'],
  ['Một bạn đang bị trêu chọc. Con nói với người trêu:',"Stop, please. That's not nice.",['Ha ha, funny!','Me too!'],'"That\'s not nice" nghĩa là "Như vậy không hay đâu". Dũng cảm là bảo vệ bạn. Nếu không dừng lại, con hãy nhờ người lớn giúp.'],
  ['Con phải đi tiêm và thấy sợ. Con nói:',"I'm scared, but I can do it.",['I will run away!','No, never!'],'"I\'m scared, but I can do it" nghĩa là "Con sợ, nhưng con làm được". Thấy sợ mà vẫn làm là dũng cảm thật sự.'],
  ['Lần đầu học bơi, thầy bảo con xuống nước. Con nói:','OK, I will try.',["I can't. Never!",'Swimming is stupid.'],'"I will try" nghĩa là "Con sẽ thử". Bắt đầu từ chỗ nước nông, từng chút một, con sẽ bơi được.'],
  ['Con bị lạc mẹ trong siêu thị. Con nói với cô nhân viên:',"I can't find my mom. Can you help me?",['I will look outside.','I will go with that man.'],'"I can\'t find my mom" nghĩa là "Con không tìm thấy mẹ". Khi bị lạc, đứng yên và nhờ cô chú nhân viên mặc đồng phục. Không đi ra ngoài và không đi theo người lạ.'],
  ['Cô gọi con lên bảng mà con chưa chắc đáp án. Con nói:','Let me try.',["I don't want to.",'Ask someone else.'],'"Let me try" nghĩa là "Để con thử". Sai cũng không sao, cô sẽ giúp con sửa. Dám thử là đã giỏi rồi.']],
 fills:[
  ['I ___ afraid, but I will try.','am',['am','is','are'],'Với "I" luôn dùng "am": I am. Với he / she dùng "is", với you / we / they dùng "are".'],
  ['___ you afraid of the dark?','Are',['Are','Is','Am'],'Câu hỏi với "you" bắt đầu bằng "Are": Are you afraid? (Con có sợ không?)'],
  ['I will ___ again.','try',['try','tries','trying'],'Sau "will" (sẽ) động từ luôn giữ nguyên: I will try (Con sẽ thử).']],
 orders:[
  ['I can do it','Con làm được!','"can" nghĩa là "có thể". Hãy nói câu này mỗi khi con thấy việc gì đó khó.'],
  ['I am not afraid','Con không sợ.','Thêm "not" sau "am" để nói phủ định: I am not afraid.'],
  ['Let me try','Để con thử.','"Let me ..." nghĩa là "Để con / tớ làm ...". Câu này dùng khi muốn xung phong.']],
 pledge:['I am brave. I can try new things.','Con dũng cảm. Con dám thử những điều mới.']},

{id:'polite', icon:'🙏', place:'Đảo Lễ Phép', title:'Polite', color:'#2F9E6B',
 words:[['please','làm ơn','🙏'],['thank you','cảm ơn','💐'],['excuse me','xin phép','✋'],['hello','xin chào','👋'],['listen','lắng nghe','👂'],['wait','chờ đợi','⏳'],
  ['goodbye','tạm biệt','🚪'],['good morning','chào buổi sáng','🌅']],
 notes:{
  please:'Thêm "please" vào lời nhờ thì lời nói trở nên nhẹ nhàng và lịch sự hơn.',
  'thank you':'Cảm ơn mỗi khi được giúp, dù là việc nhỏ. Người nghe sẽ muốn giúp con nữa.',
  'excuse me':'"Excuse me" dùng khi muốn đi qua, muốn hỏi, hoặc lỡ làm phiền ai đó.',
  hello:'Chào hỏi khi gặp người lớn là phép lịch sự đầu tiên con học được.',
  listen:'Lắng nghe là nhìn vào người đang nói và không ngắt lời.',
  wait:'Chờ đến lượt mình, khi xếp hàng hay khi người khác đang nói, là lễ phép.',
  goodbye:'Chào tạm biệt trước khi về làm mọi người biết con đi và thấy con chu đáo.',
  'good morning':'"Good morning" dùng để chào buổi sáng, trước 12 giờ trưa. Buổi chiều nói "Good afternoon".'},
 situations:[
  ['Bà tặng con một món quà. Con nói:','Thank you, Grandma!',['Give me more!','Bye!'],'"Thank you, Grandma!" nghĩa là "Con cảm ơn bà!". Món quà nào cũng chứa tình thương, nên hãy luôn cảm ơn.'],
  ['Con muốn mượn bút của bạn. Con nói:','Can I use your pen, please?',['Give me your pen!','Pen!'],'"Can I ..., please?" là cách hỏi mượn lịch sự. Hỏi trước khi lấy đồ của bạn nhé.'],
  ['Con muốn đi qua nhưng có người đứng chắn. Con nói:','Excuse me.',['Move!','Hey you!'],'"Excuse me" nghĩa là "Xin lỗi, cho con đi qua ạ". Nói nhẹ nhàng thì ai cũng vui vẻ nhường đường.'],
  ['Bạn nói "Thank you!" với con. Con đáp lại:',"You're welcome.",['Thank you!','What?'],'"You\'re welcome" nghĩa là "Không có gì đâu". Đây là câu đáp lại lịch sự khi ai đó cảm ơn mình.'],
  ['Buổi sáng con gặp cô giáo ở cổng trường. Con nói:','Good morning, teacher!',['Good night!','Hey!'],'"Good morning" là chào buổi sáng. "Good night" chỉ dùng trước khi đi ngủ.'],
  ['Con lỡ va vào một bạn ở hành lang. Con nói:','Sorry! Are you OK?',['Watch out!',"It's your fault!"],'"Sorry! Are you OK?" nghĩa là "Xin lỗi! Bạn có sao không?". Xin lỗi ngay và hỏi han bạn là lễ phép.'],
  ['Bố đang nghe điện thoại. Con muốn hỏi bố. Con nói:','Excuse me, Dad. Can I ask you something?',['Dad! Listen to me now!','Stop talking, Dad!'],'Khi người lớn đang nói chuyện, con đợi một chút rồi nói nhẹ "Excuse me". Không chen ngang hay kéo áo bố nhé.']],
 fills:[
  ['___ you, Dad!','Thank',['Thank','Thanks','Thanking'],'"Thank you" nghĩa là cảm ơn. Không nói "Thanks you". Với bạn bè có thể nói ngắn: "Thanks!".'],
  ['Can I have some water, ___?','please',['please','thank','sorry'],'"please" đặt ở cuối câu nhờ giúp lời nói lịch sự hơn: Can I have some water, please?'],
  ['Good ___, Mom!','morning',['morning','night','bye'],'Buổi sáng chào "Good morning", buổi chiều "Good afternoon", trước khi ngủ "Good night".']],
 orders:[
  ['May I come in','Con xin phép vào được không ạ?','"May I ...?" là cách xin phép rất lễ phép, dùng khi vào phòng cô giáo hay phòng của người khác.'],
  ['Thank you very much','Cảm ơn rất nhiều.','"very much" nghĩa là "rất nhiều", thêm vào để cảm ơn thật lòng hơn.'],
  ['Can I sit here please','Con ngồi đây được không ạ?','Hỏi trước khi ngồi vào chỗ của người khác là lịch sự. "please" có thể đứng cuối câu.']],
 pledge:['I am polite. I say please and thank you.','Con lễ phép. Con luôn nói "làm ơn" và "cảm ơn".']},

{id:'grateful', icon:'🌻', place:'Đảo Biết Ơn', title:'Grateful', color:'#8E5CD9',
 words:[['grateful','biết ơn','🌻'],['thanks','lời cảm ơn','💌'],['family','gia đình','🏠'],['teacher','thầy cô','👩‍🏫'],['food','thức ăn','🍚'],['gift','món quà','🎁']],
 notes:{
  grateful:'Biết ơn là nhớ đến những người đã giúp mình và những điều tốt mình đang có.',
  thanks:'"Thanks" là cách nói ngắn của "Thank you", hay dùng với bạn bè.',
  family:'Gia đình chăm sóc con mỗi ngày. Một cái ôm và lời cảm ơn làm bố mẹ rất vui.',
  teacher:'Thầy cô dạy con biết chữ, biết điều hay. Nhớ chào và cảm ơn thầy cô nhé.',
  food:'Mỗi bát cơm có công của bác nông dân và người nấu. Ăn hết phần mình là biết ơn.',
  gift:'Món quà quý ở tấm lòng người tặng, không phải ở giá tiền.'},
 situations:[
  ['Mẹ nấu cơm cho cả nhà. Ăn xong con nói:','Thank you, Mom. It was yummy!',["It's bad.",'I want pizza.'],'"It was yummy" nghĩa là "Ngon lắm ạ". Cảm ơn người nấu cơm là biết ơn công sức của mẹ.'],
  ['Cuối năm học, con tặng thiệp cho cô giáo. Con nói:','Thank you for teaching me.',["Bye, I'm free!",'Give me a gift.'],'"Thank you for teaching me" nghĩa là "Con cảm ơn cô đã dạy con". Biết ơn thầy cô là truyền thống đẹp.'],
  ['Con nhận được món quà không giống như con muốn. Con nói:',"Thank you! That's very kind.",["I don't like it.",'Where is my real gift?'],'"That\'s very kind" nghĩa là "Bạn thật tốt". Món quà là tấm lòng của người tặng, nên con vẫn cảm ơn thật lòng.'],
  ['Bác bảo vệ mở cổng cho con. Con nói:','Thank you, sir!',['Open it faster!','Bye.'],'"sir" là cách gọi lịch sự với chú, bác (nam). Với cô, bác (nữ) thì nói "ma\'am".'],
  ['Bạn giúp con nhặt sách bị rơi. Con nói:','Thanks for your help!',["Don't touch my books!",'Go away.'],'"Thanks for your help" nghĩa là "Cảm ơn bạn đã giúp mình". Cảm ơn ngay cả việc giúp nhỏ nhé.'],
  ['Trước bữa ăn, con nghĩ đến bác nông dân trồng lúa. Con nói:','Thank you, farmers!',['Rice is boring.','I want more candy.'],'"farmers" là những bác nông dân. Có hạt gạo là nhờ nhiều người chăm chỉ làm việc.'],
  ['Bố đưa con đi học mỗi ngày. Con nói:','Thank you, Dad. I love you.',["You're late, Dad!",'Drive faster!'],'"I love you" nghĩa là "Con yêu bố". Nói lời yêu thương và cảm ơn mỗi ngày làm cả nhà hạnh phúc.']],
 fills:[
  ['Thank you ___ the gift.','for',['for','to','at'],'"Thank you for + điều được nhận": Thank you for the gift (Cảm ơn vì món quà).'],
  ['I am ___ for my family.','grateful',['grateful','great','gray'],'"grateful for" nghĩa là "biết ơn vì": I am grateful for my family.'],
  ['We ___ thank you every day.','say',['say','says','saying'],'Với "we" (chúng con), động từ giữ nguyên: We say. Với he / she mới thêm -s.']],
 orders:[
  ['Thank you for the food','Cảm ơn vì bữa ăn.','"for" đứng trước điều mình biết ơn: Thank you for the food.'],
  ['I love my family','Con yêu gia đình con.','Ai (I) → cảm xúc (love) → ai (my family).'],
  ['You are very kind','Bạn thật tốt bụng.','"very" nghĩa là "rất", đứng trước tính từ: very kind, very good.']],
 pledge:['I am grateful. I say thank you every day.','Con biết ơn. Con nói lời cảm ơn mỗi ngày.']},

{id:'responsible', icon:'🧹', place:'Đảo Trách Nhiệm', title:'Responsible', color:'#1F8F9E',
 words:[['responsible','có trách nhiệm','🧹'],['clean','dọn dẹp','🧽'],['homework','bài tập về nhà','📝'],['on time','đúng giờ','⏰'],['water','tưới nước','💧'],['pet','thú cưng','🐕']],
 notes:{
  responsible:'Có trách nhiệm là tự làm tốt việc của mình mà không cần ai nhắc nhiều lần.',
  clean:'Tự dọn đồ chơi, tự xếp giày dép là cách con giúp cả nhà gọn gàng.',
  homework:'Làm bài tập trước, chơi sau. Xong việc rồi chơi sẽ vui hơn nhiều.',
  'on time':'Đúng giờ là tôn trọng người đang chờ mình, như cô giáo và các bạn.',
  water:'"water" vừa là nước, vừa là tưới nước. Cây cần con tưới mỗi ngày mới lớn được.',
  pet:'Nuôi thú cưng là nhận trách nhiệm cho nó ăn, uống và chơi với nó mỗi ngày.'},
 situations:[
  ['Con chơi đồ chơi xong. Con nói:','I will put my toys away.',['Mom will clean it.','Leave them on the floor.'],'"put away" nghĩa là "cất đi". Chơi xong tự cất đồ chơi là có trách nhiệm.'],
  ['Đến giờ làm bài tập nhưng con muốn xem TV. Con nói:','Homework first, then TV.',['TV first, homework later!','No homework today.'],'"first ... then ..." nghĩa là "trước ... rồi ...". Làm xong việc chính rồi mới chơi.'],
  ['Con được giao cho cá ăn mỗi ngày. Sáng nay con nói:','I will feed my fish now.',['The fish can wait.','I forgot. Never mind.'],'"feed" nghĩa là "cho ăn". Con cá cần con nhớ đến nó mỗi ngày.'],
  ['Con lỡ làm đổ nước ra sàn. Con nói:','I will clean it up.',["It's not me.",'Someone else can clean it.'],'"clean it up" nghĩa là "lau dọn sạch". Tự sửa điều mình lỡ làm là có trách nhiệm.'],
  ['Sáng mai đi học sớm. Tối nay con nói:','I will pack my bag now.',['Mom will pack it.','I will do it tomorrow.'],'"pack my bag" nghĩa là "soạn cặp". Chuẩn bị từ tối giúp sáng mai không bị vội.'],
  ['Con mượn sách của bạn. Hôm nay đến hạn trả. Con nói:','Here is your book. Thank you!',['I will keep it.','I lost it. So what?'],'"Here is your book" nghĩa là "Sách của bạn đây". Trả đồ đúng hẹn và giữ gìn cẩn thận là có trách nhiệm.']],
 fills:[
  ['I ___ my room every day.','clean',['clean','cleans','cleaning'],'Với "I", động từ giữ nguyên: I clean my room (Con dọn phòng).'],
  ['He ___ his homework.','does',['do','does','doing'],'Với "he", "do" đổi thành "does": He does his homework.'],
  ['I am never ___ for school.','late',['late','later','lately'],'"late for school" nghĩa là "muộn học". "never late" là không bao giờ muộn.']],
 orders:[
  ['I do my homework','Con làm bài tập.','Tiếng Anh nói "do homework" (không nói "make homework").'],
  ['I water the plants','Con tưới cây.','"water" ở đây là động từ "tưới nước", "the plants" là những cái cây.'],
  ['I go to bed on time','Con đi ngủ đúng giờ.','"go to bed" là đi ngủ, "on time" là đúng giờ. Ngủ đủ giấc giúp con khoẻ và học tốt.']],
 pledge:['I am responsible. I do my jobs.','Con có trách nhiệm. Con tự làm tốt việc của mình.']},

{id:'persevere', icon:'🐢', place:'Đảo Kiên Trì', title:'Never give up', color:'#4A7BE0',
 words:[['practice','luyện tập','🎹'],['again','lần nữa','🔁'],['slowly','chậm rãi','🐢'],['step','bước','👣'],['finish','hoàn thành','🏁'],['hard','khó','🧗'],
  ['goal','mục tiêu','🎯'],['learn','học','📚']],
 notes:{
  practice:'Không ai giỏi ngay từ đầu. Luyện tập mỗi ngày một chút là bí quyết của mọi người giỏi.',
  again:'"Try again" nghĩa là "thử lại". Mỗi lần thử lại, con giỏi hơn lần trước một chút.',
  slowly:'Rùa đi chậm nhưng không dừng lại, nên vẫn về đích. Chậm mà chắc cũng rất tốt.',
  step:'Việc lớn chia thành từng bước nhỏ thì sẽ dễ hơn. "Step by step" nghĩa là "từng bước một".',
  finish:'Làm đến cùng, không bỏ dở giữa chừng, là kiên trì.',
  hard:'Thấy khó là lúc não đang lớn lên. Khó không có nghĩa là không làm được.',
  goal:'Mục tiêu là điều con muốn đạt được, như đọc được một cuốn truyện tiếng Anh.',
  learn:'Học là cả một hành trình dài. Mỗi ngày học một chút, con sẽ đi rất xa.'},
 situations:[
  ['Con tập đi xe đạp và bị ngã. Con nói:','I will try again!',['I give up.','Bikes are bad.'],'"I will try again!" nghĩa là "Con sẽ thử lại!". Ai mới học xe đạp cũng ngã. Người biết đi xe là người đã đứng dậy nhiều lần.'],
  ['Bài toán khó quá. Con nói:','Let me think again.',["It's too hard. Stop!",'I hate math.'],'"Let me think again" nghĩa là "Để con nghĩ lại". Hít thở sâu, đọc lại đề, thử thêm một cách nữa.'],
  ['Bạn con đang tập đàn mà chưa hay. Con nói:','Keep going! You can do it!',["That's bad.",'Stop playing.'],'"Keep going!" nghĩa là "Cố lên, tiếp tục nào!". Cổ vũ bạn kiên trì cũng là một cách tốt bụng.'],
  ['Con xếp tháp lego thật cao thì bị đổ. Con nói:',"Let's build it again!",['Lego is boring.','I quit.'],'"build it again" nghĩa là "xây lại". Lần sau con sẽ biết cách xếp cho chắc hơn.'],
  ['Con chưa thuộc bài hát tiếng Anh. Con nói:','I will practice every day.',['I can never learn it.','Songs are bad.'],'"practice every day" nghĩa là "luyện tập mỗi ngày". Hát mỗi ngày một lần, chẳng mấy chốc con sẽ thuộc.'],
  ['Chạy thi ở trường, con về cuối. Con nói:','I tried my best!',['I am the worst.','I will never run again.'],'"I tried my best" nghĩa là "Con đã cố gắng hết sức". Cố gắng hết sức mới là điều quan trọng nhất.'],
  ['Bạn con muốn bỏ dở bức tranh vì khó. Con nói:',"Don't give up! Try again.",['Yes, stop it.','Your picture is ugly.'],'"Don\'t give up!" nghĩa là "Đừng bỏ cuộc!". Một lời động viên có thể giúp bạn vẽ xong bức tranh.']],
 fills:[
  ['I practice English ___ day.','every',['every','all','many'],'"every day" nghĩa là "mỗi ngày". Học mỗi ngày 10 phút tốt hơn học một lần thật lâu rồi bỏ.'],
  ['Practice makes ___.','perfect',['perfect','bad','slow'],'"Practice makes perfect" giống câu "Có công mài sắt, có ngày nên kim": luyện tập nhiều thì sẽ giỏi.'],
  ['She ___ hard every day.','works',['work','works','working'],'Với "she", động từ thêm -s: She works hard (Bạn ấy chăm chỉ mỗi ngày).']],
 orders:[
  ['Never give up','Đừng bao giờ bỏ cuộc!','"give up" nghĩa là "bỏ cuộc", thêm "never" (không bao giờ) ở đầu thành lời nhắc nhở mình.'],
  ['Step by step','Từng bước một.','Làm từng bước nhỏ, bước nào chắc bước đó, rồi con sẽ tới đích.'],
  ['I can learn it','Con học được mà.','Sau "can" động từ giữ nguyên: I can learn. Hãy tự nói câu này khi gặp bài khó.']],
 pledge:['I never give up. I try again and again.','Con không bao giờ bỏ cuộc. Con thử lại nhiều lần.']},
];

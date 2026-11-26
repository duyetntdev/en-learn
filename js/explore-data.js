/* ================== NỘI DUNG TRÒ CHƠI "NHÀ THÁM HIỂM THIÊN TÀI" ==================
   6 chuyến thám hiểm, mỗi chuyến là một vùng đất. Sửa / thêm chuyến ở file này, rồi tạo mp3 còn thiếu:
     tools/.venv/bin/python tools/generate_audio.py
   Mỗi lượt chơi 8 câu: 3 từ vựng + 3 câu kiến thức + 1 câu tìm quy luật hoặc đếm + 1 câu tìm vật khác loại,
   ưu tiên câu bé chưa gặp.
   words:   [tiếng Anh, nghĩa, emoji] – từ cụ thể, nhìn hình đoán được; nên có ít nhất 8 từ
   facts:   [câu hỏi tiếng Anh, nghĩa, đáp án, [2 đáp án sai], emoji của thẻ khám phá, điều thú vị]
            – trả lời đúng thì bé nhận "thẻ khám phá" (cất trong Sổ tay nhà thám hiểm)
   pattern: [[dãy emoji...], đáp án, [2 emoji sai]] – "What comes next?"
   odd:     [câu hỏi tiếng Anh, nghĩa, [đáp án, emoji], [[từ, emoji] x3], giải thích]
   Khi thêm chuyến mới: đặt `id` mới chỉ gồm chữ thường a–z (tiến độ của bé lưu theo id). */
const EXPEDITIONS = [
{id:'jungle', icon:'🌴', name:'Jungle', vi:'Rừng rậm', color:'#2E9E5B', bg:['#D8F5DF','#A8E3B6'],
 words:[['monkey','con khỉ','🐒'],['parrot','con vẹt','🦜'],['snake','con rắn','🐍'],['tiger','con hổ','🐅'],['frog','con ếch','🐸'],['butterfly','con bướm','🦋'],['tree','cái cây','🌳'],['banana','quả chuối','🍌'],['gorilla','khỉ đột','🦍'],['leaf','chiếc lá','🍃']],
 facts:[
  ['Which animal can talk like people?','Con vật nào bắt chước được tiếng người?','a parrot',['a frog','a snake'],'🦜','Vẹt bắt chước được tiếng người và nhiều âm thanh khác. Có chú vẹt nhớ được hơn 100 từ!'],
  ['Which animal is very, very slow?','Con vật nào rất, rất chậm?','a sloth',['a tiger','a monkey'],'🦥','Con lười chậm đến mức rêu xanh mọc được trên lông của nó. Nó ngủ tới 15 giờ mỗi ngày!'],
  ['What does a caterpillar become?','Sâu bướm sẽ biến thành gì?','a butterfly',['a frog','a bird'],'🦋','Sâu bướm cuộn mình trong kén một thời gian rồi hoá thành bướm xinh đẹp.'],
  ['What color is a tiger?','Con hổ màu gì?','orange and black',['blue and green','pink and white'],'🐅','Không có hai con hổ nào có vằn giống hệt nhau, giống như vân tay của người vậy.'],
  ['What do gorillas eat?','Khỉ đột ăn gì?','leaves and fruit',['fish','rocks'],'🦍','Khỉ đột trông rất to và khoẻ nhưng chủ yếu ăn lá cây và trái cây.'],
  ['Where do frogs lay their eggs?','Ếch đẻ trứng ở đâu?','in the water',['in a tree','in the sand'],'🐸','Trứng ếch nở thành nòng nọc sống dưới nước, lớn lên mới mọc chân và lên bờ.']],
 pattern:[['🐒','🍌','🐒','🍌','🐒'],'🍌',['🐒','🐍']],
 odd:['Which one does NOT live in the jungle?','Con nào KHÔNG sống trong rừng rậm?',['penguin','🐧'],[['monkey','🐒'],['parrot','🦜'],['tiger','🐅']],'Chim cánh cụt sống ở nơi rất lạnh như Nam Cực, không sống trong rừng nhiệt đới nóng ẩm.']},

{id:'ocean', icon:'🌊', name:'Ocean', vi:'Đại dương', color:'#1F7FD1', bg:['#D6ECFF','#9CCEF5'],
 words:[['fish','con cá','🐟'],['shark','cá mập','🦈'],['whale','cá voi','🐋'],['octopus','bạch tuộc','🐙'],['crab','con cua','🦀'],['dolphin','cá heo','🐬'],['turtle','con rùa','🐢'],['shell','vỏ sò','🐚'],['squid','con mực','🦑'],['island','hòn đảo','🏝️']],
 facts:[
  ['Which animal has eight arms?','Con vật nào có tám cái tay?','an octopus',['a crab','a fish'],'🐙','Bạch tuộc có 8 xúc tu và có tới 3 quả tim!'],
  ['What is the biggest animal in the world?','Con vật nào lớn nhất thế giới?','the blue whale',['the shark','the elephant'],'🐋','Cá voi xanh dài bằng khoảng 3 chiếc xe buýt, là con vật lớn nhất từng sống trên Trái Đất.'],
  ['How do crabs walk?','Cua đi như thế nào?','sideways',['on two legs','upside down'],'🦀','Cua thường đi ngang vì các khớp chân của nó gập sang hai bên.'],
  ['Is sea water salty or sweet?','Nước biển mặn hay ngọt?','salty',['sweet','spicy'],'🧂','Nước biển mặn vì muối từ đất đá theo sông chảy ra biển suốt hàng triệu năm.'],
  ['Which sea animal is very smart?','Con vật biển nào rất thông minh?','a dolphin',['a crab','a shell'],'🐬','Cá heo gọi nhau bằng những tiếng huýt sáo riêng, giống như gọi tên nhau vậy.'],
  ['How do fish breathe in the water?','Cá thở dưới nước bằng gì?','with gills',['with a nose','with a straw'],'🐟','Cá thở bằng mang. Mang lấy không khí có sẵn trong nước để cá thở.']],
 pattern:[['🐟','🐟','🐙','🐟','🐟'],'🐙',['🐟','🦀']],
 odd:['Which one does NOT live in the ocean?','Con nào KHÔNG sống ở đại dương?',['camel','🐫'],[['shark','🦈'],['whale','🐋'],['crab','🦀']],'Lạc đà sống ở sa mạc khô nóng, còn cá mập, cá voi và cua sống ở biển.']},

{id:'desert', icon:'🏜️', name:'Desert', vi:'Sa mạc', color:'#D9902B', bg:['#FFF1D6','#F7D49B'],
 words:[['camel','lạc đà','🐫'],['cactus','cây xương rồng','🌵'],['sun','mặt trời','☀️'],['sand','cát','🏜️'],['scorpion','bọ cạp','🦂'],['lizard','thằn lằn','🦎'],['water','nước','💧'],['palm tree','cây cọ','🌴'],['fox','con cáo','🦊'],['hat','cái mũ','👒']],
 facts:[
  ['Which animal can walk for days without water?','Con vật nào đi được nhiều ngày không cần uống nước?','a camel',['a fish','a frog'],'🐫','Lạc đà đi được nhiều ngày không uống nước. Bướu của nó chứa mỡ, không phải chứa nước!'],
  ['Where does a cactus keep water?','Cây xương rồng giữ nước ở đâu?','inside its stem',['in the sky','in its flowers'],'🌵','Xương rồng giữ nước trong thân. Gai nhọn giúp nó không bị mất nước và không bị con vật ăn.'],
  ['Is the desert cold at night?','Ban đêm sa mạc có lạnh không?','yes, very cold',['no, very hot','there is no night'],'🌙','Sa mạc ban ngày rất nóng nhưng ban đêm có thể lạnh cóng, vì cát không giữ được hơi ấm.'],
  ['What do explorers need most in the desert?','Nhà thám hiểm cần gì nhất ở sa mạc?','water',['ice cream','a snowman'],'💧','Ở sa mạc, nước là thứ quý nhất. Nhà thám hiểm luôn mang đủ nước và đội mũ che nắng.'],
  ['Which desert animal has very big ears?','Con vật sa mạc nào có đôi tai rất to?','the fennec fox',['the penguin','the whale'],'🦊','Cáo Fennec có đôi tai rất to giúp toả bớt hơi nóng và nghe được tiếng côn trùng dưới cát.'],
  ['What do we call a green place with water in the desert?','Nơi có nước và cây xanh giữa sa mạc gọi là gì?','an oasis',['a snowfield','a volcano'],'🌴','Ốc đảo là nơi có nước ngầm giữa sa mạc nên cây cọ mọc xanh tốt, người và lạc đà dừng chân nghỉ.']],
 pattern:[['🌵','☀️','☀️','🌵','☀️'],'☀️',['🌵','🐫']],
 odd:['Which one is NOT hot?','Cái nào KHÔNG nóng?',['ice','🧊'],[['sun','☀️'],['fire','🔥'],['sand','🏜️']],'Đá lạnh thì lạnh. Mặt trời, lửa và cát sa mạc buổi trưa đều rất nóng.']},

{id:'polar', icon:'❄️', name:'Polar Land', vi:'Vùng băng giá', color:'#3C8FC4', bg:['#EAF6FF','#BFE3F7'],
 words:[['penguin','chim cánh cụt','🐧'],['polar bear','gấu Bắc Cực','🐻‍❄️'],['seal','hải cẩu','🦭'],['snow','tuyết','❄️'],['ice','băng đá','🧊'],['snowman','người tuyết','⛄'],['cold','lạnh','🥶'],['scarf','khăn quàng','🧣'],['gloves','găng tay','🧤'],['sled','xe trượt tuyết','🛷']],
 facts:[
  ['Can penguins fly?','Chim cánh cụt có bay được không?','No, they cannot fly.',['Yes, very high.','Only at night.'],'🐧','Chim cánh cụt không bay được nhưng bơi rất giỏi, trông như đang bay dưới nước.'],
  ['What color is a polar bear?','Gấu Bắc Cực màu gì?','white',['black','pink'],'🐻‍❄️','Lông gấu Bắc Cực trông màu trắng, nhưng da bên dưới lại màu đen để hút hơi ấm của nắng.'],
  ['What do penguins eat?','Chim cánh cụt ăn gì?','fish',['bananas','grass'],'🐟','Chim cánh cụt lặn xuống nước lạnh để bắt cá, mực và tôm nhỏ.'],
  ['What is snow made of?','Tuyết được làm từ gì?','frozen water',['sugar','cotton'],'❄️','Bông tuyết là nước đóng băng. Không có hai bông tuyết nào giống hệt nhau!'],
  ['What do you wear when it is very cold?','Khi trời rất lạnh, con mặc gì?','a scarf and gloves',['a swimsuit','sandals'],'🧣','Khăn quàng, găng tay và mũ len giữ hơi ấm cho cơ thể, nhất là đầu và tay.'],
  ['Where do penguins live?','Chim cánh cụt sống ở đâu?','in the Antarctic',['in the jungle','in the desert'],'🧊','Hầu hết chim cánh cụt sống ở Nam Cực, nơi lạnh nhất Trái Đất. Gấu Bắc Cực thì sống ở Bắc Cực.']],
 pattern:[['❄️','⛄','❄️','⛄','❄️'],'⛄',['❄️','🧣']],
 odd:['Which one does NOT live in the cold?','Con nào KHÔNG sống ở nơi lạnh giá?',['camel','🐫'],[['penguin','🐧'],['seal','🦭'],['polar bear','🐻‍❄️']],'Lạc đà sống ở sa mạc nóng. Chim cánh cụt, hải cẩu và gấu Bắc Cực có lớp mỡ dày để sống nơi băng giá.']},

{id:'space', icon:'🚀', name:'Space', vi:'Vũ trụ', color:'#5B4FD6', bg:['#E7E4FF','#BDB5F5'],
 words:[['sun','mặt trời','☀️'],['moon','mặt trăng','🌙'],['star','ngôi sao','⭐'],['planet','hành tinh','🪐'],['Earth','Trái Đất','🌍'],['rocket','tên lửa','🚀'],['astronaut','phi hành gia','👩‍🚀'],['comet','sao chổi','☄️'],['telescope','kính thiên văn','🔭'],['alien','người ngoài hành tinh','👽']],
 facts:[
  ['Which planet do we live on?','Chúng ta sống trên hành tinh nào?','Earth',['Mars','the Moon'],'🌍','Trái Đất là hành tinh duy nhất có sự sống mà con người biết đến cho tới nay.'],
  ['Is the Sun a star?','Mặt Trời có phải là một ngôi sao không?','Yes, it is a star.',['No, it is a planet.','No, it is the Moon.'],'☀️','Mặt Trời là một ngôi sao. Nó ở gần chúng ta nhất nên trông to và sáng hơn mọi ngôi sao khác.'],
  ['Who flies into space in a rocket?','Ai bay vào vũ trụ bằng tên lửa?','an astronaut',['a farmer','a fish'],'👩‍🚀','Phi hành gia phải tập luyện nhiều năm mới được bay vào vũ trụ. Trên đó mọi thứ đều lơ lửng!'],
  ['Which planet has big rings?','Hành tinh nào có những vành đai lớn?','Saturn',['Earth','the Sun'],'🪐','Sao Thổ có những vành đai rất lớn làm từ băng và đá.'],
  ['Does the Moon make its own light?','Mặt Trăng có tự phát sáng không?','No, it reflects the Sun.',['Yes, like a lamp.','Yes, it is on fire.'],'🌙','Mặt Trăng không tự phát sáng. Nó phản chiếu ánh sáng của Mặt Trời, giống như một tấm gương.'],
  ['What do we use to look at stars?','Chúng ta dùng gì để ngắm sao?','a telescope',['a spoon','a hat'],'🔭','Kính thiên văn giúp nhìn thấy những ngôi sao và hành tinh ở rất xa.']],
 pattern:[['🌙','⭐','⭐','🌙','⭐'],'⭐',['🌙','🚀']],
 odd:['Which one is NOT in space?','Cái nào KHÔNG ở trong vũ trụ?',['tree','🌳'],[['moon','🌙'],['star','⭐'],['planet','🪐']],'Cây mọc trên mặt đất của Trái Đất. Mặt Trăng, ngôi sao và hành tinh đều ở ngoài vũ trụ.']},

{id:'volcano', icon:'🌋', name:'Volcano Island', vi:'Đảo núi lửa', color:'#D9483B', bg:['#FFE4DE','#F7B3A5'],
 words:[['volcano','núi lửa','🌋'],['fire','lửa','🔥'],['rock','hòn đá','🪨'],['mountain','ngọn núi','⛰️'],['smoke','khói','💨'],['dinosaur','khủng long','🦖'],['map','bản đồ','🗺️'],['compass','la bàn','🧭'],['helmet','mũ bảo hộ','⛑️'],['backpack','ba lô','🎒']],
 facts:[
  ['What comes out of a volcano?','Cái gì phun ra từ núi lửa?','hot lava',['ice cream','cold water'],'🌋','Dung nham là đá nóng chảy, nóng hơn 1000 độ C!'],
  ['What helps explorers find the way?','Cái gì giúp nhà thám hiểm tìm đường?','a compass',['a spoon','a ball'],'🧭','Kim la bàn luôn chỉ về hướng Bắc, nhờ vậy nhà thám hiểm không bị lạc.'],
  ['Which animal lived a long, long time ago?','Con vật nào sống từ rất, rất lâu rồi?','the dinosaur',['the cat','the dog'],'🦖','Khủng long sống cách đây hơn 65 triệu năm. Chúng ta biết về chúng nhờ hoá thạch.'],
  ['What should an explorer wear to stay safe?','Nhà thám hiểm nên đội gì để an toàn?','a helmet',['a crown','pajamas'],'⛑️','Mũ bảo hộ che đầu khỏi đá rơi. An toàn luôn là điều đầu tiên của nhà thám hiểm.'],
  ['What grows well near volcanoes?','Cái gì mọc tốt gần núi lửa?','plants',['ice','cars'],'🌱','Đất gần núi lửa có nhiều chất tốt, nên cây cối và lúa mọc rất xanh tốt.'],
  ['What do we call a rock with an old animal shape inside?','Hòn đá có in hình con vật thời xưa gọi là gì?','a fossil',['a cookie','a coin'],'🦴','Hoá thạch là dấu vết của con vật hoặc cây cối từ hàng triệu năm trước, còn in lại trong đá.']],
 pattern:[['🔥','🪨','🔥','🪨','🔥'],'🪨',['🔥','🦖']],
 odd:['Which one is NOT an explorer tool?','Cái nào KHÔNG phải đồ dùng của nhà thám hiểm?',['cake','🍰'],[['map','🗺️'],['compass','🧭'],['backpack','🎒']],'Bản đồ, la bàn và ba lô là đồ dùng của nhà thám hiểm. Bánh kem thì để ăn mừng khi về nhà!']},
];

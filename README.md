# Bé Vui Học Tiếng Anh (en-learn)

Website học tiếng Anh cho trẻ em: từ vựng có hình, hội thoại, ngữ pháp, luyện tập và bài kiểm tra.
Bé phải qua bài kiểm tra (đúng ≥ 12/15 câu) mới mở được bài tiếp theo.
Qua Cấp 1 của một bài sẽ mở thêm **Cấp 2** cùng chủ đề với nội dung mới. Mỗi lần làm lại bài kiểm tra,
ứng dụng ưu tiên những câu bé chưa gặp (ghi nhớ trong trình duyệt).

Đây là **website tĩnh**: chỉ gồm HTML/CSS/JS và file mp3, không cần database hay backend.
Tiến độ học được lưu trong trình duyệt của bé (localStorage).

## Cấu trúc thư mục

```
en-learn/
├── index.html            Trang chính
├── css/style.css         Giao diện
├── js/lessons.js         ⭐ NỘI DUNG BÀI HỌC (Cấp 1) – sửa/thêm bài ở đây
├── js/lessons2.js        ⭐ Cấp 2 của từng bài (mở khi qua Cấp 1)
├── js/app.js             Logic: khoá/mở bài, luyện tập, kiểm tra, phát âm
├── js/fx.js              Hiệu ứng vui: pháo hoa, chùm sao, chuỗi câu đúng
├── audio/*.mp3           684 file phát âm (tên file = câu viết thường, nối bằng dấu -)
├── images/               Ảnh minh hoạ (tuỳ chọn, mặc định dùng emoji)
├── tools/                Công cụ tạo file âm thanh (không deploy)
├── Dockerfile, nginx.conf, docker-compose.yml
└── README.md
```

## Chạy thử trên máy

```bash
cd en-learn
python3 -m http.server 8000
# mở http://localhost:8000
```

## Deploy lên server

### Cách 1 – Docker (khuyên dùng)

```bash
# chép thư mục lên server, ví dụ:
scp -r en-learn user@your-server:/opt/
ssh user@your-server
cd /opt/en-learn
docker compose up -d --build
# website chạy ở http://your-server:8080
```

Đổi cổng trong `docker-compose.yml` (`"8080:80"` → `"80:80"`) nếu muốn chạy thẳng cổng 80.

### Cách 2 – Nginx có sẵn trên server

```bash
sudo mkdir -p /var/www/en-learn
sudo cp -r index.html css js audio images /var/www/en-learn/
```

Tạo `/etc/nginx/sites-available/en-learn` (dựa theo `nginx.conf`, đổi `root` thành `/var/www/en-learn`
và `server_name` thành tên miền của bạn), sau đó:

```bash
sudo ln -s /etc/nginx/sites-available/en-learn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Cài HTTPS miễn phí: `sudo certbot --nginx -d ten-mien-cua-ban.com`

### Cách 3 – Hosting tĩnh miễn phí

Kéo thả các file `index.html`, `css/`, `js/`, `audio/`, `images/` lên **Netlify**, **Vercel**,
**Cloudflare Pages** hoặc **GitHub Pages**. Không cần cấu hình thêm.

## Thêm hoặc sửa bài học

1. Mở `js/lessons.js`, sao chép một bài có sẵn rồi sửa nội dung:
   - `words`: `['dog','con chó','🐶']` – thêm phần tử thứ 4 `'images/dog.png'` nếu muốn dùng ảnh thật.
   - `dialog`: `['Tên','Câu tiếng Anh','Nghĩa tiếng Việt']`. Tên phải có trong `people`.
   - `grammar`: tiêu đề, các ý chính, ví dụ, mẹo.
   - `fill`: câu điền từ `['It ___ a cat.','is',['is','am','are']]` (đáp án đúng phải nằm trong danh sách).
   - `order`: câu để bé sắp xếp (không cần dấu câu).
   - `dq`: câu hỏi về hội thoại.
2. Tạo file âm thanh cho các câu mới:
   ```bash
   pip install -r tools/requirements.txt   # chỉ cần lần đầu (cần thêm Node.js và ffmpeg)
   python3 tools/generate_audio.py
   ```
   Script chỉ tạo các file còn thiếu. Lần đầu chạy, script tự tải mô hình giọng đọc Kokoro (~120 MB).
   Câu nào thiếu file mp3 thì website sẽ dùng giọng đọc của trình duyệt.
3. Deploy lại (với Docker: `docker compose up -d --build`).

Nhân vật nam (`Nam`, `Tom`, `Bin`) dùng giọng nam. Muốn thêm nhân vật nam khác, sửa danh sách `BOYS`
trong `tools/list-texts.js`.

## Thay đổi cài đặt

Trong `js/app.js`:
- `PASS = 12` – số câu cần đúng để qua bài
- `TEST_N = 15` – số câu trong bài kiểm tra

#!/usr/bin/env python3
"""Máy chủ lưu tiến độ học cho Bé Vui Học Tiếng Anh.

Chỉ dùng thư viện có sẵn của Python (không cần pip). Dữ liệu lưu trong SQLite.

API (JSON):
  GET  /api/users/<tên>            → 200 {name, progress, seen, updated} | 404
  POST /api/users        {name}    → 201 tạo hồ sơ mới | 409 tên đã có | 400 tên không hợp lệ
  PUT  /api/users/<tên>  {progress, seen, replace?}
                                   → 200 dữ liệu sau khi gộp (lấy số sao / số lần gặp lớn nhất,
                                     để hai thiết bị không ghi đè mất tiến độ của nhau);
                                     replace=true thì thay hẳn (dùng cho nút "Xoá tiến độ")

Tên: chỉ chữ không dấu và số, 3–20 ký tự, không phân biệt hoa thường.

Chạy thử trên máy (phục vụ luôn cả trang web):
  python3 server/app.py --port 8000 --static .
Trên server: nginx phục vụ trang tĩnh và chuyển /api/ tới máy chủ này (xem deploy/).
"""
import argparse, json, os, re, sqlite3, threading, time
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlparse

NAME_RE = re.compile(r'^[A-Za-z0-9]{3,20}$')
PROGRESS_KEY_RE = re.compile(r'^\d{1,3}(-\d{1,2})?$')      # "0", "11", "3-2" ...
SEEN_KEY_MAX, SEEN_MAX = 200, 20000
MAX_BODY = 512 * 1024

db_lock = threading.Lock()
db = None


def open_db(path):
    global db
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    db = sqlite3.connect(path, check_same_thread=False)
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        key TEXT PRIMARY KEY,          -- tên viết thường, dùng để tra cứu (unique)
        name TEXT NOT NULL,            -- tên như bé nhập lần đầu
        progress TEXT NOT NULL DEFAULT '{}',
        seen TEXT NOT NULL DEFAULT '{}',
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL)''')
    db.commit()


def clean_progress(p):
    """Chỉ giữ khoá hợp lệ và số sao 0–3."""
    out = {}
    if isinstance(p, dict):
        for k, v in p.items():
            if isinstance(k, str) and PROGRESS_KEY_RE.match(k) and isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 3:
                out[k] = v
    return out


def clean_seen(s):
    out = {}
    if isinstance(s, dict):
        for k, v in s.items():
            if len(out) >= SEEN_MAX:
                break
            if isinstance(k, str) and 0 < len(k) <= SEEN_KEY_MAX and isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 10000:
                out[k] = v
    return out


def merge_max(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = max(out.get(k, 0), v)
    return out


def row_json(row):
    return {'name': row[1], 'progress': json.loads(row[2]), 'seen': json.loads(row[3]), 'updated': row[5]}


class Handler(SimpleHTTPRequestHandler):
    server_version = 'en-learn'
    static_dir = None

    def log_message(self, fmt, *args):            # log gọn, không ghi nội dung
        print('%s %s' % (self.command, self.path.split('?')[0]), flush=True)

    # ---------- tiện ích ----------
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def error(self, status, msg):
        self.send_json(status, {'error': msg})

    def read_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > MAX_BODY:
            raise ValueError('Dữ liệu quá lớn')
        try:
            data = json.loads(self.rfile.read(n) or b'{}')
        except Exception:
            raise ValueError('JSON không hợp lệ')
        if not isinstance(data, dict):
            raise ValueError('JSON không hợp lệ')
        return data

    def user_name(self):
        """Lấy tên từ /api/users/<tên>; None nếu đường dẫn không khớp."""
        parts = urlparse(self.path).path.split('/')
        if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'users':
            return unquote(parts[3])
        return None

    def is_api(self):
        return urlparse(self.path).path.startswith('/api/')

    # ---------- định tuyến ----------
    def do_GET(self):
        if not self.is_api():
            return self.static_or_404()
        name = self.user_name()
        if name is None:
            return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')
        if not NAME_RE.match(name):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên không hợp lệ')
        with db_lock:
            row = db.execute('SELECT * FROM users WHERE key=?', (name.lower(),)).fetchone()
        if not row:
            return self.error(HTTPStatus.NOT_FOUND, 'Chưa có tên này')
        self.send_json(HTTPStatus.OK, row_json(row))

    def do_HEAD(self):
        if self.is_api():
            return self.error(HTTPStatus.METHOD_NOT_ALLOWED, 'Không hỗ trợ')
        return self.static_or_404(head=True)

    def do_POST(self):
        if urlparse(self.path).path != '/api/users':
            return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')
        try:
            data = self.read_json()
        except ValueError as e:
            return self.error(HTTPStatus.BAD_REQUEST, str(e))
        name = data.get('name')
        if not isinstance(name, str) or not NAME_RE.match(name):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên chỉ gồm chữ không dấu và số, dài 3–20 ký tự')
        progress, seen, now = clean_progress(data.get('progress')), clean_seen(data.get('seen')), int(time.time())
        with db_lock:
            try:
                db.execute('INSERT INTO users(key,name,progress,seen,created,updated) VALUES(?,?,?,?,?,?)',
                           (name.lower(), name, json.dumps(progress), json.dumps(seen), now, now))
                db.commit()
            except sqlite3.IntegrityError:
                return self.error(HTTPStatus.CONFLICT, 'Tên này đã có người dùng')
            row = db.execute('SELECT * FROM users WHERE key=?', (name.lower(),)).fetchone()
        self.send_json(HTTPStatus.CREATED, row_json(row))

    def do_PUT(self):
        name = self.user_name()
        if name is None:
            return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')
        if not NAME_RE.match(name):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên không hợp lệ')
        try:
            data = self.read_json()
        except ValueError as e:
            return self.error(HTTPStatus.BAD_REQUEST, str(e))
        progress, seen = clean_progress(data.get('progress')), clean_seen(data.get('seen'))
        with db_lock:
            row = db.execute('SELECT * FROM users WHERE key=?', (name.lower(),)).fetchone()
            if not row:
                return self.error(HTTPStatus.NOT_FOUND, 'Chưa có tên này')
            if data.get('replace') is True:
                new_p, new_s = progress, seen
            else:
                new_p = merge_max(json.loads(row[2]), progress)
                new_s = clean_seen(merge_max(json.loads(row[3]), seen))
            db.execute('UPDATE users SET progress=?, seen=?, updated=? WHERE key=?',
                       (json.dumps(new_p), json.dumps(new_s), int(time.time()), name.lower()))
            db.commit()
            row = db.execute('SELECT * FROM users WHERE key=?', (name.lower(),)).fetchone()
        self.send_json(HTTPStatus.OK, row_json(row))

    def do_DELETE(self):
        return self.error(HTTPStatus.METHOD_NOT_ALLOWED, 'Không hỗ trợ')

    # ---------- trang tĩnh (chỉ dùng khi chạy thử trên máy) ----------
    def static_or_404(self, head=False):
        if not self.static_dir:
            return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')
        return super().do_HEAD() if head else super().do_GET()

    def translate_path(self, path):
        p = urlparse(path).path
        if p.startswith('/tools/') or p.startswith('/server/') or '/.' in p:
            return '/nonexistent'
        full = os.path.realpath(os.path.join(self.static_dir, unquote(p).lstrip('/')))
        if full != self.static_dir and not full.startswith(self.static_dir + os.sep):   # chặn ../
            return '/nonexistent'
        return full


def main():
    ap = argparse.ArgumentParser(description='Máy chủ lưu tiến độ học')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=8090)
    ap.add_argument('--db', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'en-learn.db'))
    ap.add_argument('--static', help='thư mục trang web (chỉ khi chạy thử trên máy)')
    a = ap.parse_args()
    open_db(a.db)
    Handler.static_dir = os.path.abspath(a.static) if a.static else None
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print(f'Đang chạy ở http://{a.host}:{a.port}  (db: {a.db})', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()

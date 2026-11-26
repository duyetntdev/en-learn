#!/usr/bin/env python3
"""Máy chủ lưu tiến độ học cho Bé Vui Học Tiếng Anh.

Chỉ dùng thư viện có sẵn của Python (không cần pip). Dữ liệu lưu trong SQLite.
Mỗi hồ sơ có tên (duy nhất) và mã PIN 4 số. Mã PIN chỉ lưu dạng băm (PBKDF2 + muối).
Đăng nhập đúng thì nhận "vé" (token) – trình duyệt dùng vé này để đọc / ghi tiến độ,
không cần giữ mã PIN.

API (JSON):
  GET  /api/users/<tên>                 → 200 {name, hasPin} | 404       (chỉ cho biết tên đã có chưa)
  POST /api/users   {name, pin, progress?, seen?}
                                        → 201 {name, token, progress, seen} | 409 tên đã có | 400
  POST /api/login   {name, pin}         → 200 {name, token, progress, seen} | 401 sai PIN | 423 đang khoá | 404
  POST /api/users/<tên>/pin {pin}       → 200 như /api/login – đặt PIN cho hồ sơ cũ chưa có PIN | 409 đã có PIN
  GET  /api/me        (Authorization: Bearer <vé>) → 200 {name, progress, seen} | 401
  PUT  /api/me        {progress, seen, replace?}    → 200 dữ liệu sau khi gộp (lấy giá trị lớn nhất,
                                          để hai thiết bị không ghi đè mất tiến độ của nhau);
                                          replace=true thì thay hẳn (nút "Xoá tiến độ")
  POST /api/logout    (Authorization)   → 200 huỷ vé của thiết bị này
  POST /api/track     (Authorization) {events: [...]} → 200 – thống kê hành vi (bé dùng phần nào, bao lâu),
                                          kiểm tra rồi chuyển sang admin.duyetnt.com; không lưu ở đây
  GET  /api/packs                       → 200 {packs: [...]} – các gói nội dung mới đang bật (xem packs/index.json)
  GET  /api/leaderboard?period=all|week → 200 {period, top: 10 bé đứng đầu, me (nếu gửi kèm vé)}
                                          all: theo tổng số sao; week: theo số sao giành được từ thứ Hai
                                          (giờ Việt Nam). Bằng điểm thì ai qua nhiều cấp hơn đứng trước.

Cổng quản trị nội bộ (--admin-port, chỉ nghe 127.0.0.1, KHÔNG đưa ra nginx; trang admin.duyetnt.com gọi vào):
  GET  /users               → {users: [{name, hasPin, locked, levels, updated}]}
  POST /reset-pin {name}    → 200 {ok, name} | 404 – xoá PIN, mở khoá, huỷ mọi vé; lần sau bé đặt PIN mới
  GET  /packs               → 200 {packs: [{id, title, ..., enabled, kids, lessons: [{key, title}]}]}
  POST /packs/toggle {id, on} → 200 {ok, id, enabled} – bật / tắt một gói nội dung (tắt thì bé không thấy nữa)

Sai PIN 5 lần liên tiếp thì hồ sơ bị khoá 15 phút.
Tên: chỉ chữ không dấu và số, 3–20 ký tự, không phân biệt hoa thường.

Chạy thử trên máy (phục vụ luôn cả trang web):
  python3 server/app.py --port 8000 --static .
Quản trị trên server (bé quên PIN...): dùng deploy/admin.sh, ví dụ
  ssh ... 'sudo /opt/en-learn-api/admin.sh --reset-pin Bong2019'   (xoá PIN, lần sau bé đặt PIN mới)
  ssh ... 'sudo /opt/en-learn-api/admin.sh --list-users'
"""
import argparse, datetime, hashlib, hmac, json, os, re, secrets, sqlite3, threading, time, urllib.request
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, urlparse

NAME_RE = re.compile(r'^[A-Za-z0-9]{3,20}$')
PIN_RE = re.compile(r'^[0-9]{4}$')
PROGRESS_KEY_RE = re.compile(r'^\d{1,3}(-\d{1,2})?$')      # "0", "11", "3-2" ...
SEEN_KEY_MAX, SEEN_MAX = 200, 20000
MAX_BODY = 512 * 1024
MAX_FAILS, LOCK_SECONDS = 5, 15 * 60
PBKDF2_ROUNDS = 200_000
TOP_N = 10
VN = datetime.timezone(datetime.timedelta(hours=7))           # ngày / tuần tính theo giờ Việt Nam

db_lock = threading.Lock()
db = None
# Báo lượt truy cập cho admin.duyetnt.com (cổng nội bộ). Đặt ADMIN_INGEST= (rỗng) để tắt.
ADMIN_INGEST = os.environ.get('ADMIN_INGEST', 'http://127.0.0.1:8096/ingest')
ADMIN_EVENTS = ADMIN_INGEST.rsplit('/', 1)[0] + '/events' if ADMIN_INGEST else ''

# Thống kê hành vi (POST /api/track): chỉ nhận các khu vực / hoạt động đã biết, không nhận nội dung bé nhập.
#   view  – thời gian ở một màn hình: a = khu vực, d = số giây
#   start / done – bắt đầu / làm xong một hoạt động: a = hoạt động, s / n = số câu đúng / tổng, ok = qua bài
#   l = số thứ tự bài (0..), lv = cấp, x = mã đảo (trò kho báu), t = thời điểm (unix, giây)
TRACK_EVENTS = {'view', 'start', 'done'}
TRACK_AREAS = {'home', 'fame', 'lesson.vocab', 'lesson.dialog', 'lesson.grammar', 'lesson.practice', 'lesson.test',
               'castle', 'treasure', 'island', 'chest', 'practice', 'test', 'explore', 'expedition', 'diploma'}
TRACK_MAX = 60
ID_RE = re.compile(r'^[a-z]{1,20}$')


def clean_events(lst):
    out, now = [], int(time.time())
    if not isinstance(lst, list):
        return out
    num = lambda v, lo, hi: v if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi else None
    for e in lst[:TRACK_MAX]:
        if not isinstance(e, dict) or e.get('e') not in TRACK_EVENTS or e.get('a') not in TRACK_AREAS:
            continue
        t = num(e.get('t'), now - 7 * 86400, now + 60)
        ev = {'e': e['e'], 'a': e['a'], 't': t if t is not None else now}
        for k, lo, hi in (('d', 1, 3600), ('l', 0, 999), ('lv', 1, 9), ('s', 0, 999), ('n', 1, 999), ('ok', 0, 1)):
            v = num(e.get(k), lo, hi)
            if v is not None:
                ev[k] = v
        if isinstance(e.get('x'), str) and ID_RE.match(e['x']):
            ev['x'] = e['x']
        if ev['e'] == 'view' and 'd' not in ev:
            continue
        out.append(ev)
    return out


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
    # Nâng cấp bảng cũ (trước khi có PIN): thêm cột nếu chưa có, dữ liệu giữ nguyên
    cols = {r[1] for r in db.execute('PRAGMA table_info(users)')}
    for col, typ in [('pin_hash', 'TEXT'), ('pin_salt', 'TEXT'), ('fails', 'INTEGER NOT NULL DEFAULT 0'),
                     ('locked_until', 'INTEGER NOT NULL DEFAULT 0')]:
        if col not in cols:
            db.execute(f'ALTER TABLE users ADD COLUMN {col} {typ}')
    db.execute('''CREATE TABLE IF NOT EXISTS gains (
        key TEXT NOT NULL,
        day TEXT NOT NULL,             -- YYYY-MM-DD theo giờ Việt Nam
        stars INTEGER NOT NULL,        -- số sao tăng thêm trong ngày
        PRIMARY KEY (key, day))''')
    db.execute('CREATE TABLE IF NOT EXISTS pack_off (id TEXT PRIMARY KEY)')     # gói nội dung đang bị tắt
    db.execute('''CREATE TABLE IF NOT EXISTS tokens (
        token_hash TEXT PRIMARY KEY,   -- chỉ lưu dạng băm của vé
        key TEXT NOT NULL,
        created INTEGER NOT NULL)''')
    db.commit()


USER_COLS = 'key, name, progress, seen, pin_hash, pin_salt, fails, locked_until'


def get_user(key):
    r = db.execute(f'SELECT {USER_COLS} FROM users WHERE key=?', (key,)).fetchone()
    if not r:
        return None
    return dict(zip(['key', 'name', 'progress', 'seen', 'pin_hash', 'pin_salt', 'fails', 'locked_until'], r))


def hash_pin(pin, salt):
    return hashlib.pbkdf2_hmac('sha256', pin.encode(), bytes.fromhex(salt), PBKDF2_ROUNDS).hex()


def new_pin(pin):
    salt = secrets.token_hex(16)
    return hash_pin(pin, salt), salt


def reset_pin(key):
    """Xoá PIN + mở khoá + huỷ mọi vé của hồ sơ. Trả về tên hồ sơ, hoặc None nếu không có. Gọi khi đã giữ db_lock."""
    u = get_user(key)
    if not u:
        return None
    db.execute('UPDATE users SET pin_hash=NULL, pin_salt=NULL, fails=0, locked_until=0 WHERE key=?', (key,))
    db.execute('DELETE FROM tokens WHERE key=?', (key,))
    db.commit()
    return u['name']


def new_token(key):
    tok = secrets.token_urlsafe(32)
    db.execute('INSERT INTO tokens(token_hash,key,created) VALUES(?,?,?)',
               (hashlib.sha256(tok.encode()).hexdigest(), key, int(time.time())))
    return tok


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


def today_vn():
    return datetime.datetime.now(VN).date()


def record_gain(key, old_p, new_p):
    """Ghi số sao vừa tăng thêm (so với trước) vào ngày hôm nay."""
    gained = sum(max(0, v - old_p.get(k, 0)) for k, v in new_p.items())
    if gained > 0:
        db.execute('INSERT INTO gains(key,day,stars) VALUES(?,?,?) ON CONFLICT(key,day) DO UPDATE SET stars=stars+excluded.stars',
                   (key, today_vn().isoformat(), gained))


def leaderboard(period, me_key=None):
    today = today_vn()
    monday = (today - datetime.timedelta(days=today.weekday())).isoformat()
    week = dict(db.execute('SELECT key, SUM(stars) FROM gains WHERE day>=? GROUP BY key', (monday,)).fetchall())
    days = {}
    for key, day in db.execute('SELECT key, day FROM gains WHERE day>=? ORDER BY day DESC',
                               ((today - datetime.timedelta(days=60)).isoformat(),)):
        days.setdefault(key, []).append(datetime.date.fromisoformat(day))
    rows = []
    for key, name, prog in db.execute('SELECT key, name, progress FROM users'):
        p = json.loads(prog)
        stars, levels = sum(p.values()), sum(1 for v in p.values() if v > 0)
        score = week.get(key, 0) if period == 'week' else stars
        if score <= 0:
            continue                    # chưa có sao thì chưa lên bảng
        # Huy hiệu: học nhiều ngày liền (có thêm sao đến hôm nay / hôm qua), nhiều cấp 3 sao, hoàn thành hết
        streak, d = 0, today if (days.get(key) and days[key][0] == today) else today - datetime.timedelta(days=1)
        for x in days.get(key, []):
            if x == d:
                streak += 1; d -= datetime.timedelta(days=1)
            elif x < d:
                break
        badges = []
        if streak >= 3: badges.append(f'🔥 Học {streak} ngày liền')
        three = sum(1 for v in p.values() if v == 3)
        if three >= 5: badges.append(f'👑 {three} cấp 3 sao')
        rows.append({'key': key, 'name': name, 'score': score, 'stars': stars, 'levels': levels, 'badges': badges})
    rows.sort(key=lambda r: (-r['score'], -r['levels'], r['name'].lower()))
    for i, r in enumerate(rows):
        r['rank'] = i + 1
    out = {'period': period, 'weekStart': monday, 'total': len(rows),
           'top': [{k: r[k] for k in ('rank', 'name', 'score', 'stars', 'levels', 'badges')} for r in rows[:TOP_N]]}
    if me_key:
        mine = next((r for r in rows if r['key'] == me_key), None)
        if mine:
            ahead = rows[mine['rank'] - 2] if mine['rank'] > 1 else None
            out['me'] = {'rank': mine['rank'], 'score': mine['score'],
                         'ahead': {'name': ahead['name'], 'score': ahead['score']} if ahead else None}
        else:
            out['me'] = {'rank': None, 'score': 0, 'ahead': None}
    return out


# ---------- gói nội dung mới ----------
# packs/index.json: [{id, file, title, vi, icon, color, date, desc}] – danh sách gói, deploy cùng trang web.
# Mỗi gói là packs/<file> (bài học cùng định dạng js/lessons.js). Trình duyệt tự tải file gói;
# máy chủ chỉ cho biết gói nào đang bật (trang admin bật / tắt được).
PACKS_DIR = '/var/www/en-learn/packs'
PACK_ID_RE = re.compile(r'^[a-z0-9-]{1,30}$')
_packs_cache = {'mtime': None, 'list': []}


def pack_index():
    path = os.path.join(PACKS_DIR, 'index.json')
    try:
        mt = os.path.getmtime(path)
        if mt != _packs_cache['mtime']:
            with open(path, encoding='utf-8') as f:
                lst = json.load(f)
            _packs_cache.update(mtime=mt, list=[x for x in lst if isinstance(x, dict) and PACK_ID_RE.match(str(x.get('id', '')))])
    except (OSError, ValueError):
        _packs_cache.update(mtime=None, list=[])
    return _packs_cache['list']


def packs_off():
    return {r[0] for r in db.execute('SELECT id FROM pack_off')}


def merge_max(a, b):
    out = dict(a)
    for k, v in b.items():
        out[k] = max(out.get(k, 0), v)
    return out


def user_json(u, token=None):
    d = {'name': u['name'], 'progress': json.loads(u['progress']), 'seen': json.loads(u['seen'])}
    if token:
        d['token'] = token
    return d


class Handler(SimpleHTTPRequestHandler):
    server_version = 'en-learn'
    static_dir = None

    def report(self, name, kind):
        """Gửi sự kiện (tên, IP, trình duyệt) cho trang admin – chạy nền, lỗi thì bỏ qua, không làm chậm bé."""
        if not ADMIN_INGEST:
            return
        self.forward(ADMIN_INGEST, {'site': 'en', 'user': name, 'kind': kind})

    def forward(self, url, data):
        """Gửi JSON (kèm IP, trình duyệt) sang cổng nội bộ của admin trong luồng nền; lỗi thì bỏ qua."""
        ip = (self.headers.get('X-Forwarded-For') or '').split(',')[-1].strip() or self.client_address[0]
        body = json.dumps(dict(data, ip=ip, ua=(self.headers.get('User-Agent') or '')[:300])).encode()
        def send():
            try:
                urllib.request.urlopen(urllib.request.Request(url, body, {'Content-Type': 'application/json'}),
                                       timeout=2).close()
            except Exception:
                pass
        threading.Thread(target=send, daemon=True).start()

    def log_message(self, fmt, *args):            # log gọn, không ghi nội dung hay mã PIN
        print('%s %s' % (self.command, urlparse(self.path).path), flush=True)

    # ---------- tiện ích ----------
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def error(self, status, msg, **extra):
        self.send_json(status, dict({'error': msg}, **extra))

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

    def path_parts(self):
        return [unquote(p) for p in urlparse(self.path).path.split('/')[1:]]

    def auth_user(self):
        """Người dùng ứng với vé trong header Authorization, hoặc None."""
        h = self.headers.get('Authorization') or ''
        if not h.startswith('Bearer ') or len(h) > 200:
            return None
        th = hashlib.sha256(h[7:].strip().encode()).hexdigest()
        r = db.execute('SELECT key FROM tokens WHERE token_hash=?', (th,)).fetchone()
        return get_user(r[0]) if r else None

    def is_api(self):
        return urlparse(self.path).path.startswith('/api/')

    # ---------- định tuyến ----------
    def do_GET(self):
        if not self.is_api():
            return self.static_or_404()
        p = self.path_parts()
        if p == ['api', 'leaderboard']:
            q = urlparse(self.path).query
            period = 'week' if 'period=week' in q else 'all'
            with db_lock:
                u = self.auth_user()
                data = leaderboard(period, u['key'] if u else None)
            return self.send_json(HTTPStatus.OK, data)
        if p == ['api', 'packs']:
            with db_lock:
                off = packs_off()
            return self.send_json(HTTPStatus.OK, {'packs': [x for x in pack_index() if x['id'] not in off]})
        if p == ['api', 'me']:
            with db_lock:
                u = self.auth_user()
            if not u:
                return self.error(HTTPStatus.UNAUTHORIZED, 'Cần đăng nhập lại')
            self.send_json(HTTPStatus.OK, user_json(u))
            return self.report(u['name'], 'open')
        if len(p) == 3 and p[:2] == ['api', 'users']:
            if not NAME_RE.match(p[2]):
                return self.error(HTTPStatus.BAD_REQUEST, 'Tên không hợp lệ')
            with db_lock:
                u = get_user(p[2].lower())
            if not u:
                return self.error(HTTPStatus.NOT_FOUND, 'Chưa có tên này')
            return self.send_json(HTTPStatus.OK, {'name': u['name'], 'hasPin': bool(u['pin_hash'])})
        return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')

    def do_HEAD(self):
        if self.is_api():
            return self.error(HTTPStatus.METHOD_NOT_ALLOWED, 'Không hỗ trợ')
        return self.static_or_404(head=True)

    def do_POST(self):
        p = self.path_parts()
        try:
            data = self.read_json()
        except ValueError as e:
            return self.error(HTTPStatus.BAD_REQUEST, str(e))
        if p == ['api', 'users']:
            return self.create_user(data)
        if p == ['api', 'login']:
            return self.login(data)
        if p == ['api', 'logout']:
            h = self.headers.get('Authorization') or ''
            if h.startswith('Bearer '):
                with db_lock:
                    db.execute('DELETE FROM tokens WHERE token_hash=?', (hashlib.sha256(h[7:].strip().encode()).hexdigest(),))
                    db.commit()
            return self.send_json(HTTPStatus.OK, {'ok': True})
        if len(p) == 4 and p[:2] == ['api', 'users'] and p[3] == 'pin':
            return self.set_first_pin(p[2], data)
        if p == ['api', 'track']:
            return self.track(data)
        return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')

    def track(self, data):
        with db_lock:
            u = self.auth_user()
        if not u:
            return self.error(HTTPStatus.UNAUTHORIZED, 'Cần đăng nhập lại')
        events = clean_events(data.get('events'))
        self.send_json(HTTPStatus.OK, {'ok': True, 'n': len(events)})
        if events and ADMIN_EVENTS:
            self.forward(ADMIN_EVENTS, {'site': 'en', 'user': u['name'], 'events': events})

    def create_user(self, data):
        name, pin = data.get('name'), data.get('pin')
        if not isinstance(name, str) or not NAME_RE.match(name):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên chỉ gồm chữ không dấu và số, dài 3–20 ký tự')
        if not isinstance(pin, str) or not PIN_RE.match(pin):
            return self.error(HTTPStatus.BAD_REQUEST, 'Mã PIN phải gồm đúng 4 chữ số')
        progress, seen, now = clean_progress(data.get('progress')), clean_seen(data.get('seen')), int(time.time())
        ph, salt = new_pin(pin)
        with db_lock:
            try:
                db.execute('INSERT INTO users(key,name,progress,seen,created,updated,pin_hash,pin_salt) VALUES(?,?,?,?,?,?,?,?)',
                           (name.lower(), name, json.dumps(progress), json.dumps(seen), now, now, ph, salt))
            except sqlite3.IntegrityError:
                return self.error(HTTPStatus.CONFLICT, 'Tên này đã có người dùng')
            tok = new_token(name.lower())
            db.commit()
            u = get_user(name.lower())
        self.send_json(HTTPStatus.CREATED, user_json(u, tok))
        self.report(u['name'], 'register')

    def login(self, data):
        name, pin = data.get('name'), data.get('pin')
        if not isinstance(name, str) or not NAME_RE.match(name) or not isinstance(pin, str) or not PIN_RE.match(pin):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên hoặc mã PIN không hợp lệ')
        now = int(time.time())
        with db_lock:
            u = get_user(name.lower())
            if not u:
                return self.error(HTTPStatus.NOT_FOUND, 'Chưa có tên này')
            if not u['pin_hash']:
                return self.error(HTTPStatus.CONFLICT, 'Hồ sơ này chưa có mã PIN', needPin=True)
            if u['locked_until'] > now:
                return self.error(HTTPStatus.LOCKED, 'Sai mã PIN quá nhiều lần', retryAfter=u['locked_until'] - now)
            if u['fails'] >= MAX_FAILS:              # đã hết lượt (các lần thử song song): khoá ngay
                db.execute('UPDATE users SET fails=0, locked_until=? WHERE key=?', (now + LOCK_SECONDS, u['key']))
                db.commit()
                return self.error(HTTPStatus.LOCKED, 'Sai mã PIN quá nhiều lần', retryAfter=LOCK_SECONDS)
            # Giữ chỗ lượt thử TRƯỚC khi kiểm tra, để gửi nhiều yêu cầu cùng lúc cũng không thử được quá 5 lần
            fails = u['fails'] + 1
            db.execute('UPDATE users SET fails=? WHERE key=?', (fails, u['key']))
            db.commit()
        ok = hmac.compare_digest(hash_pin(pin, u['pin_salt']), u['pin_hash'])   # băm ngoài khoá cho nhanh
        with db_lock:
            if not ok:
                if fails >= MAX_FAILS:
                    db.execute('UPDATE users SET fails=0, locked_until=? WHERE key=?', (now + LOCK_SECONDS, u['key']))
                    db.commit()
                    return self.error(HTTPStatus.LOCKED, 'Sai mã PIN quá nhiều lần', retryAfter=LOCK_SECONDS)
                return self.error(HTTPStatus.UNAUTHORIZED, 'Mã PIN chưa đúng', triesLeft=MAX_FAILS - fails)
            db.execute('UPDATE users SET fails=0, locked_until=0 WHERE key=?', (u['key'],))
            tok = new_token(u['key'])
            db.commit()
            u = get_user(u['key'])
        self.send_json(HTTPStatus.OK, user_json(u, tok))
        self.report(u['name'], 'login')

    def set_first_pin(self, name, data):
        """Hồ sơ tạo từ trước khi có PIN: đặt PIN lần đầu."""
        pin = data.get('pin')
        if not NAME_RE.match(name):
            return self.error(HTTPStatus.BAD_REQUEST, 'Tên không hợp lệ')
        if not isinstance(pin, str) or not PIN_RE.match(pin):
            return self.error(HTTPStatus.BAD_REQUEST, 'Mã PIN phải gồm đúng 4 chữ số')
        ph, salt = new_pin(pin)
        with db_lock:
            u = get_user(name.lower())
            if not u:
                return self.error(HTTPStatus.NOT_FOUND, 'Chưa có tên này')
            if u['pin_hash']:
                return self.error(HTTPStatus.CONFLICT, 'Hồ sơ này đã có mã PIN')
            db.execute('UPDATE users SET pin_hash=?, pin_salt=?, fails=0, locked_until=0 WHERE key=?', (ph, salt, u['key']))
            tok = new_token(u['key'])
            db.commit()
            u = get_user(u['key'])
        self.send_json(HTTPStatus.OK, user_json(u, tok))
        self.report(u['name'], 'login')

    def do_PUT(self):
        if self.path_parts() != ['api', 'me']:
            return self.error(HTTPStatus.NOT_FOUND, 'Không có đường dẫn này')
        try:
            data = self.read_json()
        except ValueError as e:
            return self.error(HTTPStatus.BAD_REQUEST, str(e))
        progress, seen = clean_progress(data.get('progress')), clean_seen(data.get('seen'))
        with db_lock:
            u = self.auth_user()
            if not u:
                return self.error(HTTPStatus.UNAUTHORIZED, 'Cần đăng nhập lại')
            old_p = json.loads(u['progress'])
            if data.get('replace') is True:
                new_p, new_s = progress, seen
                db.execute('DELETE FROM gains WHERE key=?', (u['key'],))
            else:
                new_p = merge_max(old_p, progress)
                new_s = clean_seen(merge_max(json.loads(u['seen']), seen))
                record_gain(u['key'], old_p, new_p)
            db.execute('UPDATE users SET progress=?, seen=?, updated=? WHERE key=?',
                       (json.dumps(new_p), json.dumps(new_s), int(time.time()), u['key']))
            db.commit()
            u = get_user(u['key'])
        self.send_json(HTTPStatus.OK, user_json(u))
        self.report(u['name'], 'save')

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


class AdminHandler(SimpleHTTPRequestHandler):
    """Cổng quản trị nội bộ cho admin.duyetnt.com – chỉ nghe 127.0.0.1, không qua nginx."""
    server_version = 'en-learn-admin'
    send_json = Handler.send_json

    def log_message(self, fmt, *args):
        print('admin %s %s' % (self.command, urlparse(self.path).path), flush=True)

    def do_GET(self):
        if urlparse(self.path).path == '/packs':
            return self.packs()
        if urlparse(self.path).path != '/users':
            return self.send_json(HTTPStatus.NOT_FOUND, {'error': 'not found'})
        now = int(time.time())
        with db_lock:
            rows = db.execute('SELECT name, pin_hash IS NOT NULL, locked_until, progress, updated FROM users '
                              'ORDER BY updated DESC').fetchall()
        self.send_json(HTTPStatus.OK, {'users': [
            {'name': n, 'hasPin': bool(hp), 'locked': lu > now, 'levels': len(json.loads(pr)), 'updated': up}
            for n, hp, lu, pr, up in rows]})

    def packs(self):
        with db_lock:
            off = packs_off()
            seen = [json.loads(r[0]) for r in db.execute('SELECT seen FROM users')]
        out = []
        for x in pack_index():
            lessons = []
            try:
                with open(os.path.join(PACKS_DIR, os.path.basename(str(x.get('file', '')))), encoding='utf-8') as f:
                    lessons = [{'key': L.get('key'), 'title': L.get('title')} for L in json.load(f).get('lessons', [])]
            except (OSError, ValueError, AttributeError):
                pass
            out.append(dict(x, enabled=x['id'] not in off, lessons=lessons,
                            kids=sum(1 for sn in seen if sn.get('pack|' + x['id']))))
        self.send_json(HTTPStatus.OK, {'packs': out})

    def do_POST(self):
        if urlparse(self.path).path == '/packs/toggle':
            try:
                n = int(self.headers.get('Content-Length') or 0)
                d = json.loads(self.rfile.read(min(n, 4096)) or b'{}')
                pid, on = d.get('id'), d.get('on')
                if not isinstance(pid, str) or not PACK_ID_RE.match(pid) or not isinstance(on, bool):
                    raise ValueError
            except Exception:
                return self.send_json(HTTPStatus.BAD_REQUEST, {'error': 'Dữ liệu không hợp lệ'})
            with db_lock:
                if on:
                    db.execute('DELETE FROM pack_off WHERE id=?', (pid,))
                else:
                    db.execute('INSERT OR IGNORE INTO pack_off(id) VALUES(?)', (pid,))
                db.commit()
            print(f'admin: gói {pid} {"bật" if on else "tắt"}', flush=True)
            return self.send_json(HTTPStatus.OK, {'ok': True, 'id': pid, 'enabled': on})
        if urlparse(self.path).path != '/reset-pin':
            return self.send_json(HTTPStatus.NOT_FOUND, {'error': 'not found'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            name = json.loads(self.rfile.read(min(n, 4096)) or b'{}').get('name')
        except Exception:
            name = None
        if not isinstance(name, str) or not NAME_RE.match(name):
            return self.send_json(HTTPStatus.BAD_REQUEST, {'error': 'Tên không hợp lệ'})
        with db_lock:
            shown = reset_pin(name.lower())
        if not shown:
            return self.send_json(HTTPStatus.NOT_FOUND, {'error': f'Không có hồ sơ "{name}"'})
        print(f'admin: đã reset PIN của {shown}', flush=True)
        self.send_json(HTTPStatus.OK, {'ok': True, 'name': shown})


def main():
    ap = argparse.ArgumentParser(description='Máy chủ lưu tiến độ học')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=8090)
    ap.add_argument('--db', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'en-learn.db'))
    ap.add_argument('--admin-port', type=int, help='cổng quản trị nội bộ cho admin.duyetnt.com (chỉ 127.0.0.1)')
    ap.add_argument('--static', help='thư mục trang web (chỉ khi chạy thử trên máy)')
    ap.add_argument('--packs', help='thư mục gói nội dung (mặc định <static>/packs hoặc /var/www/en-learn/packs)')
    ap.add_argument('--reset-pin', metavar='TÊN', help='xoá mã PIN của một hồ sơ (bé quên PIN) rồi thoát')
    ap.add_argument('--delete-user', metavar='TÊN', help='xoá hẳn một hồ sơ rồi thoát')
    ap.add_argument('--list-users', action='store_true', help='liệt kê các hồ sơ rồi thoát')
    a = ap.parse_args()
    open_db(a.db)
    if a.reset_pin:
        n = reset_pin(a.reset_pin.lower())
        print(f'Đã xoá mã PIN của "{a.reset_pin}" – lần sau vào, bé sẽ đặt PIN mới.' if n else f'Không có hồ sơ "{a.reset_pin}"')
        return
    if a.delete_user:
        key = a.delete_user.lower()
        n = db.execute('DELETE FROM users WHERE key=?', (key,)).rowcount
        db.execute('DELETE FROM tokens WHERE key=?', (key,))
        db.execute('DELETE FROM gains WHERE key=?', (key,))
        db.commit()
        print(f'Đã xoá hồ sơ "{a.delete_user}".' if n else f'Không có hồ sơ "{a.delete_user}"')
        return
    if a.list_users:
        for name, prog, has_pin, upd in db.execute('SELECT name, progress, pin_hash IS NOT NULL, updated FROM users ORDER BY updated DESC'):
            print(f'{name:22} {"có PIN " if has_pin else "chưa PIN"}  {len(json.loads(prog)):3} cấp đã qua  '
                  f'cập nhật {time.strftime("%Y-%m-%d %H:%M", time.localtime(upd))}')
        return
    Handler.static_dir = os.path.abspath(a.static) if a.static else None
    global PACKS_DIR
    PACKS_DIR = os.path.abspath(a.packs) if a.packs else os.path.join(Handler.static_dir, 'packs') if Handler.static_dir else PACKS_DIR
    if a.admin_port:
        adm = ThreadingHTTPServer(('127.0.0.1', a.admin_port), AdminHandler)
        threading.Thread(target=adm.serve_forever, daemon=True).start()
        print(f'Cổng quản trị nội bộ: http://127.0.0.1:{a.admin_port}', flush=True)
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    print(f'Đang chạy ở http://{a.host}:{a.port}  (db: {a.db})', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()

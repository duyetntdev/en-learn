#!/usr/bin/env python3
"""Sao lưu an toàn file SQLite (dùng API backup, chạy được khi máy chủ đang ghi).
Dùng: backup.py <db> <thư mục sao lưu> [số bản giữ lại]"""
import os, sqlite3, sys, time

db, out = sys.argv[1], sys.argv[2]
keep = int(sys.argv[3]) if len(sys.argv) > 3 else 14
if not os.path.exists(db):
    sys.exit(0)
os.makedirs(out, exist_ok=True)
dst = os.path.join(out, 'en-learn-' + time.strftime('%Y%m%d-%H%M%S') + '.db')
src = sqlite3.connect(db)
with sqlite3.connect(dst) as d:
    src.backup(d)
src.close()
files = sorted(f for f in os.listdir(out) if f.startswith('en-learn-') and f.endswith('.db'))
for f in files[:-keep]:
    os.remove(os.path.join(out, f))
print('Đã sao lưu', dst)

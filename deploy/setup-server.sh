#!/usr/bin/env bash
# Cài máy chủ lưu tiến độ lên server (chạy MỘT LẦN, trên server, với sudo).
# deploy.sh tự chép file lên /tmp/en-learn-setup rồi gọi script này khi chưa cài.
set -euo pipefail
SRC="${1:-/tmp/en-learn-setup}"
SITE=/etc/nginx/sites-available/en.duyetnt.com

install -d -m 755 /opt/en-learn-api
install -m 644 "$SRC/app.py" "$SRC/backup.py" /opt/en-learn-api/
install -m 755 "$SRC/admin.sh" /opt/en-learn-api/
install -m 644 "$SRC/en-learn-api.service" "$SRC/en-learn-backup.service" "$SRC/en-learn-backup.timer" /etc/systemd/system/
install -m 644 "$SRC/nginx-ratelimit.conf" /etc/nginx/conf.d/en-learn-ratelimit.conf
systemctl daemon-reload
systemctl enable --now en-learn-api.service en-learn-backup.timer

# Thêm location /api/ vào khối server HTTPS của en.duyetnt.com (chỉ một lần)
if ! grep -q 'location \^~ /api/' "$SITE"; then
  cp "$SITE" "$SITE.bak-$(date +%Y%m%d%H%M%S)"
  python3 - "$SITE" "$SRC/nginx-api-location.conf" <<'PY'
import sys
site, snip = sys.argv[1], open(sys.argv[2]).read()
s = open(site).read()
marker = '    location / {'
assert s.count(marker) == 1, 'không tìm thấy "location /" duy nhất'
open(site, 'w').write(s.replace(marker, snip + '\n' + marker))
PY
fi
nginx -t
systemctl reload nginx
sleep 1
systemctl is-active en-learn-api.service

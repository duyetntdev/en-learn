#!/usr/bin/env bash
# Deploy website lên https://en.duyetnt.com
# Dùng:  ./deploy.sh
# Đổi khoá SSH / server bằng biến môi trường nếu cần:
#   SSH_KEY=~/keys/basion.pem ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

SSH_KEY="${SSH_KEY:-../basion.pem}"
SERVER="${SERVER:-ubuntu@ec2-13-228-49-233.ap-southeast-1.compute.amazonaws.com}"
DOMAIN="${DOMAIN:-en.duyetnt.com}"
WEBROOT="/var/www/en-learn"
FILES=(index.html css js audio images packs)

[ -f "$SSH_KEY" ] || { echo "❌ Không thấy khoá SSH: $SSH_KEY (đặt biến SSH_KEY=...)"; exit 1; }
for f in "${FILES[@]}"; do [ -e "$f" ] || { echo "❌ Thiếu $f"; exit 1; }; done

# Kiểm tra cú pháp JS trước khi đẩy lên
if command -v node >/dev/null; then
  for f in js/*.js; do node --check "$f" || { echo "❌ Lỗi cú pháp trong $f"; exit 1; }; done
fi

# Nhắc tăng AUDIO_V nếu file mp3 đã thay đổi so với lần deploy trước
# (trình duyệt cache mp3 30 ngày, không tăng AUDIO_V thì bé vẫn nghe bản cũ)
# Chỉ tính file đã deploy lần trước mà nay bị đổi nội dung; file mới thêm thì không sao.
STATE=.deploy-state
AUDIO_V=$(grep -oE 'AUDIO_V *= *[0-9]+' js/app.js | grep -oE '[0-9]+$')
NEW_STATE=$( { echo "V=$AUDIO_V"; sha1sum audio/*.mp3; } )
if [ -f "$STATE" ] && head -1 "$STATE" | grep -q '^V='; then
  OLD_V=$(head -1 "$STATE" | cut -d= -f2)
  # Dùng if (không dùng &&) để vòng lặp luôn trả về 0, nếu không set -e + pipefail sẽ dừng script
  CHANGED=$(tail -n +2 "$STATE" | while read -r h f; do
              if [ -f "$f" ] && [ "$(sha1sum "$f" | cut -d' ' -f1)" != "$h" ]; then echo "$f"; fi; done | wc -l)
  if [ "$CHANGED" -gt 0 ] && [ "$AUDIO_V" = "$OLD_V" ]; then
    echo "⚠️  $CHANGED file mp3 đã thay đổi nhưng AUDIO_V trong js/app.js vẫn là $AUDIO_V."
    read -r -p "   Vẫn deploy (máy đã cache có thể nghe file cũ)? [y/N] " ok; [[ "$ok" =~ ^[Yy]$ ]] || exit 1
  fi
fi

echo "📦 Đang upload lên $SERVER ..."
# Giải nén vào thư mục tạm rồi tráo đổi, để web không bao giờ ở trạng thái dở dang
# và các file đã xoá ở máy cũng bị xoá trên server.
tar czf - "${FILES[@]}" | ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$SERVER" "
  set -e
  sudo rm -rf $WEBROOT.new $WEBROOT.old
  sudo mkdir -p $WEBROOT.new
  sudo tar xzf - -C $WEBROOT.new
  sudo chown -R root:root $WEBROOT.new
  sudo find $WEBROOT.new -type d -exec chmod 755 {} +
  sudo find $WEBROOT.new -type f -exec chmod 644 {} +
  [ -d $WEBROOT ] && sudo mv $WEBROOT $WEBROOT.old
  sudo mv $WEBROOT.new $WEBROOT
  sudo rm -rf $WEBROOT.old
"

echo "🖥️  Cập nhật máy chủ lưu tiến độ ..."
# Lần đầu: cài dịch vụ + cấu hình nginx (deploy/setup-server.sh). Các lần sau: chỉ thay file đã đổi rồi khởi động lại.
tar czf - -C server app.py backup.py -C ../deploy en-learn-api.service en-learn-backup.service en-learn-backup.timer \
    nginx-api-location.conf nginx-ratelimit.conf setup-server.sh admin.sh | ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$SERVER" '
  set -e
  T=/tmp/en-learn-setup; rm -rf $T; mkdir -p $T; tar xzf - -C $T
  if [ ! -f /etc/systemd/system/en-learn-api.service ]; then
    echo "   Cài lần đầu ..."; sudo bash $T/setup-server.sh $T
  else
    changed=0
    for f in app.py backup.py; do cmp -s $T/$f /opt/en-learn-api/$f || { sudo install -m 644 $T/$f /opt/en-learn-api/; changed=1; }; done
    cmp -s $T/admin.sh /opt/en-learn-api/admin.sh || sudo install -m 755 $T/admin.sh /opt/en-learn-api/
    for f in en-learn-api.service en-learn-backup.service en-learn-backup.timer; do
      cmp -s $T/$f /etc/systemd/system/$f || { sudo install -m 644 $T/$f /etc/systemd/system/; sudo systemctl daemon-reload; changed=1; }; done
    if [ $changed = 1 ]; then sudo systemctl restart en-learn-api.service; echo "   Đã cập nhật và khởi động lại"; else echo "   Không có thay đổi"; fi
  fi
  rm -rf $T
'

echo "🔎 Kiểm tra https://$DOMAIN ..."
# Tên "zz" không hợp lệ → máy chủ đang chạy sẽ trả 400 (nếu dịch vụ chết, nginx trả 502)
api=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/api/users/zz")
echo "   /api/ → $api"
[ "$api" = 400 ] || { echo "❌ Máy chủ lưu tiến độ không trả lời đúng (mã $api)"; exit 1; }
for p in / /js/app.js /js/lessons.js; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN$p")
  echo "   $p → $code"
  [ "$code" = 200 ] || { echo "❌ Deploy xong nhưng $p trả về $code"; exit 1; }
done
echo "$NEW_STATE" > "$STATE"
echo "✅ Đã deploy: https://$DOMAIN"

#!/usr/bin/env bash
# Quản trị hồ sơ trên server, chạy bằng ĐÚNG user của dịch vụ (không dùng root để file dữ liệu
# không bị đổi chủ sở hữu). Ví dụ:
#   sudo /opt/en-learn-api/admin.sh --list-users
#   sudo /opt/en-learn-api/admin.sh --reset-pin Bong2019     # bé quên mã PIN
#   sudo /opt/en-learn-api/admin.sh --delete-user Bong2019
set -euo pipefail
[ $# -ge 1 ] || { sed -n '2,7p' "$0"; exit 1; }
exec systemd-run --quiet --wait --pipe --collect \
  -p DynamicUser=yes -p User=en-learn-api -p StateDirectory=en-learn \
  /usr/bin/python3 /opt/en-learn-api/app.py --db /var/lib/en-learn/en-learn.db "$@"

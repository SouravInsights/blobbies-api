#!/usr/bin/env bash
#
# One-time setup for a fresh Ubuntu Lightsail instance.
#
#   scp scripts/setup-instance.sh ubuntu@<ip>:~
#   ssh ubuntu@<ip> 'sudo DOMAIN=api.example.com bash setup-instance.sh'
#
# With DOMAIN set, it also installs nginx and a Let's Encrypt certificate and
# proxies https://DOMAIN to the container on 127.0.0.1:3000. Without it, only
# Docker is installed.
#
# Open ports 80 and 443 in the Lightsail console's Networking tab first, and
# point the domain's A record here.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo." >&2
  exit 1
fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

if [ -n "${SUDO_USER:-}" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "    Added $SUDO_USER to the docker group (applies on the next login)."
fi

DOMAIN="${DOMAIN:-}"
if [ -z "$DOMAIN" ]; then
  echo "==> No DOMAIN given, so nginx and TLS are skipped."
  exit 0
fi

echo "==> Installing nginx and certbot for $DOMAIN"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/blobbies-api <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/blobbies-api /etc/nginx/sites-enabled/blobbies-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Requesting a certificate for $DOMAIN"
if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --register-unsafely-without-email --redirect; then
  echo "==> https://$DOMAIN is live"
else
  echo "    certbot could not finish. The domain must already point at this"
  echo "    machine and ports 80/443 must be open. Retry with:"
  echo "        sudo certbot --nginx -d $DOMAIN"
fi

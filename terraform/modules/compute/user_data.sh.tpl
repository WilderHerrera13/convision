#!/bin/bash
set -euo pipefail

dnf update -y
dnf install -y --allowerasing docker nginx certbot python3-certbot-nginx aws-cli jq curl

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

mkdir -p /opt/convision /etc/cron.d

cat > /opt/convision/start-api.sh << 'STARTSCRIPT'
${start_api_body}
STARTSCRIPT

chmod +x /opt/convision/start-api.sh

cat > /etc/nginx/conf.d/convision.conf << 'NGINXCONF'
server {
    listen 80;
    server_name ${api_domain};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
NGINXCONF

mkdir -p /var/www/certbot
systemctl enable nginx
systemctl start nginx

ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
  CW_RPM_URL="https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/arm64/latest/amazon-cloudwatch-agent.rpm"
else
  CW_RPM_URL="https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm"
fi
curl -sSL "$CW_RPM_URL" -o /tmp/amazon-cloudwatch-agent.rpm
rpm -U /tmp/amazon-cloudwatch-agent.rpm

cat > /opt/convision/cwagent-config.json << 'CWAGENTJSON'
${cwagent_json}
CWAGENTJSON

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/convision/cwagent-config.json
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

cat > /opt/convision/setup-ssl.sh << 'SSLSCRIPT'
#!/bin/bash
set -euo pipefail

if [ -f /etc/letsencrypt/live/${api_domain}/fullchain.pem ]; then
  echo "[setup-ssl] cert already present, skipping issuance"
else
  certbot --nginx \
    -d ${api_domain} \
    --non-interactive \
    --agree-tos \
    --email admin@${api_domain} \
    --redirect
fi

cat > /etc/nginx/conf.d/convision.conf <<NGINXFULL
server {
    listen 80;
    server_name ${api_domain};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name ${api_domain};

    ssl_certificate     /etc/letsencrypt/live/${api_domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${api_domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINXFULL

nginx -t
systemctl reload nginx
SSLSCRIPT

chmod +x /opt/convision/setup-ssl.sh
/opt/convision/setup-ssl.sh

echo "0 3 * * * root certbot renew --quiet && systemctl reload nginx" > /etc/cron.d/certbot-renew

cat > /etc/systemd/system/convision-api.service << 'SVCFILE'
[Unit]
Description=Convision API
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/opt/convision/start-api.sh
ExecStop=docker stop convision-api

[Install]
WantedBy=multi-user.target
SVCFILE

systemctl daemon-reload
systemctl enable convision-api
systemctl start convision-api || true

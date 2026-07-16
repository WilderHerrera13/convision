#!/bin/bash
set -euo pipefail

REGION="${region}"
PREFIX="${ssm_prefix}"

DB_HOST=$(aws ssm get-parameter --region $REGION --name "$PREFIX/db_host" --query Parameter.Value --output text)
DB_NAME=$(aws ssm get-parameter --region $REGION --name "$PREFIX/db_name" --query Parameter.Value --output text)
DB_USER=$(aws ssm get-parameter --region $REGION --name "$PREFIX/db_username" --query Parameter.Value --output text)
DB_PASS=$(aws ssm get-parameter --region $REGION --name "$PREFIX/db_password" --with-decryption --query Parameter.Value --output text)
JWT_SECRET=$(aws ssm get-parameter --region $REGION --name "$PREFIX/jwt_secret" --with-decryption --query Parameter.Value --output text)

docker stop convision-api 2>/dev/null || true
docker rm convision-api 2>/dev/null || true

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $(echo "${docker_image}" | cut -d/ -f1) 2>/dev/null || true

docker pull ${docker_image}

BOOTSTRAP_DEFAULT_USERS="$${BOOTSTRAP_DEFAULT_USERS:-${bootstrap_default_users}}"

docker run -d \
  --name convision-api \
  --restart unless-stopped \
  -p 127.0.0.1:8001:8001 \
  -e APP_ENV=production \
  -e BOOTSTRAP_DEFAULT_USERS=$BOOTSTRAP_DEFAULT_USERS \
  -e APP_PORT=8001 \
  -e DB_HOST=$DB_HOST \
  -e DB_PORT=5432 \
  -e DB_DATABASE=$DB_NAME \
  -e DB_USERNAME=$DB_USER \
  -e DB_PASSWORD=$DB_PASS \
  -e DB_SSLMODE=require \
  -e JWT_SECRET=$JWT_SECRET \
  -e JWT_TTL_HOURS=24 \
  -e LOG_LEVEL=info \
  -e UPLOADS_BUCKET=${uploads_bucket} \
  -e AWS_REGION=$REGION \
  ${docker_image}

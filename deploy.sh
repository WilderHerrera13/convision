#!/usr/bin/env bash
set -euo pipefail

PROFILE="${AWS_PROFILE:-convision-admin}"
REGION="us-east-1"
PROJECT="convision"
ENVIRONMENT="${1:-dev}"
TARGET="${2:-all}"

BOOTSTRAP_DEFAULT_USERS="${BOOTSTRAP_DEFAULT_USERS:-false}"

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
ECR_REPO="${ECR_REGISTRY}/${PROJECT}/api"
IMAGE_TAG=$(git -C "$(dirname "$0")" rev-parse --short HEAD 2>/dev/null || echo "latest")
IMAGE_URI="${ECR_REPO}:${IMAGE_TAG}"

EC2_TAG_NAME="${PROJECT}-${ENVIRONMENT}-api"
S3_TAG_NAME="${PROJECT}-${ENVIRONMENT}-frontend"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/convision-api-golang"
FRONTEND_DIR="${SCRIPT_DIR}/convision-front"
API_LOG_GROUP="/${PROJECT}/${ENVIRONMENT}/api"

DEPLOY_API_ROOT_DOMAIN="${DEPLOY_API_ROOT_DOMAIN:-opticaconvision.com}"

SSH_KEY="${DEPLOY_SSH_KEY:-}"
if [ -z "$SSH_KEY" ]; then
  for candidate in "${HOME}/.ssh/id_rsa" "${HOME}/.ssh/convision"; do
    if [ -f "$candidate" ]; then
      SSH_KEY="$candidate"
      break
    fi
  done
fi
SSH_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=30)
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS+=(-o IdentitiesOnly=yes -i "$SSH_KEY")
fi

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✓ $*"; }
err()  { echo "[$(date '+%H:%M:%S')] ✗ $*" >&2; exit 1; }
sep()  { echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

get_ec2_ip() {
  aws ec2 describe-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=${EC2_TAG_NAME}" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text
}

get_s3_bucket() {
  aws s3api list-buckets \
    --profile "$PROFILE" \
    --query "Buckets[?contains(Name, '${PROJECT}-${ENVIRONMENT}-frontend')].Name | [0]" \
    --output text
}

get_cloudfront_id() {
  aws cloudfront list-distributions \
    --profile "$PROFILE" \
    --query "DistributionList.Items[?contains(Origins.Items[0].DomainName, '${PROJECT}-${ENVIRONMENT}-frontend')].Id | [0]" \
    --output text
}

deploy_backend() {
  sep
  log "BACKEND — entorno: ${ENVIRONMENT} | tag: ${IMAGE_TAG}"
  sep

  local ec2_ip
  ec2_ip=$(get_ec2_ip)
  [ "$ec2_ip" = "None" ] || [ -z "$ec2_ip" ] && err "EC2 no está corriendo. Usa ./infra.sh ${ENVIRONMENT} start primero."

  log "EC2 IP: ${ec2_ip}"

  log "Autenticando en ECR..."
  aws ecr get-login-password --profile "$PROFILE" --region "$REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY" > /dev/null
  ok "ECR autenticado"

  log "Construyendo imagen Docker para linux/arm64..."
  docker buildx build \
    --platform linux/arm64 \
    --file "${BACKEND_DIR}/docker/Dockerfile" \
    --tag "${IMAGE_URI}" \
    --tag "${ECR_REPO}:latest" \
    --push \
    "${BACKEND_DIR}"
  ok "Imagen publicada: ${IMAGE_URI}"

  log "Sincronizando /opt/convision/start-api.sh (imagen ECR + log group CloudWatch)..."
  RENDERED_START="$(mktemp)"
  sed \
    -e "s|\${region}|${REGION}|g" \
    -e "s|\${ssm_prefix}|/${PROJECT}/${ENVIRONMENT}|g" \
    -e "s|\${docker_image}|${IMAGE_URI}|g" \
    -e "s|\${uploads_bucket}|${PROJECT}-${ENVIRONMENT}-uploads|g" \
    -e "s|\${bootstrap_default_users}|${BOOTSTRAP_DEFAULT_USERS}|g" \
    -e "s|\${api_log_group_name}|${API_LOG_GROUP}|g" \
    "${SCRIPT_DIR}/terraform/modules/compute/start-api.sh.tpl" | perl -pe 's/\$\$\{/\${/g' > "${RENDERED_START}"
  scp "${SSH_OPTS[@]}" "${RENDERED_START}" "ec2-user@${ec2_ip}:/tmp/start-api.sh"
  rm -f "${RENDERED_START}"
  ssh "${SSH_OPTS[@]}" "ec2-user@${ec2_ip}" \
    "sudo install -m 0755 /tmp/start-api.sh /opt/convision/start-api.sh && rm -f /tmp/start-api.sh"
  ok "start-api.sh alineado con deploy (CloudWatch: ${API_LOG_GROUP})"

  log "Desplegando en EC2 (${ec2_ip})..."
  ssh "${SSH_OPTS[@]}" "ec2-user@${ec2_ip}" \
    "export BOOTSTRAP_DEFAULT_USERS=${BOOTSTRAP_DEFAULT_USERS}; IMAGE=${IMAGE_URI} /opt/convision/start-api.sh"
  ok "API reiniciada en EC2"

  log "Verificando salud de la API..."
  sleep 5
  ssh "${SSH_OPTS[@]}" "ec2-user@${ec2_ip}" \
    "curl -sf http://localhost:8001/health || (docker logs convision-api --tail 20 && exit 1)"
  ok "API respondiendo correctamente"
}

deploy_frontend() {
  sep
  log "FRONTEND — entorno: ${ENVIRONMENT}"
  sep

  local s3_bucket cf_id
  s3_bucket=$(get_s3_bucket)
  cf_id=$(get_cloudfront_id)

  [ "$s3_bucket" = "None" ] || [ -z "$s3_bucket" ] && err "No se encontró el bucket S3 del frontend."
  [ "$cf_id" = "None" ] || [ -z "$cf_id" ] && err "No se encontró la distribución CloudFront."

  log "S3 bucket: ${s3_bucket}"
  log "CloudFront ID: ${cf_id}"

  log "Instalando dependencias..."
  npm --prefix "$FRONTEND_DIR" ci --silent
  ok "Dependencias instaladas"

  if [ -z "${VITE_API_URL:-}" ]; then
    export VITE_API_URL="https://api.${DEPLOY_API_ROOT_DOMAIN}"
  fi
  log "Build con VITE_API_URL=${VITE_API_URL}"

  log "Construyendo frontend..."
  npm --prefix "$FRONTEND_DIR" run build
  ok "Build completado en ${FRONTEND_DIR}/dist"

  log "Sincronizando con S3..."
  aws s3 sync "${FRONTEND_DIR}/dist/" "s3://${s3_bucket}/" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html"

  aws s3 cp "${FRONTEND_DIR}/dist/index.html" "s3://${s3_bucket}/index.html" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --cache-control "no-cache,no-store,must-revalidate"
  ok "Archivos sincronizados en S3"

  log "Invalidando cache de CloudFront..."
  local invalidation_id
  invalidation_id=$(aws cloudfront create-invalidation \
    --profile "$PROFILE" \
    --distribution-id "$cf_id" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)
  ok "Invalidación iniciada: ${invalidation_id}"

  log "Esperando que la invalidación complete..."
  aws cloudfront wait invalidation-completed \
    --profile "$PROFILE" \
    --distribution-id "$cf_id" \
    --id "$invalidation_id"
  ok "Cache invalidada. Frontend disponible."
}

case "$TARGET" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo ""
    echo "Uso: $0 [entorno] [backend|frontend|all]"
    echo ""
    echo "  Ejemplos:"
    echo "    $0 dev backend    # Solo despliega la API"
    echo "    $0 dev frontend   # Solo despliega el frontend"
    echo "    $0 dev all        # Despliega todo"
    echo ""
    echo "  Variables de entorno:"
    echo "    AWS_PROFILE              (default: convision-admin)"
    echo "    VITE_API_URL             URL pública del API para el build (default: https://api.\$DEPLOY_API_ROOT_DOMAIN)"
    echo "    DEPLOY_API_ROOT_DOMAIN   dominio raíz sin esquema (default: opticaconvision.com)"
    echo "    DEPLOY_SSH_KEY           clave privada SSH para EC2"
    echo "    BOOTSTRAP_DEFAULT_USERS  true|false (default: false). Solo true en entornos desechables."
    echo ""
    exit 1
    ;;
esac

sep
ok "Deploy ${TARGET} en ${ENVIRONMENT} completado. Tag: ${IMAGE_TAG}"
sep

#!/usr/bin/env zsh
# ─────────────────────────────────────────────────────────────────────────────
# Convision — Script de inicio completo
#
# Uso:
#   ./start.sh            Inicia todo (Docker + Backend + Frontend)
#   ./start.sh --fresh    Recrea la BD desde cero (migrate:fresh --seed)
#   ./start.sh --stop     Detiene todos los procesos
# ─────────────────────────────────────────────────────────────────────────────

set -e
set -o pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/convision-api"
FRONT_DIR="$ROOT_DIR/convision-front"
DOCKER_COMPOSE="$ROOT_DIR/docker/docker-compose.yml"
LOG_DIR="$ROOT_DIR/.logs"

FRESH=false
STOP=false

for arg in "$@"; do
  case $arg in
    --fresh) FRESH=true ;;
    --stop)  STOP=true  ;;
  esac
done

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}━━━  $1  ━━━${NC}\n"; }

pick_postgres_port() {
  local preferred_port=5432
  local fallback_port=5433

  if ! lsof -nP -iTCP:"$preferred_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "$preferred_port"
    return
  fi

  local port
  for port in $(seq "$fallback_port" 5499); do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return
    fi
  done

  error "No se encontró un puerto libre para PostgreSQL entre 5433 y 5499"
}

pick_adminer_port() {
  local preferred_port=8080
  local fallback_port=8081

  if ! lsof -nP -iTCP:"$preferred_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "$preferred_port"
    return
  fi

  local port
  for port in $(seq "$fallback_port" 8999); do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$port"
      return
    fi
  done

  error "No se encontró un puerto libre para Adminer entre 8081 y 8999"
}

# ── Detener todo ──────────────────────────────────────────────────────────────
stop_all() {
  section "Deteniendo servicios"

  if [[ -f "$LOG_DIR/api.pid" ]]; then
    local api_pid=$(cat "$LOG_DIR/api.pid")
    if kill -0 "$api_pid" 2>/dev/null; then
      kill "$api_pid" && success "Backend detenido (PID $api_pid)"
    fi
    rm -f "$LOG_DIR/api.pid"
  fi

  if [[ -f "$LOG_DIR/front.pid" ]]; then
    local front_pid=$(cat "$LOG_DIR/front.pid")
    if kill -0 "$front_pid" 2>/dev/null; then
      kill "$front_pid" && success "Frontend detenido (PID $front_pid)"
    fi
    rm -f "$LOG_DIR/front.pid"
  fi

  DOCKER_PLATFORM=linux/arm64/v8 docker compose -f "$DOCKER_COMPOSE" down 2>/dev/null \
    && success "Contenedores Docker detenidos" \
    || warn "No había contenedores corriendo"

  exit 0
}

$STOP && stop_all

# ── Prerequisitos ─────────────────────────────────────────────────────────────
section "Verificando prerequisitos"

command -v docker   >/dev/null 2>&1 || error "Docker no está instalado"
command -v php      >/dev/null 2>&1 || error "PHP no está instalado"
command -v composer >/dev/null 2>&1 || error "Composer no está instalado"
command -v node     >/dev/null 2>&1 || error "Node.js no está instalado"
command -v npm      >/dev/null 2>&1 || error "npm no está instalado"

docker info >/dev/null 2>&1 || error "El daemon de Docker no está corriendo. Abre Docker Desktop."

success "Todos los prerequisitos encontrados"

mkdir -p "$LOG_DIR"

# ── 1. Docker ─────────────────────────────────────────────────────────────────
section "1/3 — Base de datos (Docker)"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  export DOCKER_PLATFORM=linux/arm64/v8
  log "Arquitectura Apple Silicon detectada → usando linux/arm64/v8"
fi

POSTGRES_RUNNING=$(docker ps --filter "name=convision-postgres" --filter "status=running" --format "{{.Names}}" 2>/dev/null)
ADMINER_RUNNING=$(docker ps --filter "name=convision-adminer" --filter "status=running" --format "{{.Names}}" 2>/dev/null)

if [[ -n "$POSTGRES_RUNNING" ]]; then
  EXISTING_DB_PORT=$(docker port convision-postgres 5432/tcp 2>/dev/null | head -n 1 | awk -F: '{print $NF}')
  SELECTED_DB_PORT=${EXISTING_DB_PORT:-5432}
else
  SELECTED_DB_PORT=$(pick_postgres_port)
fi

if [[ -n "$ADMINER_RUNNING" ]]; then
  EXISTING_ADMINER_PORT=$(docker port convision-adminer 8080/tcp 2>/dev/null | head -n 1 | awk -F: '{print $NF}')
  SELECTED_ADMINER_PORT=${EXISTING_ADMINER_PORT:-8080}
else
  SELECTED_ADMINER_PORT=$(pick_adminer_port)
fi

export DB_PORT="$SELECTED_DB_PORT"
export ADMINER_PORT="$SELECTED_ADMINER_PORT"

if [[ "$SELECTED_DB_PORT" == "5432" ]]; then
  log "Usando puerto PostgreSQL por defecto: 5432"
else
  warn "Puerto 5432 ocupado. Usando puerto alternativo para PostgreSQL: $SELECTED_DB_PORT"
fi

if [[ "$SELECTED_ADMINER_PORT" == "8080" ]]; then
  log "Usando puerto Adminer por defecto: 8080"
else
  warn "Puerto 8080 ocupado. Usando puerto alternativo para Adminer: $SELECTED_ADMINER_PORT"
fi

if [[ -n "$POSTGRES_RUNNING" ]]; then
  success "PostgreSQL ya está corriendo"
else
  log "Iniciando contenedores Docker..."
  docker compose -f "$DOCKER_COMPOSE" up -d postgres 2>&1 | tail -5

  log "Esperando que PostgreSQL esté healthy..."
  retries=0
  until docker exec convision-postgres pg_isready -U convision -d convision --quiet 2>/dev/null; do
    retries=$((retries + 1))
    if [[ $retries -ge 30 ]]; then
      error "PostgreSQL no respondió después de 60s. Revisa: docker logs convision-postgres"
    fi
    sleep 2
  done
  success "PostgreSQL healthy y listo"
fi

if [[ -n "$ADMINER_RUNNING" ]]; then
  success "Adminer ya está corriendo"
else
  log "Iniciando Adminer..."
  docker compose -f "$DOCKER_COMPOSE" up -d adminer 2>&1 | tail -5
fi

# ── 2. Backend (Laravel) ──────────────────────────────────────────────────────
section "2/3 — Backend (Laravel · puerto 8000)"

cd "$API_DIR"

# .env
if [[ ! -f ".env" ]]; then
  log "Creando .env desde .env.example..."
  cp .env.example .env
  sed -i '' 's/DB_DATABASE=laravel/DB_DATABASE=convision/' .env
  sed -i '' 's/DB_USERNAME=root/DB_USERNAME=convision/' .env
  sed -i '' 's/DB_PASSWORD=/DB_PASSWORD=convision/' .env
fi

# Actualizar DB_CONNECTION a pgsql si todavía apunta a mysql
if grep -q '^DB_CONNECTION=mysql' .env; then
  sed -i '' 's/^DB_CONNECTION=mysql/DB_CONNECTION=pgsql/' .env
fi

if grep -q '^DB_PORT=' .env; then
  sed -i '' "s/^DB_PORT=.*/DB_PORT=$SELECTED_DB_PORT/" .env
else
  echo "DB_PORT=$SELECTED_DB_PORT" >> .env
fi

# Dependencias
if [[ ! -d "vendor" ]]; then
  log "Instalando dependencias PHP..."
  composer install --no-interaction --prefer-dist 2>&1 | tail -3
fi

# APP_KEY
APP_KEY_VALUE=$(grep "^APP_KEY=" .env | cut -d= -f2)
if [[ -z "$APP_KEY_VALUE" ]]; then
  log "Generando APP_KEY..."
  php artisan key:generate --force
fi

# JWT_SECRET
JWT_SECRET_VALUE=$(grep "^JWT_SECRET=" .env | cut -d= -f2)
if [[ -z "$JWT_SECRET_VALUE" ]]; then
  log "Generando JWT_SECRET..."
  php artisan jwt:secret --force
fi

# Migraciones
if $FRESH; then
  warn "Recreando base de datos desde cero (--fresh)..."
  php artisan migrate:fresh --seed --force
else
  log "Ejecutando migraciones pendientes..."
  php artisan migrate --force 2>&1 | tail -5
fi

# Verificar si ya hay un proceso en el puerto 8000
if lsof -ti:8000 >/dev/null 2>&1; then
  warn "Puerto 8000 ya ocupado — backend probablemente ya corre"
else
  log "Iniciando servidor Laravel en background..."
  php artisan serve --port=8000 > "$LOG_DIR/api.log" 2>&1 &
  echo $! > "$LOG_DIR/api.pid"
  sleep 2
  if kill -0 "$(cat "$LOG_DIR/api.pid")" 2>/dev/null; then
    success "Backend corriendo → http://localhost:8000  (log: .logs/api.log)"
  else
    error "El backend falló al iniciar. Revisa: cat .logs/api.log"
  fi
fi

# ── 3. Frontend (React/Vite) ──────────────────────────────────────────────────
section "3/3 — Frontend (Vite · puerto 4300)"

cd "$FRONT_DIR"

if [[ ! -d "node_modules" ]]; then
  log "Instalando dependencias Node..."
  npm install 2>&1 | tail -5
fi

if lsof -ti:4300 >/dev/null 2>&1; then
  warn "Puerto 4300 ya ocupado — frontend probablemente ya corre"
else
  log "Iniciando Vite en background..."
  npm run dev > "$LOG_DIR/front.log" 2>&1 &
  echo $! > "$LOG_DIR/front.pid"
  sleep 3
  if kill -0 "$(cat "$LOG_DIR/front.pid")" 2>/dev/null; then
    success "Frontend corriendo → http://localhost:4300  (log: .logs/front.log)"
  else
    error "El frontend falló al iniciar. Revisa: cat .logs/front.log"
  fi
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
section "Todo listo"

echo -e "  ${GREEN}●${NC} PostgreSQL   → localhost:$SELECTED_DB_PORT"
echo -e "  ${GREEN}●${NC} Adminer      → http://localhost:$SELECTED_ADMINER_PORT   (servidor: postgres / user: convision / pass: convision)"
echo -e "  ${GREEN}●${NC} Backend API  → http://localhost:8000"
echo -e "  ${GREEN}●${NC} Frontend     → http://localhost:4300"
echo ""
echo -e "  ${BOLD}Credenciales de prueba:${NC}"
echo -e "  admin@convision.com / specialist@convision.com / receptionist@convision.com"
echo -e "  Contraseña: ${BOLD}password${NC}"
echo ""
echo -e "  ${YELLOW}Logs:${NC}  tail -f .logs/api.log   |  tail -f .logs/front.log"
echo -e "  ${YELLOW}Parar:${NC} ./start.sh --stop"
echo ""

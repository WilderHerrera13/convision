#!/usr/bin/env zsh
# ─────────────────────────────────────────────────────────────────────────────
# Convision — Script de inicio completo
#
# Backend: Go API + PostgreSQL corren en Docker
# Frontend: Vite corre localmente (dev server con HMR)
#
# Uso:
#   ./start.sh            Inicia todo (Docker + Frontend)
#   ./start.sh --stop     Detiene todos los procesos
# ─────────────────────────────────────────────────────────────────────────────

set -e
set -o pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONT_DIR="$ROOT_DIR/convision-front"
GO_COMPOSE="$ROOT_DIR/convision-api-golang/docker/docker-compose.yml"
LOG_DIR="$ROOT_DIR/.logs"

STOP=false

for arg in "$@"; do
  case $arg in
    --stop) STOP=true ;;
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

# ── Detener todo ──────────────────────────────────────────────────────────────
stop_all() {
  section "Deteniendo servicios"

  if [[ -f "$LOG_DIR/front.pid" ]]; then
    local front_pid=$(cat "$LOG_DIR/front.pid")
    if kill -0 "$front_pid" 2>/dev/null; then
      kill "$front_pid" && success "Frontend detenido (PID $front_pid)"
    fi
    rm -f "$LOG_DIR/front.pid"
  fi

  docker compose -f "$GO_COMPOSE" down 2>/dev/null \
    && success "Contenedores Docker detenidos" \
    || warn "No había contenedores corriendo"

  exit 0
}

$STOP && stop_all

# ── Prerequisitos ─────────────────────────────────────────────────────────────
section "Verificando prerequisitos"

command -v docker >/dev/null 2>&1 || error "Docker no está instalado"
command -v node   >/dev/null 2>&1 || error "Node.js no está instalado"
command -v npm    >/dev/null 2>&1 || error "npm no está instalado"

docker info >/dev/null 2>&1 || error "El daemon de Docker no está corriendo. Abre Docker Desktop."

success "Todos los prerequisitos encontrados"

mkdir -p "$LOG_DIR"

# ── 1. Docker (PostgreSQL + Go API) ──────────────────────────────────────────
section "1/2 — Backend Go + PostgreSQL (Docker · puerto 8001)"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  export DOCKER_DEFAULT_PLATFORM=linux/arm64/v8
  log "Arquitectura Apple Silicon detectada → usando linux/arm64/v8"
fi

GO_API_RUNNING=$(docker ps --filter "name=convision_go_api" --filter "status=running" --format "{{.Names}}" 2>/dev/null)
POSTGRES_RUNNING=$(docker ps --filter "name=convision_go_postgres" --filter "status=running" --format "{{.Names}}" 2>/dev/null)

if [[ -n "$GO_API_RUNNING" && -n "$POSTGRES_RUNNING" ]]; then
  success "PostgreSQL y Go API ya están corriendo"
else
  log "Construyendo e iniciando contenedores (postgres + api)..."
  docker compose -f "$GO_COMPOSE" up -d --build 2>&1 | tail -10

  log "Esperando que PostgreSQL esté healthy..."
  retries=0
  until docker exec convision_go_postgres pg_isready -U convision -d convision --quiet 2>/dev/null; do
    retries=$((retries + 1))
    if [[ $retries -ge 30 ]]; then
      error "PostgreSQL no respondió después de 60s. Revisa: docker logs convision_go_postgres"
    fi
    sleep 2
  done
  success "PostgreSQL healthy"

  log "Esperando que el Go API responda en :8001..."
  retries=0
  until curl -sf http://localhost:8001/health >/dev/null 2>&1 || curl -sf http://localhost:8001/api/v1/health >/dev/null 2>&1; do
    retries=$((retries + 1))
    if [[ $retries -ge 20 ]]; then
      warn "Go API aún no responde — puede tardar un poco más. Revisa: docker logs convision_go_api"
      break
    fi
    sleep 2
  done
  success "Go API corriendo → http://localhost:8001"
fi

# ── 2. Frontend (React/Vite) ──────────────────────────────────────────────────
section "2/2 — Frontend (Vite · puerto 4300)"

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

echo -e "  ${GREEN}●${NC} PostgreSQL   → localhost:5433  (Docker)"
echo -e "  ${GREEN}●${NC} pgAdmin      → http://localhost:5050   (admin@convision.com / secret)"
echo -e "  ${GREEN}●${NC} Go API       → http://localhost:8001   (Docker)"
echo -e "  ${GREEN}●${NC} Frontend     → http://localhost:4300"
echo ""
echo -e "  ${BOLD}Credenciales de prueba:${NC}"
echo -e "  admin@convision.com / specialist@convision.com / receptionist@convision.com"
echo -e "  Contraseña: ${BOLD}password${NC}"
echo ""
echo -e "  ${YELLOW}Logs API:${NC}   docker logs -f convision_go_api"
echo -e "  ${YELLOW}Log Front:${NC}  tail -f .logs/front.log"
echo -e "  ${YELLOW}Parar:${NC}      ./start.sh --stop"
echo ""

#!/usr/bin/env bash
set -euo pipefail

PROFILE="${AWS_PROFILE:-convision-admin}"
REGION="us-east-1"
PROJECT="convision"
ENVIRONMENT="${1:-dev}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

EC2_TAG_NAME="${PROJECT}-${ENVIRONMENT}-api"
RDS_ID="${PROJECT}-${ENVIRONMENT}-db"

# ---------- colors ----------
if [ -t 1 ]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
  C_CYAN=$'\033[36m'
  C_BLUE=$'\033[34m'
else
  C_RESET= C_BOLD= C_DIM= C_GREEN= C_YELLOW= C_RED= C_CYAN= C_BLUE=
fi

# ---------- helpers ----------
aws_q() { aws --profile "$PROFILE" --region "$REGION" "$@"; }

# Color a numeric value based on three thresholds (green/yellow/red).
# Usage: colorize_pct VALUE WARN CRIT  -> echoes colored "VALUE%"
colorize_pct() {
  local v="$1" warn="$2" crit="$3"
  if [ -z "$v" ] || [ "$v" = "None" ]; then
    printf "%s" "${C_DIM}n/a${C_RESET}"
    return
  fi
  local int=${v%.*}
  if [ "$int" -ge "$crit" ]; then printf "%s" "${C_RED}${v}%${C_RESET}"
  elif [ "$int" -ge "$warn" ]; then printf "%s" "${C_YELLOW}${v}%${C_RESET}"
  else printf "%s" "${C_GREEN}${v}%${C_RESET}"
  fi
}

section() { printf "\n%s\n" "${C_BOLD}${C_CYAN}━━━ $1 ━━━${C_RESET}"; }
row()     { printf "  %-30s %s\n" "$1" "$2"; }

# Get CloudWatch statistic — avg and max over a period.
# Usage: cw_stat NAMESPACE METRIC DIM_NAME DIM_VALUE SECONDS_BACK
cw_stat() {
  local ns="$1" metric="$2" dn="$3" dv="$4" back="$5"
  local start end
  start=$(date -u -v-${back}S +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "${back} seconds ago" +%Y-%m-%dT%H:%M:%SZ)
  end=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local period=300
  [ "$back" -ge 86400 ] && period=3600
  aws_q cloudwatch get-metric-statistics \
    --namespace "$ns" --metric-name "$metric" \
    --dimensions Name=$dn,Value=$dv \
    --start-time "$start" --end-time "$end" \
    --period $period --statistics Average Maximum \
    --query 'Datapoints | sort_by(@,&Timestamp) | [-1].[Average,Maximum]' \
    --output text 2>/dev/null
}

# ---------- start ----------
[ -t 1 ] && [ -n "${TERM:-}" ] && command -v clear >/dev/null 2>&1 && clear || true
printf "%s\n" "${C_BOLD}Convision Infra Report — entorno: ${ENVIRONMENT}${C_RESET}"
printf "%s\n" "${C_DIM}$(date '+%Y-%m-%d %H:%M:%S %Z')${C_RESET}"

# ---------- EC2 metadata ----------
section "EC2"
EC2_JSON=$(aws_q ec2 describe-instances \
  --filters "Name=tag:Name,Values=${EC2_TAG_NAME}" "Name=instance-state-name,Values=running,stopped,pending,stopping" \
  --query 'Reservations[0].Instances[0].[InstanceId,InstanceType,State.Name,PublicIpAddress,LaunchTime,Architecture]' \
  --output text)
read -r EC2_ID EC2_TYPE EC2_STATE EC2_IP EC2_LAUNCH EC2_ARCH <<< "$EC2_JSON"
row "Instance ID"      "$EC2_ID"
row "Type / Arch"      "$EC2_TYPE / $EC2_ARCH"
row "State"            "$EC2_STATE"
row "Public IP"        "$EC2_IP"
row "Launched"         "$EC2_LAUNCH"

if [ "$EC2_STATE" != "running" ]; then
  printf "\n%s\n" "${C_YELLOW}EC2 no está running — métricas en vivo y SSH se omiten.${C_RESET}"
  SKIP_LIVE=1
else
  SKIP_LIVE=0
fi

# ---------- EC2 CloudWatch (CPU + Network) ----------
section "EC2 · CloudWatch (últimas ventanas)"

for win in "1h:3600" "24h:86400" "7d:604800"; do
  label=${win%:*}
  secs=${win#*:}
  cpu=$(cw_stat AWS/EC2 CPUUtilization InstanceId "$EC2_ID" "$secs")
  cpu_avg=$(echo "$cpu" | awk '{printf "%.1f", $1}')
  cpu_max=$(echo "$cpu" | awk '{printf "%.1f", $2}')
  netin=$(cw_stat AWS/EC2 NetworkIn InstanceId "$EC2_ID" "$secs" | awk '{printf "%.2f", $2/1024/1024}')
  netout=$(cw_stat AWS/EC2 NetworkOut InstanceId "$EC2_ID" "$secs" | awk '{printf "%.2f", $2/1024/1024}')
  printf "  %-10s CPU avg=%s  CPU max=%s  Net in/out (max MB/period): %s / %s\n" \
    "[$label]" "$(colorize_pct "$cpu_avg" 50 75)" "$(colorize_pct "$cpu_max" 70 90)" "$netin" "$netout"
done

# ---------- Live SSH metrics ----------
if [ "$SKIP_LIVE" -eq 0 ] && [ -n "$EC2_IP" ] && [ "$EC2_IP" != "None" ]; then
  section "EC2 · En vivo (SSH)"
  SSH_CMD="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -o IdentitiesOnly=yes -i $SSH_KEY ec2-user@$EC2_IP"
  REMOTE=$(cat <<'EOF'
echo "===UPTIME==="
uptime
echo "===MEM_KB==="
awk '/MemTotal:/ {t=$2} /MemAvailable:/ {a=$2} END {printf "%d %d\n", t, a}' /proc/meminfo
echo "===DISK==="
df -B1 --output=source,size,used,avail,pcent,target / 2>/dev/null | tail -n +2
echo "===DOCKER==="
sudo docker ps --format '{{.Names}}|{{.Status}}' 2>/dev/null
echo "===DOCKER_STATS==="
sudo docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}' 2>/dev/null
echo "===NGINX_TODAY==="
DATE=$(date '+%d/%b/%Y')
if [ -r /var/log/nginx/access.log ]; then
  sudo grep -c "$DATE" /var/log/nginx/access.log || echo 0
else
  echo "0"
fi
echo "===NGINX_TOP_PATHS==="
if [ -r /var/log/nginx/access.log ]; then
  sudo awk -v d="$DATE" 'index($0,d){ for(i=1;i<=NF;i++) if($i ~ /^"(GET|POST|PUT|DELETE|PATCH|OPTIONS)$/){print $(i+1); break}}' /var/log/nginx/access.log \
    | sort | uniq -c | sort -rn | head -5
fi
echo "===NGINX_5XX_TODAY==="
if [ -r /var/log/nginx/access.log ]; then
  sudo awk -v d="$DATE" 'index($0,d){ for(i=1;i<=NF;i++) if($i ~ /^"(GET|POST|PUT|DELETE|PATCH|OPTIONS)$/){print $(i+3); break}}' /var/log/nginx/access.log \
    | awk '$1 ~ /^5/' | wc -l
fi
EOF
  )
  REMOTE_OUT=$($SSH_CMD "$REMOTE" 2>/dev/null || echo "===SSH_FAILED===")

  if echo "$REMOTE_OUT" | grep -q SSH_FAILED; then
    printf "  ${C_RED}SSH falló — verifica $SSH_KEY o el Security Group.${C_RESET}\n"
  else
    UPTIME=$(echo "$REMOTE_OUT" | sed -n '/===UPTIME===/,/===MEM_KB===/p' | sed '1d;$d' | head -1)
    MEM=$(echo "$REMOTE_OUT" | sed -n '/===MEM_KB===/,/===DISK===/p' | sed '1d;$d' | head -1)
    DISK=$(echo "$REMOTE_OUT" | sed -n '/===DISK===/,/===DOCKER===/p' | sed '1d;$d')
    DOCKER_PS=$(echo "$REMOTE_OUT" | sed -n '/===DOCKER===/,/===DOCKER_STATS===/p' | sed '1d;$d')
    DOCKER_STATS=$(echo "$REMOTE_OUT" | sed -n '/===DOCKER_STATS===/,/===NGINX_TODAY===/p' | sed '1d;$d')
    NGINX_REQS=$(echo "$REMOTE_OUT" | sed -n '/===NGINX_TODAY===/,/===NGINX_TOP_PATHS===/p' | sed '1d;$d' | head -1)
    NGINX_TOP=$(echo "$REMOTE_OUT" | sed -n '/===NGINX_TOP_PATHS===/,/===NGINX_5XX_TODAY===/p' | sed '1d;$d')
    NGINX_5XX=$(echo "$REMOTE_OUT" | sed -n '/===NGINX_5XX_TODAY===/,$p' | sed '1d' | head -1)

    row "Uptime / load" "$UPTIME"

    if [ -n "$MEM" ]; then
      MEM_TOTAL_KB=$(echo "$MEM" | awk '{print $1}')
      MEM_AVAIL_KB=$(echo "$MEM" | awk '{print $2}')
      MEM_USED_KB=$((MEM_TOTAL_KB - MEM_AVAIL_KB))
      MEM_PCT=$(awk -v u=$MEM_USED_KB -v t=$MEM_TOTAL_KB 'BEGIN{printf "%.1f", (u/t)*100}')
      MEM_TOTAL_MB=$((MEM_TOTAL_KB/1024))
      MEM_USED_MB=$((MEM_USED_KB/1024))
      row "Memoria" "$(colorize_pct "$MEM_PCT" 70 85)  (${MEM_USED_MB} / ${MEM_TOTAL_MB} MiB)"
    fi

    if [ -n "$DISK" ]; then
      DISK_PCT=$(echo "$DISK" | awk '{print $5}' | tr -d '%')
      DISK_USED=$(echo "$DISK" | awk '{printf "%.1f", $3/1024/1024/1024}')
      DISK_TOT=$(echo "$DISK" | awk '{printf "%.1f", $2/1024/1024/1024}')
      row "Disco /" "$(colorize_pct "$DISK_PCT" 70 85)  (${DISK_USED} / ${DISK_TOT} GiB)"
    fi

    printf "  %-30s\n" "Contenedores activos"
    echo "$DOCKER_PS" | while IFS='|' read -r name status; do
      [ -z "$name" ] && continue
      printf "    %-22s %s\n" "$name" "$status"
    done

    printf "\n  %-30s\n" "docker stats (convision-api)"
    echo "$DOCKER_STATS" | while IFS='|' read -r n cpu mem mempct net blk; do
      [ -z "$n" ] && continue
      cpu_n=$(echo "$cpu" | tr -d '%')
      mempct_n=$(echo "$mempct" | tr -d '%')
      printf "    %-15s CPU=%s  Mem=%s  Mem%%=%s  Net=%s  BlockIO=%s\n" \
        "$n" "$(colorize_pct "$cpu_n" 60 80)" "$mem" "$(colorize_pct "$mempct_n" 70 85)" "$net" "$blk"
    done

    printf "\n  %-30s %s\n" "Requests hoy (nginx)" "$NGINX_REQS"
    printf "  %-30s %s\n" "Respuestas 5xx hoy" "${NGINX_5XX:-0}"
    if [ -n "$NGINX_TOP" ]; then
      printf "  Top 5 paths del día:\n"
      echo "$NGINX_TOP" | sed 's/^/    /'
    fi
  fi
fi

# ---------- RDS ----------
section "RDS"
RDS_JSON=$(aws_q rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass,Engine,EngineVersion,AllocatedStorage,MultiAZ]' \
  --output text 2>/dev/null || true)
read -r RDS_STATE RDS_CLASS RDS_ENGINE RDS_VER RDS_STORAGE RDS_MULTIAZ <<< "$RDS_JSON"
row "Identifier"  "$RDS_ID"
row "Status"      "$RDS_STATE"
row "Class"       "$RDS_CLASS"
row "Engine"      "$RDS_ENGINE $RDS_VER"
row "Storage"     "${RDS_STORAGE} GiB · Multi-AZ=${RDS_MULTIAZ}"

if [ "$RDS_STATE" != "available" ]; then
  printf "\n%s\n" "${C_YELLOW}RDS no está available — métricas CloudWatch se omiten.${C_RESET}"
else
  section "RDS · CloudWatch (últimas ventanas)"
  for win in "1h:3600" "24h:86400" "7d:604800"; do
    label=${win%:*}
    secs=${win#*:}
    cpu=$(cw_stat AWS/RDS CPUUtilization DBInstanceIdentifier "$RDS_ID" "$secs")
    cpu_avg=$(echo "$cpu" | awk '{printf "%.1f", $1}')
    cpu_max=$(echo "$cpu" | awk '{printf "%.1f", $2}')
    conns=$(cw_stat AWS/RDS DatabaseConnections DBInstanceIdentifier "$RDS_ID" "$secs")
    conns_avg=$(echo "$conns" | awk '{printf "%.0f", $1}')
    conns_max=$(echo "$conns" | awk '{printf "%.0f", $2}')
    printf "  %-10s CPU avg=%s  CPU max=%s  Conns avg=%s  Conns max=%s\n" \
      "[$label]" "$(colorize_pct "$cpu_avg" 50 75)" "$(colorize_pct "$cpu_max" 70 90)" "$conns_avg" "$conns_max"
  done

  freemem=$(cw_stat AWS/RDS FreeableMemory DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.0f", $1/1024/1024}')
  freestorage=$(cw_stat AWS/RDS FreeStorageSpace DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.2f", $1/1024/1024/1024}')
  readiops=$(cw_stat AWS/RDS ReadIOPS DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.1f", $2}')
  writeiops=$(cw_stat AWS/RDS WriteIOPS DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.1f", $2}')
  readlat=$(cw_stat AWS/RDS ReadLatency DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.2f", $2*1000}')
  writelat=$(cw_stat AWS/RDS WriteLatency DBInstanceIdentifier "$RDS_ID" 3600 | awk '{printf "%.2f", $2*1000}')

  # Memory thresholds for t4g.micro: 1 GiB total. 200 MiB is comfortable, <100 MiB alarm.
  if [ -n "$freemem" ] && [ "$freemem" != "0" ]; then
    if [ "$freemem" -lt 100 ]; then mem_col="${C_RED}"
    elif [ "$freemem" -lt 200 ]; then mem_col="${C_YELLOW}"
    else mem_col="${C_GREEN}"
    fi
    row "Memoria libre (avg 1h)" "${mem_col}${freemem} MiB${C_RESET}"
  fi
  row "Storage libre (avg 1h)" "${freestorage} GiB"
  row "IOPS máx 1h (read/write)" "$readiops / $writeiops"
  row "Latencia máx 1h (read/write)" "${readlat} ms / ${writelat} ms"
fi

# ---------- recommendations ----------
section "Lectura rápida"

echo "Umbrales de referencia para escalar:"
echo "  EC2 CPU avg sostenido >50% en 24h → migrar de t4g.small a t4g.medium"
echo "  EC2 Memoria >85% sostenido        → t4g.medium (2 GiB) o t4g.large"
echo "  Disco / >80%                       → expandir volumen gp3 (sin downtime)"
echo "  RDS CPU avg >50% en 24h           → db.t4g.small (2x vCPU, 2 GiB)"
echo "  RDS FreeableMemory <100 MiB        → db.t4g.small ya"
echo "  RDS connections max >40            → revisar pool en Go (SetMaxOpenConns)"
echo "  RDS FreeStorageSpace <2 GiB        → ampliar AllocatedStorage"

printf "\n%s\n" "${C_DIM}Tip: corre 'bash infra-report.sh dev' diariamente o agrégalo a cron.${C_RESET}"

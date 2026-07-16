#!/usr/bin/env bash
set -euo pipefail

PROFILE="${AWS_PROFILE:-convision-admin}"
REGION="us-east-1"
PROJECT="convision"
ENVIRONMENT="${1:-dev}"
ACTION="${2:-status}"

EC2_TAG_NAME="${PROJECT}-${ENVIRONMENT}-api"
RDS_ID="${PROJECT}-${ENVIRONMENT}-db"

get_ec2_id() {
  aws ec2 describe-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=${EC2_TAG_NAME}" "Name=instance-state-name,Values=running,stopped,stopping,pending" \
    --query "Reservations[0].Instances[0].InstanceId" \
    --output text 2>/dev/null
}

get_ec2_state() {
  aws ec2 describe-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=${EC2_TAG_NAME}" \
    --query "Reservations[0].Instances[0].State.Name" \
    --output text 2>/dev/null
}

get_rds_state() {
  aws rds describe-db-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --db-instance-identifier "$RDS_ID" \
    --query "DBInstances[0].DBInstanceStatus" \
    --output text 2>/dev/null
}

print_status() {
  local ec2_state rds_state ec2_ip
  ec2_state=$(get_ec2_state)
  rds_state=$(get_rds_state)
  ec2_ip=$(aws ec2 describe-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --filters "Name=tag:Name,Values=${EC2_TAG_NAME}" \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text 2>/dev/null)

  echo ""
  echo "  Entorno   : ${ENVIRONMENT}"
  echo "  EC2       : ${ec2_state}  ${ec2_ip}"
  echo "  RDS       : ${rds_state}"
  echo ""
}

start_infra() {
  local ec2_id
  ec2_id=$(get_ec2_id)

  echo "[+] Encendiendo RDS ${RDS_ID}..."
  aws rds start-db-instance \
    --profile "$PROFILE" \
    --region "$REGION" \
    --db-instance-identifier "$RDS_ID" \
    --output text --query "DBInstance.DBInstanceStatus" 2>/dev/null || echo "    RDS ya estaba encendida o en proceso."

  echo "[+] Encendiendo EC2 ${ec2_id}..."
  aws ec2 start-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --instance-ids "$ec2_id" \
    --output text --query "StartingInstances[0].CurrentState.Name" 2>/dev/null || echo "    EC2 ya estaba encendida o en proceso."

  echo ""
  echo "Esperando que EC2 esté running..."
  aws ec2 wait instance-running \
    --profile "$PROFILE" \
    --region "$REGION" \
    --instance-ids "$ec2_id"

  print_status
  echo "Infraestructura encendida."
}

stop_infra() {
  local ec2_id
  ec2_id=$(get_ec2_id)

  echo "[-] Apagando EC2 ${ec2_id}..."
  aws ec2 stop-instances \
    --profile "$PROFILE" \
    --region "$REGION" \
    --instance-ids "$ec2_id" \
    --output text --query "StoppingInstances[0].CurrentState.Name" 2>/dev/null || echo "    EC2 ya estaba apagada o en proceso."

  echo "[-] Apagando RDS ${RDS_ID}..."
  aws rds stop-db-instance \
    --profile "$PROFILE" \
    --region "$REGION" \
    --db-instance-identifier "$RDS_ID" \
    --output text --query "DBInstance.DBInstanceStatus" 2>/dev/null || echo "    RDS ya estaba apagada o en proceso."

  echo ""
  echo "Infraestructura apagada. (RDS tarda ~2 min en detenerse completamente)"
}

case "$ACTION" in
  start)   start_infra ;;
  stop)    stop_infra ;;
  status)  print_status ;;
  *)
    echo "Uso: $0 [entorno] [start|stop|status]"
    echo ""
    echo "  Ejemplos:"
    echo "    $0 dev start"
    echo "    $0 dev stop"
    echo "    $0 dev status"
    echo ""
    echo "  Variables de entorno:"
    echo "    AWS_PROFILE  (default: convision-admin)"
    exit 1
    ;;
esac

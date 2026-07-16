# Convision — Infraestructura AWS

## Resumen ejecutivo

Convision corre en un **stack AWS optimizado en costos** en la región **`us-east-1`**, cuenta **`649629927448`**, aprovisionado con **Terraform** en `terraform/`. El entorno desplegado usa el nombre **`dev`** (recursos con prefijo `convision-dev-*`), dominio **`opticaconvision.com`**, acceso via **IAM Identity Center SSO** con perfil **`convision-admin`**.

**Patrón de arquitectura:** React SPA → CloudFront → S3; Go API → EC2 (nginx + Docker) → RDS PostgreSQL; uploads vía S3 presigned URLs; secretos en SSM Parameter Store; imágenes en ECR; apagado/encendido automático de EC2 y RDS con EventBridge Scheduler.

---

## Identificadores del entorno desplegado

| Item | Valor |
|---|---|
| AWS Account ID | `649629927448` |
| Región | `us-east-1` |
| SSO URL | `https://d-90660dc2e5.awsapps.com/start` |
| Perfil CLI | `convision-admin` (AdministratorAccess) |
| Ambiente | `dev` |
| Dominio raíz | `opticaconvision.com` |
| URL frontend | `https://app.opticaconvision.com` |
| URL API | `https://api.opticaconvision.com` |
| IP elástica EC2 | `3.213.51.178` |
| Endpoint RDS | `convision-dev-db.czrlj7pszo4t.us-east-1.rds.amazonaws.com` |
| CloudFront Distribution ID | `EPTJUWJZVGVW` |
| CloudFront domain | `di4rurkxvzkhm.cloudfront.net` |
| Bucket frontend | `convision-dev-frontend` |
| Bucket uploads | `convision-dev-uploads` |
| ECR repo | `649629927448.dkr.ecr.us-east-1.amazonaws.com/convision/api` |

---

## Topología de red

```
Internet
  ├─ app.opticaconvision.com (CNAME → CloudFront)
  │      └─ CloudFront EPTJUWJZVGVW (OAC)
  │               └─ S3 convision-dev-frontend  (React SPA)
  │
  └─ api.opticaconvision.com (A → EIP 3.213.51.178)
         └─ EC2 t4g.micro (Amazon Linux 2023 ARM64)
                  ├─ nginx :443 (Let's Encrypt) → Docker :8001
                  └─ Docker convision-api
                           └─ RDS PostgreSQL 16 (private, SG-restringido)
                                    db.t4g.micro · 20 GB gp3
```

### Red VPC

| Componente | Valor |
|---|---|
| VPC CIDR | `10.0.0.0/16` |
| Subnet pública A | `10.0.1.0/24` (us-east-1a — EC2) |
| Subnet pública B | `10.0.2.0/24` (us-east-1b — subnet group RDS) |
| Internet Gateway | sí |
| NAT Gateway | **no** (ahorro ~$32/mes) |
| Load Balancer | **no** (nginx en EC2 termina SSL, ahorro ~$18/mes) |

### Security Groups

| SG | Inbound | Outbound |
|---|---|---|
| EC2 | SSH:22 de `ssh_allowed_cidrs`, HTTP:80 y HTTPS:443 de `0.0.0.0/0` | todo |
| RDS | PostgreSQL:5432 solo desde SG del EC2 | todo |

---

## Módulos Terraform

La estructura en `terraform/main.tf` instancia los siguientes módulos:

```
terraform/main.tf
├── module ecr           → Registro Docker de imágenes
├── module observability → Grupos de logs CloudWatch
├── module networking    → VPC, subnets, IGW, Security Groups
├── module storage       → S3 frontend + S3 uploads
├── module database      → RDS PostgreSQL 16
├── module secrets       → SSM Parameter Store
├── aws_acm_certificate  → Certificado SSL para app.* (CloudFront)
├── module cdn           → CloudFront + OAC + bucket policy
├── module scheduler     → EventBridge Scheduler (start/stop EC2 y RDS)
└── module compute       → EC2, EIP, IAM, user_data
```

> **Módulo no conectado:** `terraform/modules/dns/` (Route 53) existe en el código pero **no está referenciado** en `main.tf` — el DNS se gestiona externamente (GoDaddy/Hostinger).

---

## Detalle por servicio

### Compute — EC2

- **AMI:** Amazon Linux 2023 ARM64
- **Tipo:** `t4g.micro` (configurable por variable)
- **Disco:** 20 GB gp3 (root)
- **Protección:** `prevent_destroy = true`, `disable_api_termination = true`
- **Elastic IP:** fija, asociada al arranque
- **IAM Role** con permisos de:
  - Lectura de SSM (`/convision/{env}/*`)
  - Acceso a bucket S3 de uploads
  - Pull de imágenes ECR
  - CloudWatch Agent

**Provisioning (user_data):**

Al crear la instancia el script `user_data.sh.tpl` instala automáticamente:
1. Docker
2. nginx + certbot (Let's Encrypt)
3. AWS CLI
4. CloudWatch Agent (configurado para enviar logs de nginx)
5. Systemd service `convision-api.service`

**Script de arranque del contenedor (`start-api.sh.tpl`):**
1. Lee credenciales de DB y JWT desde SSM Parameter Store
2. Hace pull de la imagen ECR
3. Corre el contenedor `convision-api` en el puerto `8001` con las variables de entorno de producción

**nginx** actúa como reverse proxy SSL:
- Puerto 443 (HTTPS, Let's Encrypt) → `127.0.0.1:8001`
- Puerto 80 redirige a 443

---

### Database — RDS

| Parámetro | Valor |
|---|---|
| Motor | PostgreSQL 16 |
| Clase | `db.t4g.micro` |
| Almacenamiento | 20 GB gp3 |
| Cifrado | sí (at rest) |
| Acceso público | **no** — solo desde SG del EC2 |
| Alta disponibilidad | Single-AZ (sin Multi-AZ) |
| Backup automático | 7 días de retención |
| Delete protection | sí |
| Export logs CloudWatch | postgresql |

El usuario de la aplicación es `convision_app` (no superuser). La contraseña se guarda en SSM SecureString.

---

### Frontend — S3 + CloudFront

**S3 bucket `convision-dev-frontend`:**
- Versionado habilitado
- Cifrado AES256
- Acceso público bloqueado (solo CloudFront via OAC puede leer)

**CloudFront Distribution:**
- OAC (Origin Access Control) — reemplaza OAI heredado
- HTTPS enforced (redirect HTTP → HTTPS)
- SPA support: errores 403/404 → `/index.html` (React Router)
- `PriceClass_100` (US + Europa, menor costo)
- Aliases: `app.opticaconvision.com` y `*.app.opticaconvision.com`
- Certificado ACM emitido en `us-east-1` (requerido para CloudFront)

**Cache:**
- Assets estáticos (JS, CSS, imágenes): cache de largo plazo con hash en nombre de archivo
- `index.html`: `no-cache` (siempre fresco)

---

### Uploads — S3

**Bucket `convision-dev-uploads`:**
- Cifrado AES256
- CORS habilitado para GET/PUT/POST (frontend hace uploads directos vía presigned URLs)
- Lifecycle: archivos pasan a `STANDARD_IA` a los 90 días

---

### Container Registry — ECR

- Repositorio: `convision/api`
- Scan on push habilitado
- Lifecycle policy: conserva solo las **últimas 5 imágenes** (control de costos)
- Arquitectura de imagen: `linux/arm64` (compatible con t4g)

---

### Secretos — SSM Parameter Store

Parámetros bajo el path `/{project}/{environment}/`:

| Parámetro | Tipo | Contenido |
|---|---|---|
| `db_host` | String | Endpoint RDS |
| `db_name` | String | Nombre de la base |
| `db_username` | String | Usuario de la app |
| `db_password` | SecureString | Contraseña DB |
| `jwt_secret` | SecureString | Secreto JWT |

La instancia EC2 los lee en arranque via IAM Role (sin hardcodear credenciales en la imagen Docker).

---

### Observabilidad — CloudWatch

**Grupos de logs:**

| Log group | Retención | Contenido |
|---|---|---|
| `/convision/dev/api` | 5 días | stdout/stderr del contenedor Go |
| `/nginx` | 5 días | access.log y error.log de nginx |
| RDS postgresql log group | configurado por RDS | Logs de PostgreSQL |

El **CloudWatch Agent** en EC2 captura los logs de nginx y los envía al grupo correspondiente.

---

### Scheduler — EventBridge

Para reducir costos fuera del horario laboral, EventBridge **apaga y enciende automáticamente** la EC2 y la RDS:

| Evento | Cron (America/Bogota) | Acción |
|---|---|---|
| Encendido | `0 6 ? * MON-SAT *` | Start EC2 + Start RDS |
| Apagado | `0 19 ? * MON-SAT *` | Stop EC2 + Stop RDS |

IAM role del scheduler tiene permisos de `ec2:StartInstances`, `ec2:StopInstances`, `rds:startDBInstance`, `rds:stopDBInstance`.

> Ahorro estimado: ~55% del costo vs. infraestructura siempre encendida.

---

## CI/CD y despliegue

### Método preferido — Script local con SSO

```bash
# Autenticarse (una vez por sesión)
aws sso login --profile convision-admin

# Desplegar todo
bash deploy.sh dev all

# Solo backend
bash deploy.sh dev backend

# Solo frontend
bash deploy.sh dev frontend
```

**Flujo backend (`deploy.sh`):**

1. Resolve IP de EC2 por tag `convision-dev-api`
2. Build imagen Docker `linux/arm64`
3. Push a ECR
4. SCP del script `start-api.sh` a la EC2
5. SSH → restart del contenedor
6. Health check en `:8001/health`

**Flujo frontend (`deploy.sh`):**

1. Resolve nombre de bucket S3 y ID de CloudFront por tags
2. `npm ci && npm run build` con `VITE_API_URL=https://api.opticaconvision.com`
3. `aws s3 sync` al bucket (assets con cache largo, `index.html` sin cache)
4. Invalidación de CloudFront `/*`

### Método alternativo — GitHub Actions

Los workflows en `convision-api-golang/.github/workflows/deploy.yml` y `convision-front/.github/workflows/deploy.yml` permiten trigger manual (`workflow_dispatch`). Usan secrets de GitHub para las credenciales AWS.

---

## Docker

**Imagen de producción (`convision-api-golang/docker/Dockerfile`):**
- Multi-stage: Go 1.24 Alpine build → Alpine 3.19 runtime
- Expone puerto `8001`
- Arquitectura: `linux/arm64`

**Stack local de desarrollo (`convision-api-golang/docker/docker-compose.yml`):**
- PostgreSQL 16 + pgAdmin
- API Go en puerto `8001`

**Servicio de facturación separado (`convision-invoicing-api/docker-compose.yml`):**
- Servicio independiente solo para desarrollo local, puerto `8002`

---

## Gestión operativa

### Comandos de infra

```bash
# Estado de EC2 y RDS
bash infra.sh dev status

# Encender manualmente (si el scheduler lo apagó)
bash infra.sh dev start

# Apagar manualmente
bash infra.sh dev stop

# Dashboard operativo (métricas CloudWatch + stats SSH)
bash infra-report.sh dev

# Health check de la API
curl -sf https://api.opticaconvision.com/health
```

### Terraform

```bash
cd terraform/

# Inicializar
terraform init

# Ver plan de cambios
terraform plan -var-file="terraform.tfvars"

# Aplicar
terraform apply -var-file="terraform.tfvars"
```

**Variables sensibles** (no en el repo):
- `db_password`
- `jwt_secret`
- `ssh_public_key`

Se configuran en `terraform.tfvars` (gitignored) o como variables de entorno `TF_VAR_*`.

---

## DNS y certificados

El DNS **no es gestionado por Terraform** (el módulo `dns/` existe pero no está conectado). La configuración se hace manualmente:

| Registro | Tipo | Apunta a |
|---|---|---|
| `app.opticaconvision.com` | CNAME | `di4rurkxvzkhm.cloudfront.net` |
| `api.opticaconvision.com` | A | `3.213.51.178` |
| Validación ACM | CNAME | Generado por `terraform output acm_cert_validation_records` |

El certificado SSL de CloudFront es de **ACM** (us-east-1). El certificado de la API en EC2 es de **Let's Encrypt** (via certbot, auto-renovación).

---

## Decisiones de diseño y ahorro de costos

| Decisión | Ahorro estimado/mes |
|---|---|
| Sin ALB — nginx en EC2 termina SSL | ~$18 |
| Sin NAT Gateway — subnets públicas con SG | ~$32 |
| Single-AZ RDS (sin Multi-AZ) | ~50% del costo RDS |
| Instancias ARM (t4g) vs x86 (t2/t3) | ~20% |
| EventBridge stop/start (horario laboral) | ~55% EC2+RDS |
| CloudFront PriceClass_100 | vs PriceClass_All |
| ECR lifecycle 5 imágenes | control de almacenamiento |

**Costo estimado total:** ~$19–20/mes (con scheduler activo, horario laboral Mon–Sat).

---

## Referencia de archivos

| Archivo | Propósito |
|---|---|
| `terraform/main.tf` | Raíz — instancia todos los módulos |
| `terraform/variables.tf` | Definición de variables |
| `terraform/outputs.tf` | Outputs (IP, CF domain, bucket, etc.) |
| `terraform/modules/networking/` | VPC, subnets, IGW, SGs |
| `terraform/modules/compute/` | EC2, EIP, IAM, user_data, nginx, Docker |
| `terraform/modules/database/` | RDS PostgreSQL |
| `terraform/modules/storage/` | S3 frontend + uploads |
| `terraform/modules/cdn/` | CloudFront + OAC |
| `terraform/modules/ecr/` | ECR registry |
| `terraform/modules/secrets/` | SSM Parameter Store |
| `terraform/modules/scheduler/` | EventBridge start/stop |
| `terraform/modules/observability/` | CloudWatch log groups |
| `terraform/modules/dns/` | Route 53 (no conectado — DNS externo) |
| `deploy.sh` | Script principal de despliegue (backend + frontend) |
| `infra.sh` | Start/stop manual de EC2 y RDS |
| `infra-report.sh` | Dashboard operativo |
| `docs/AWS_SSO_ACCESS.md` | Guía de configuración SSO |
| `convision-api-golang/docker/Dockerfile` | Imagen de producción Go API |

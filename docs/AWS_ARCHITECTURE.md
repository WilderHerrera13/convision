# Convision — Arquitectura AWS Austera

**Acceso con IAM Identity Center (SSO), Cursor y Claude Code:** ver [`AWS_SSO_ACCESS.md`](AWS_SSO_ACCESS.md).

> **Perfil de carga:** ~5 usuarios activos/día · Picos esporádicos de hasta 20 req/min  
> **Stack:** Go 1.24 API (Docker) + React 18 SPA (estático) + PostgreSQL 16  
> **Objetivo de costo:** < $25 USD/mes en régimen normal

---

## Decisiones de diseño clave

| Decisión | Motivo |
|---|---|
| Sin Load Balancer (ALB/NLB) | Ahorro de ~$18/mes; Nginx en EC2 maneja SSL termination |
| Sin NAT Gateway | Ahorro de ~$32/mes; subnets públicas con Security Groups estrictos |
| Sin Multi-AZ en RDS | Ahorro de ~$12/mes; Single-AZ suficiente para 5 usuarios |
| EC2 ARM (t4g) | 20% más barato que x86 (t3) con igual rendimiento |
| RDS en lugar de PG en EC2 | Backups automáticos, snapshots, PITR sin esfuerzo operativo |
| S3 + CloudFront para frontend | Costo casi cero, CDN global, sin servidor que mantener |
| ACM para SSL | Certificado TLS gratuito; renovación automática |

---

## Diagrama de componentes

```
Internet
    │
    ├──── CloudFront (CDN) ────► S3 (React SPA)
    │         │ HTTPS
    │         └── cache assets estáticos (js/css/img)
    │
    └──── Route 53 (DNS)
              │
              ├── convision.app → CloudFront
              │
              └── api.convision.app → EC2 (Elastic IP)
                          │
                     ┌────▼────────────────────────────────┐
                     │  EC2 t4g.micro  (Amazon Linux 2023)  │
                     │                                       │
                     │  ┌─────────┐    ┌─────────────────┐  │
                     │  │  Nginx  │───►│  Go API :8001   │  │
                     │  │  :443   │    │  (Docker)       │  │
                     │  └─────────┘    └────────┬────────┘  │
                     │                          │            │
                     └──────────────────────────┼────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │  RDS PostgreSQL 16     │
                                    │  db.t4g.micro          │
                                    │  Single-AZ · 20 GB gp3 │
                                    └───────────────────────┘

                     ┌─────────────────────────────────────┐
                     │  S3 (uploads bucket)                 │
                     │  Acceso via presigned URLs           │
                     └─────────────────────────────────────┘

                     ┌─────────────────────────────────────┐
                     │  SSM Parameter Store                 │
                     │  JWT_SECRET · DB_PASSWORD · etc.     │
                     └─────────────────────────────────────┘
```

---

## Componentes detallados

### 1. Red — VPC

| Recurso | Configuración |
|---|---|
| VPC | `10.0.0.0/16` · 1 región (ej: `us-east-1`) |
| Public Subnet A | `10.0.1.0/24` · AZ `us-east-1a` |
| Internet Gateway | Attached a la VPC |
| Route Table | `0.0.0.0/0` → Internet Gateway |

> **Sin private subnets ni NAT Gateway.** RDS se pone en la misma subnet pública pero protegido por Security Group que solo acepta conexiones desde la EC2.

---

### 2. EC2 — Go API Server

| Atributo | Valor |
|---|---|
| Tipo | `t4g.micro` (ARM64, 1 vCPU, 1 GB RAM) |
| AMI | Amazon Linux 2023 ARM64 |
| Almacenamiento | 20 GB gp3 (root) |
| Elastic IP | 1 EIP estática asociada |
| IAM Role | Acceso a SSM Parameter Store + S3 uploads bucket |

**Software instalado:**
- Docker Engine (corre el contenedor Go API)
- Nginx (reverse proxy + SSL termination con cert de ACM/certbot)

**Flujo de despliegue:**
```
GitHub Actions (CI) 
  → build docker image
  → push a ECR (o Docker Hub)
  → SSH al EC2 + docker pull + docker restart
```

**Security Group EC2:**
| Tipo | Puerto | Origen |
|---|---|---|
| Inbound | 22 (SSH) | Tu IP fija / VPN |
| Inbound | 80 (HTTP) | 0.0.0.0/0 (redirect a 443) |
| Inbound | 443 (HTTPS) | 0.0.0.0/0 |
| Outbound | All | 0.0.0.0/0 |

---

### 3. RDS — PostgreSQL 16

| Atributo | Valor |
|---|---|
| Tipo | `db.t4g.micro` (ARM64, 2 vCPU, 1 GB RAM) |
| Motor | PostgreSQL 16 |
| Almacenamiento | 20 GB gp3 (expandible) |
| Multi-AZ | **No** (Single-AZ para ahorrar) |
| Backups automáticos | Sí — retención 7 días |
| Snapshots manuales | Antes de cada deploy importante |
| Acceso público | **No** |

**Security Group RDS:**
| Tipo | Puerto | Origen |
|---|---|---|
| Inbound | 5432 | Security Group de la EC2 |

---

### 4. S3 — Frontend estático + Uploads

#### Bucket `convision-frontend`
- Hosting estático habilitado
- Acceso bloqueado al público (solo CloudFront via OAC)
- Versioning habilitado para rollbacks fáciles

#### Bucket `convision-uploads`
- Almacena archivos subidos por la app (recetas, documentos)
- Acceso vía **presigned URLs** generadas por el API Go
- Lifecycle rule: mover a S3-IA a los 90 días

---

### 5. CloudFront — CDN para frontend

| Atributo | Valor |
|---|---|
| Origin | S3 bucket frontend (OAC) |
| Precio Class | Price Class 100 (US + Europa) |
| HTTPS | Solo HTTPS (redirect HTTP) |
| Certificate | ACM (`convision.app`) |
| Default TTL | 86400s (1 día) para assets con hash |
| Error pages | 404 → `/index.html` (SPA routing) |

---

### 6. Route 53 — DNS

| Record | Tipo | Destino |
|---|---|---|
| `convision.app` | A (Alias) | CloudFront distribution |
| `www.convision.app` | CNAME | `convision.app` |
| `api.convision.app` | A | Elastic IP del EC2 |

> Si ya tienes un registrador externo (Namecheap, GoDaddy), puedes apuntar nameservers a Route 53 o simplemente crear CNAMEs desde el registrador. Hosted Zone de Route 53 cuesta $0.50/mes.

---

### 7. ACM — Certificados SSL

- `*.convision.app` wildcard certificate
- Validación DNS (Route 53)
- Renovación automática
- **Costo: $0**

---

### 8. SSM Parameter Store — Secretos

| Parámetro | Tipo |
|---|---|
| `/convision/prod/jwt_secret` | SecureString |
| `/convision/prod/db_password` | SecureString |
| `/convision/prod/db_host` | String |
| `/convision/prod/db_name` | String |
| `/convision/prod/db_user` | String |

El EC2 lee estos valores al inicio del contenedor via el IAM Role. **No hay variables de entorno hardcodeadas.**

---

### 9. ECR — Registro de imágenes Docker (opcional)

| Atributo | Valor |
|---|---|
| Repositorio | `convision/api` |
| Imágenes retenidas | 5 últimas (lifecycle policy) |
| Costo | $0 (free tier: 500 MB/mes privado) |

> Alternativa gratuita: Docker Hub con repositorio privado gratuito (1 repo).

---

## Estimación de costos mensuales

| Servicio | Tipo | Costo/mes |
|---|---|---|
| EC2 | t4g.micro (on-demand) | $6.05 |
| RDS | db.t4g.micro Single-AZ | $12.41 |
| S3 | < 5 GB frontend + uploads | $0.12 |
| CloudFront | < 10 GB tráfico | $0.09 |
| Route 53 | 1 Hosted Zone | $0.50 |
| ACM | Certificado wildcard | $0.00 |
| SSM | Parameter Store standard | $0.00 |
| ECR | < 500 MB | $0.00 |
| Elastic IP | 1 IP asociada a EC2 | $0.00 |
| **Total estimado** | | **~$19-20/mes** |

> **Free tier:** Si la cuenta AWS tiene menos de 12 meses, EC2 t2.micro y RDS db.t2.micro son gratuitos. Ahorro temporal de ~$18/mes.

---

## Opción ultra-económica (todo en 1 EC2)

Si los $20/mes son excesivos: correr PostgreSQL directamente en el mismo EC2 (`t4g.small` con 2GB RAM).

| Servicio | Tipo | Costo/mes |
|---|---|---|
| EC2 | t4g.small (1 instancia, API + PG) | $12.10 |
| S3 + CloudFront | Frontend + CDN | $0.21 |
| Route 53 | DNS | $0.50 |
| **Total** | | **~$12.80/mes** |

**Trade-offs:**
- Backups manuales de PostgreSQL (cron + S3)
- Si la EC2 falla, todo cae junto
- Más difícil de escalar en el futuro

---

## Configuración Nginx en EC2

```nginx
server {
    listen 80;
    server_name api.convision.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.convision.app;

    ssl_certificate     /etc/letsencrypt/live/api.convision.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.convision.app/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Variables de entorno del contenedor Go en producción

```bash
APP_ENV=production
APP_PORT=8001
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_DATABASE=convision
DB_USERNAME=convision_app
DB_PASSWORD=<desde SSM>
DB_SSLMODE=require
JWT_SECRET=<desde SSM>
JWT_TTL_HOURS=24
LOG_LEVEL=info
UPLOADS_BUCKET=convision-uploads
AWS_REGION=us-east-1
```

---

## Checklist pre-Terraform

- [ ] Definir nombre de dominio final
- [ ] Decidir región AWS (recomendado: `us-east-1` — más barata)
- [ ] Crear cuenta AWS con MFA habilitado
- [ ] Crear usuario IAM para Terraform (no usar root)
- [ ] Confirmar opción de despliegue: RDS separado vs PostgreSQL en EC2
- [ ] Confirmar si se usa ECR o Docker Hub para imágenes
- [ ] Decidir si Route 53 gestiona el DNS o se usa registrador externo
- [ ] Preparar `VITE_API_URL` para build del frontend apuntando a `api.convision.app`

---

## Próxima etapa — Terraform

Los módulos a crear en Terraform:

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars
└── modules/
    ├── networking/      # VPC, subnets, IGW, route tables, SGs
    ├── compute/         # EC2, EIP, IAM role, user-data script
    ├── database/        # RDS PostgreSQL
    ├── storage/         # S3 buckets (frontend + uploads)
    ├── cdn/             # CloudFront + OAC
    ├── dns/             # Route 53 hosted zone + records
    └── secrets/         # SSM Parameter Store entries
```

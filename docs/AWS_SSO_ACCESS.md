# Acceso a AWS con SSO (Cursor, Claude Code, terminal)

Guía única para repetir siempre el mismo flujo cuando trabajes con la cuenta Convision en la nube. Los agentes (Cursor, Claude Code) solo pueden ejecutar la CLI si **tú** ya iniciaste sesión en SSO en esa máquina; la autenticación interactiva del navegador la hace el humano.

---

## 1. Identidad y entorno

| Dato | Valor |
|------|--------|
| Cuenta AWS | `649629927448` |
| Región por defecto | `us-east-1` |
| URL de inicio SSO | `https://d-90660dc2e5.awsapps.com/start` |
| Perfil CLI recomendado | `convision-admin` (rol AdministratorAccess) |
| Nombre del entorno en Terraform/scripts | `dev` (recursos etiquetados `convision-dev-*`; hoy es el entorno real desplegado) |

Toda invocación de AWS CLI debe incluir **`--profile convision-admin`** y, si aplica, **`--region us-east-1`**.

---

## 2. Prerrequisitos (una vez por máquina)

1. **AWS CLI v2** instalado (`aws --version`).
2. Perfil SSO en `~/.aws/config`. Si no existe, añade un bloque como este (ajusta `sso_account_id` y `sso_role_name` si tu administrador de AWS te asignó otro rol):

```ini
[profile convision-admin]
sso_start_url = https://d-90660dc2e5.awsapps.com/start
sso_region = us-east-1
sso_account_id = 649629927448
sso_role_name = AdministratorAccess
region = us-east-1
output = json
```

3. Primera vez: `aws configure sso --profile convision-admin` y sigue el asistente, o pega el bloque anterior y ejecuta el login del apartado 3.

---

## 3. Flujo que debes repetir cada vez (sesión SSO)

Las credenciales SSO **caducan** (horas). Antes de pedir a Cursor o Claude Code que ejecuten `aws`, `deploy.sh`, etc.:

1. En una terminal **local** (la del Mac, o la terminal integrada de Cursor):

```bash
aws sso login --profile convision-admin
```

2. Se abre el navegador: inicia sesión con tu usuario corporativo/IAM Identity Center y autoriza el dispositivo.

3. Comprueba que la sesión está viva:

```bash
aws sts get-caller-identity --profile convision-admin --region us-east-1
```

Debes ver `"Account": "649629927448"` y un ARN con `assumed-role/.../tu.usuario`.

4. Opcional: exportar el perfil en esa shell para no repetir `--profile`:

```bash
export AWS_PROFILE=convision-admin
export AWS_REGION=us-east-1
```

Los agentes heredan el entorno del proyecto; si abres una **nueva** terminal en Cursor, vuelve a exportar o usa siempre `--profile convision-admin` en los comandos.

---

## 4. Uso desde Cursor

- Abre **Terminal** en el IDE (o el panel Run/Command que use el agente).
- Ejecuta tú `aws sso login --profile convision-admin` cuando el agente falle con errores de credenciales o `ExpiredToken`.
- A partir de ahí, el agente puede ejecutar, por ejemplo:
  - `aws sts get-caller-identity --profile convision-admin`
  - `bash deploy.sh dev backend` (requiere además Docker y SSH; ver `deploy.sh`).
  - `bash infra.sh dev status`

**Cursor no abre el navegador por ti:** si el login SSO expiró, el comando `aws sso login` debe lanzarlo tú desde la misma máquina donde corre el agente.

---

## 5. Uso desde Claude Code (claude.ai/code)

- Misma regla: la CLI corre en **tu** entorno (ordenador o sandbox que tú controles).
- Inicia sesión con `aws sso login --profile convision-admin` en la terminal integrada de Claude Code antes de tareas largas con AWS.
- La referencia canónica del monorepo sigue siendo **`CLAUDE.md`** (sección AWS); este archivo detalla solo el flujo SSO y el perfil.

---

## 6. Comandos frecuentes (copiar y pegar)

```bash
# Sesión
aws sso login --profile convision-admin
aws sts get-caller-identity --profile convision-admin --region us-east-1

# EC2 API (instancia con tag Name=convision-dev-api)
aws ec2 describe-instances --profile convision-admin --region us-east-1 \
  --filters "Name=tag:Name,Values=convision-dev-api" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text

# Infra programada (arranque / parada)
bash infra.sh dev status
bash infra.sh dev start

# Despliegue (desde la raíz del monorepo; requiere Docker + SSO + SSH)
bash deploy.sh dev all
```

Salud pública de la API (sin AWS CLI):

```bash
curl -sf https://api.opticaconvision.com/health
```

---

## 7. RDS, secretos y buenas prácticas

- **RDS** no es público: conexiones típicas desde **EC2** (misma VPC) o leyendo parámetros en **SSM** (`/convision/dev/...`) en la instancia. No pegues contraseñas de base de datos en chats ni las subas al repo (`aws_cred.txt` es solo local y no debe versionarse).
- En EC2, la API obtiene `DB_*` y `JWT_SECRET` vía SSM en `start-api.sh` (plantilla Terraform `terraform/modules/compute/start-api.sh.tpl`).
- Para operaciones de base de datos, suele hacerse **SSH a EC2** y `psql` o `migrate` desde allí, no RDS directo desde el portátil sin túnel.

---

## 8. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| `docs/AWS_ARCHITECTURE.md` | Diseño austero, componentes, costes |
| `deploy.sh` | Build Docker, ECR, EC2, frontend S3/CloudFront |
| `infra.sh` | Arranque/parada EC2 + RDS por horario o manual |
| `.cursor/rules/convision-aws-infra.mdc` | Tabla de recursos, DNS, nginx, checklist |

Si algo falla con **403 / ExpiredToken / Unable to locate credentials**, el primer paso es siempre: **`aws sso login --profile convision-admin`** y repetir `sts get-caller-identity`.

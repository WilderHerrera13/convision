---
phase: 16
plan: 07
status: complete
---

# 16-07 Summary — Infrastructure & Data Migration

## What was built

### Terraform (Tasks 1-2)
- `terraform/main.tf` — Added `subject_alternative_names = ["*.app.${var.root_domain}"]` to ACM cert resource
- `terraform/modules/cdn/main.tf` — Added `"*.${var.app_fqdn}"` to CloudFront aliases

### nginx (Tasks 3, 5)
- `infra/nginx/convision.conf` — Template file with:
  - Wildcard `server_name *.app.opticaconvision.com`
  - `proxy_set_header X-Forwarded-Host $host` (critical for tenant routing)
  - Apex `app.opticaconvision.com` redirects 302 → `main.app.opticaconvision.com`
  - HTTP 80 block redirects to HTTPS

### Data Migration (Task 4)
- `db/migrations/platform/000022_data_migration_main_tenant.up.sql`
  - Creates `optica_main` schema
  - Moves all `public` tables and sequences to `optica_main` (dynamic loop)
  - Inserts `main` tenant row into `platform.opticas`
  - Seeds 12 feature flags for optica_id = 1 (all enabled)
  - Inserts `superadmin@convision.com` with bcrypt hash for "password"
  - Uses `ON CONFLICT DO NOTHING` for idempotency
- `db/migrations/platform/000022_data_migration_main_tenant.down.sql` — reverses schema moves, deletes platform rows

### Smoke Tests (Task 6)
- `scripts/smoke-test-tenant.sh` — 7 tests: health, tenant login, /me, super admin login, list opticas, cross-tenant rejection (403), apex redirect (302)

### Runbook (Task 7)
- `.planning/phases/16-multi-tenancy-super-admin/16-07-RUNBOOK.md`

## Deviations

- Migration number is `000022` (not `000021` as in plan) — `000021_platform_schema` already existed.
- nginx config is stored as template in `infra/nginx/` (not modified in-place on EC2) — applied via runbook.
- ACM cert validation CNAME records must be manually added to GoDaddy DNS after `terraform apply`.

## Pending (requires human operator)

- `terraform apply` for ACM + CloudFront changes
- DNS validation CNAME records for wildcard cert
- nginx config deploy to EC2 via runbook Step 3
- Run data migration via runbook Steps 1-5
- Run smoke tests post-cutover

# Phase 16 — Multi-Tenant Cutover Runbook

## Pre-Migration Checklist

1. **RDS snapshot** — take manual snapshot before starting
   ```bash
   aws rds create-db-snapshot \
     --db-instance-identifier convision-dev-db \
     --db-snapshot-identifier convision-pre-16-migration \
     --profile convision-admin
   ```

2. **Verify wildcard DNS** — `*.app.opticaconvision.com` must resolve to the CloudFront distribution
   ```bash
   dig main.app.opticaconvision.com
   dig admin.app.opticaconvision.com
   ```

3. **Deploy new API binary** — build and push via GitHub Actions `Deploy Backend` workflow, or manually:
   ```bash
   bash deploy.sh dev
   ```

4. **Grant CREATE ON DATABASE** — required for tenant provisioning
   ```sql
   GRANT CREATE ON DATABASE convision TO convision_app;
   ```

5. **Verify ACM wildcard cert is Issued** — check AWS console or:
   ```bash
   aws acm list-certificates --profile convision-admin | jq '.CertificateSummaryList[] | select(.DomainName=="app.opticaconvision.com")'
   ```

---

## Maintenance Window Steps (execute in order)

### Step 1 — Apply platform schema migration

Copy migrations to EC2 and run:
```bash
scp -r convision-api-golang/db/migrations/platform/ ec2-user@3.213.51.178:/tmp/migrations/

ssh ec2-user@3.213.51.178
export DATABASE_URL="postgres://convision_app:<password>@convision-dev-db.czrlj7pszo4t.us-east-1.rds.amazonaws.com/convision?sslmode=require"
migrate -database "$DATABASE_URL" -path /tmp/migrations/platform up 1
```

This runs `000021_platform_schema.up.sql` — creates `platform` schema, `opticas`, `optica_features`, `super_admins` tables.

### Step 2 — Apply data migration

```bash
migrate -database "$DATABASE_URL" -path /tmp/migrations/platform up 1
```

This runs `000022_data_migration_main_tenant.up.sql` — moves `public` schema tables to `optica_main`, registers `main` tenant, seeds feature flags, creates super admin.

### Step 3 — Update nginx config

```bash
scp infra/nginx/convision.conf ec2-user@3.213.51.178:/tmp/convision.conf
ssh ec2-user@3.213.51.178 "sudo cp /tmp/convision.conf /etc/nginx/conf.d/convision.conf && sudo nginx -t && sudo nginx -s reload"
```

### Step 4 — Restart API container

```bash
ssh ec2-user@3.213.51.178 "docker restart convision-api"
```

Wait 10 seconds for container to start.

### Step 5 — Run smoke tests

```bash
bash convision-api-golang/scripts/smoke-test-tenant.sh
```

All 7 tests must pass before declaring success.

---

## Rollback Steps

If any smoke test fails, rollback in reverse order:

1. **Restore API binary** — redeploy previous image tag
2. **Reverse nginx** — restore previous `/etc/nginx/conf.d/convision.conf` from backup
3. **Reverse data migration**:
   ```bash
   migrate -database "$DATABASE_URL" -path /tmp/migrations/platform down 1
   ```
   This runs `000022_data_migration_main_tenant.down.sql` — moves `optica_main` tables back to `public`, removes platform rows.
4. **Reverse platform schema migration** (only if needed — destructive):
   ```bash
   migrate -database "$DATABASE_URL" -path /tmp/migrations/platform down 1
   ```
5. **Restore RDS snapshot** (last resort if data is corrupted)

---

## Post-Cutover Verification

- `curl -I https://main.app.opticaconvision.com` → 200
- `curl -I https://admin.app.opticaconvision.com` → 200
- Login as `admin@convision.com` on `main.app.opticaconvision.com` → goes to `/admin/dashboard`
- Login as `superadmin@convision.com` on any subdomain → goes to `/super-admin/opticas`
- `curl -I https://app.opticaconvision.com` → 302 to `https://main.app.opticaconvision.com`

# GAP-FIX — QA daily reports (2026-04-15)

Fuente: `.planning/qa/FINDINGS-2026-04-15-gsd-qa-daily-reports.md` · Regla: `convision-qa-gap-fixer`

| ID | Causa raíz | Archivos |
|----|------------|----------|
| QA-DR-001 | Comportamiento por rol (router) | Ninguno |
| QA-DR-002 | Mensajes Laravel en inglés para validación | `QuickAttentionDailyActivityReportRequest.php`, test Feature |
| QA-DR-003 | N/A | Ninguno |
| QA-DR-004 | Encoding roto en strings UI (no MCP) | `ReceptionistDashboard.tsx` |
| QA-DR-005 | Tabla sin nombre accesible explícito / `th` sin scope | `table.tsx`, `DataTable.tsx`, `EntityTable.tsx`, `DailyReports.tsx` |

Verificación: `php artisan test tests/Feature/Api/V1/DailyActivityReportQuickAttentionTest.php` (3 tests OK).

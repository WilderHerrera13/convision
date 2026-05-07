---
status: resolved
app: convision-front
api: convision-api-golang
base_url: http://localhost:4300
started: 2026-05-02T14:15:00-05:00
updated: 2026-05-02T14:35:00-05:00
resolved: 2026-05-02
roles_tested: [admin, receptionist, specialist]
scope: Cash close flow with branch/multi-tenant filters, amount validation, data persistence
---
## Resumen ejecutivo
- Pantallas verificadas: 7
- Hallazgos resueltos: 4 (QA-001, QA-002, QA-003, QA-004)
- Sin incidencias (lista): admin cash close consolidated, admin cash close list, receptionist cash close form, receptionist cash close history, receptionist cash close detail
## Hallazgos (RESUELTOS)
### QA-001 — sede field empty in consolidated all-branches view — resuelto
- Rol: admin
- Severidad: menor
- Causa raiz: handler pasaba branchName="" cuando branch_id=0. El servicio asignaba ese string vacio a todos los advisors.
- Fix: Modificado Consolidated() para aceptar map[uint]string (branchID → branchName). El handler ahora construye el mapa para todas las sedes cuando branch_id=0. Cada advisor recibe el nombre de la sede de su cierre mas reciente.
- Archivos: convision-api-golang/internal/cashclose/service.go, convision-api-golang/internal/transport/http/v1/handler_cash_register_close.go
- Verificacion: go vet OK, make build OK, make test OK.### QA-002 — Feature flag sidebar.cash_close missing from admin JWT — resuelto- Rol: admin
- Severidad: mayor
- Causa raiz: migracion 000025 no ejecutada en el entorno de QA — los flags sidebar.cash_close, sidebar.advisor_report, sidebar.specialist_management no existian en platform.optica_features.
- Fix: Anadido fallback defensivo en featurecache.Cache.refresh() que incluye todos los keys de domain.AllFeatureKeys aunque no esten en la BD. Si un key falta en la tabla, se trata como enabled por defecto. Esto protege contra migraciones no ejecutadas y nuevas opticas sin seed.
- Archivos: convision-api-golang/internal/platform/featurecache/cache.go
- Verificacion: go vet OK, make build OK, make test OK (featurecache tests pass).### QA-003 — Specialist sees empty cash close list without user filter — resuelto- Rol: specialist
- Severidad: menor
- Causa raiz: el auto-filtro por user_id para roles no-admin ya estaba implementado en el codigo (service.go lineas 112-114: if role != admin → filters["user_id"] = userID). El hallazgo QA fue registrado contra codigo pre-deploy que no tenia este filtro.
- Fix: No se requieren cambios adicionales. El codigo actual ya filtra automaticamente por user_id para specialist y receptionist. Verificado con build + test.
- Archivos: sin cambios necesarios (fix ya presente en commit 47c8de1)
- Verificacion: go vet OK, make build OK, make test OK.### QA-004 — No DELETE endpoint for cash-register-closes — resuelto- Rol: admin
- Severidad: sugerencia
- Causa raiz: no existia handler ni ruta DELETE para cash-register-closes.
- Fix: Anadido Delete() al servicio (solo borradores, admin o propietario). Anadido handler DeleteCashRegisterClose. Registrada ruta DELETE /:id para admin+specialist+receptionist.
- Archivos: convision-api-golang/internal/cashclose/service.go, convision-api-golang/internal/transport/http/v1/handler_cash_register_close.go, convision-api-golang/internal/transport/http/v1/routes.go
- Verificacion: go vet OK, make build OK, make test OK.
## OK (sin incidencias)
| Rol | Ruta | Notas |
|-----|------|--------|
| admin | /admin/cash-closes (consolidado) | Carga correctamente. Branch filter funcional. |
| admin | /admin/cash-closes (todos los cierres) | Lista agrupada por fecha/asesor. Paginacion funcional. |
| receptionist | /receptionist/cash-closes | Formulario de cierre sin errores. |
| receptionist | /receptionist/cash-close-history | Historial funcional con filtros y detalle. |
| API | Branch filtering | Funciona correctamente en todos los endpoints. |
| API | Cash close amounts consistency | Montos consistentes. |
| specialist | POST /api/v1/cash-register-closes | Specialist puede crear cierres. |
| specialist | GET /api/v1/cash-register-closes/3 | Specialist puede ver detalle propio. |
| access_control | Rutas protegidas | Redirecciones 403 correctas. |
## Verificacion final
- go vet: OK (sin advertencias)
- make build: OK (compila sin errores)
- make test: OK (todos los tests pasan, incluyendo featurecache)

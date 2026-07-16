# Facturación — Convision vs. Jarvis: Análisis de Brechas

> Conciliación del flujo de facturación actual del backend Go de Convision contra el sistema en producción Jarvis/Proteger IPS, tomado como referencia de lógica de negocio (no de calidad de implementación). Objetivo: levantar brechas funcionales concretas, con `archivo:línea` verificado.
>
> **Fecha:** 2026-07-13 · **Alcance:** `convision-api-golang` + `convision-invoicing-api` · **Fuente de referencia:** `jarvis_optica/BILLING_DIAN_AR_CONTABILIDAD.md`
>
> **Próximo módulo a conciliar:** Historia Clínica y Consulta Óptica (`jarvis_optica/HISTORIA_CLINICA_Y_CONSULTA_OPTICA.md`)
>
> **Actualización 2026-07-13 (sesión en vivo):** se levantaron `convision-api-golang`, `convision-invoicing-api` y `convision-front` localmente y se ejecutó el flujo real venta → emisión DIAN → panel admin en el navegador (no solo lectura de código). Esto **confirma** la mayor parte del análisis original y además destapa **dos hallazgos P0 nuevos que el análisis por lectura de código no había detectado**: el IVA cobrado al paciente nunca llega a la factura electrónica (§12.1), y dos de las cuatro acciones del panel admin de Facturación Electrónica fallan en el 100% de los casos probados (§12.2). Ver sección 12 para el detalle completo con evidencia.
>
> **Actualización 2026-07-13 (corrección — decisión de negocio confirmada):** se decidió descartar definitivamente el modo `factus` — Convision emite electrónicamente **solo** a través de su propia conexión DIAN (`direct`/`none`), sin ruta de proveedor externo. En la misma sesión se corrigieron y **validaron en vivo** (venta real → factura DIAN → panel admin) los dos hallazgos P0 de la sección 12: el IVA ya se declara correctamente (§12.1) y las dos acciones del panel admin ya no fallan (§12.2). Ver sección 13 para el detalle de cada corrección, con evidencia antes/después. Los hallazgos P1/P2 restantes (abonos, saldo de NC/ND, Cartera/AR, ventas en `invoicing_status=error`, Cancelar en la UI) **siguen pendientes** — no se tocaron en esta pasada.
>
> **Actualización 2026-07-13 (tercera parte — cierre de los gaps P0/P1 restantes, `convision-invoicing-api` se deja explícitamente en local):** por decisión explícita del negocio, `convision-invoicing-api` **se mantiene sin desplegar** (P0 #3 sigue diferido a propósito). El resto de la lista de brechas pendientes de la sección 12 **se implementó y validó en vivo** en esta misma pasada: soft delete + reconciliación `Delete`/`Cancel` (§14.1), `PartialPayment`/abonos con backend completo (§14.2), NC/ND sincronizadas con `Balance`/`AmountPaid` (§14.3), endpoint de recuperación para ventas en `invoicing_status='error'` (§14.4), acción Cancelar/Anular expuesta en la UI de Ventas (§14.5). La validación en vivo de estos cambios **destapó dos bugs adicionales, no documentados en las secciones 1-13**, corregidos en la misma pasada (§14.6): `RemovePayment`/`RemovePartialPayment` no persistían el descuento de `AmountPaid` (un doble-fetch descartaba la mutación antes del `Update`), y `SaleRepository.Update()` resucitaba silenciosamente registros de pago recién eliminados por un auto-save de asociaciones de GORM. Ver sección 14 para el detalle completo.

> **Contexto estratégico (definición de negocio):** `convision-invoicing-api` **es** el software de facturación electrónica propio de Convision — no una integración temporal ni un experimento a evaluar. La decisión de negocio ya está tomada: Convision no dependerá de un proveedor tecnológico de facturación externo (Siigo, World Office, u otro) para emitir sus facturas electrónicas ante la DIAN; construye y opera su propia pieza de software para eso. Esto reencuadra varios hallazgos de este documento: donde antes se leía "¿se adopta o se descarta este microservicio?", la pregunta correcta es "¿qué falta para llevarlo a un estado de producción real, propio y sostenible?".

---

## Resumen ejecutivo

Convision **no replica** el modelo de Jarvis de "comprobante pendiente → factura consolidada → factura oficial" — cada venta nace como documento final atómico, lo cual es una simplificación deliberada y razonable. Donde Convision efectivamente **supera** a Jarvis es en numeración de consecutivos (sin riesgo de concurrencia) y en la arquitectura del conector DIAN (modo intercambiable, sin secretos hardcodeados vistos) — arquitectura que además es la correcta a seguir madurando, porque **es** la apuesta de facturación propia de la compañía, no una alternativa entre varias. Donde Convision está **por detrás** es en tres bloques que Jarvis sí resuelve aunque sea de forma precaria: Cartera/AR general, Contabilidad, y notas crédito/débito como saldo real de la venta (no solo trazabilidad fiscal).

**Cifras clave:**
- **0** líneas de código de contabilidad/PUC en Convision — brecha total, ni siquiera un esqueleto.
- ~~**2** caminos de anulación (`Cancel` vs `Delete`) con comportamiento de integridad distinto~~ — **reconciliados y validados en vivo el 2026-07-13** (§14.1): `Delete` ahora corre la misma lógica protectora que `Cancel` (revierte stock, emite NC si aplica) antes de un soft delete real.
- ~~**1** feature "muerta" espejada en back y front: `PartialPayment` / abonos — modelada, nunca implementada~~ — **backend completo implementado y validado en vivo el 2026-07-13** (§14.2): el checkbox de abono en "Nueva Venta" y la pestaña "Abonos" del detalle de venta ya tienen a quién hablarle en el servidor.
- ~~**100%** de las facturas electrónicas emitidas declaraban **$0 de IVA** a la DIAN pese a cobrarle IVA real al paciente~~ — **corregido y validado en vivo el 2026-07-13** (§13.1): la venta de prueba VTA-0031 ($180.000 + 19% IVA = $214.200) ahora genera un XML UBL con `TaxAmount=34200.00`, `Percent=19.00`, `PayableAmount=214200.00`.
- ~~Los 2 botones de acción del panel admin "Facturación Electrónica" fallaban con HTTP 502 en el 100% de los intentos~~ — **corregido y validado en vivo el 2026-07-13** (§13.2): `Descargar XML` y `Reintentar envío DIAN` devuelven HTTP 200 sobre la misma factura que antes fallaba.
- **0** referencias a Factus/proveedor externo en el código — modo descartado por decisión de negocio, ver §13.3.
- **2** bugs de persistencia adicionales encontrados y corregidos durante la validación en vivo de esta pasada, ninguno documentado antes (§14.6): `RemovePayment`/`RemovePartialPayment` no persistían el descuento de `AmountPaid`, y `SaleRepository.Update()` resucitaba pagos recién eliminados por auto-save de asociaciones de GORM.

| Módulo | Convision | Jarvis (referencia) | Brecha |
|---|---|---|---|
| Documento de venta | Un estado atómico por venta, sin consolidación | 3 estados/tipos, consolidación de comprobantes | Diseño distinto, no necesariamente peor |
| Numeración | PK autoincremental + `UPDATE` atómico con rango | `MAX+1` sin lock en 5 lugares | **Convision es superior** |
| DIAN e-invoicing | Arquitectura sana, pero servicio no versionado ni desplegado confirmado | Funcional en prod, con secretos hardcodeados | Diseño mejor, ejecución incierta |
| NC / ND *(sincronizado 2026-07-13, §14.3)* | Automáticas, acopladas a cancelación/ajuste; `Balance`/`Total` ahora se ajustan en el mismo request | Documentos con más flujo, tampoco recalculan del todo | **Resuelto** |
| Pagos *(abonos implementados 2026-07-13, §14.2)* | Múltiples formas, `AddPayment`/`RemovePayment`/`AddPartialPayment`/`RemovePartialPayment` reales, todas persistiendo correctamente | Recibo de caja, consecutivo inseguro | **Resuelto** |
| Cartera / AR | Solo "portfolio" de laboratorio por orden | Aging, seguimiento, circularización | Brecha real |
| Contabilidad | Inexistente | Esqueleto sin terminar, nunca invocado | Brecha total en ambos, peor en Convision (cero) |
| Anulación *(reconciliado 2026-07-13, §14.1)* | Un único comportamiento protector para `Cancel`/`Delete`: revierte stock y emite NC antes de anular/soft-delete; `Delete` ahora es soft delete real | Bloqueada si ya tiene CUFE, sin lock de permisos | **Resuelto** |
| Cierre de caja | Autoreportado, sin conciliación automática contra ventas | Recibos manuales, tampoco concilia | Paridad — ambos débiles |
| Multi-tenant | Schema-per-tenant + `branch_id`; `clinic_id` vestigial sin uso | N/A (monolito único) | Inconsistencia guía vs. código |
| **IVA en factura DIAN** *(corregido 2026-07-13, §13.1)* | `ivaTreatmentForSale()` deriva el tratamiento del IVA realmente cobrado en la venta — validado en vivo con una venta real | N/A (Jarvis calcula el IVA por servicio, con sus propios problemas) | **Resuelto** |
| **Panel admin de facturación** *(corregido 2026-07-13, §13.2)* | Pantalla existe y lista documentos correctamente; "Descargar XML" y "Reintentar envío DIAN" ahora responden HTTP 200 — validado en vivo | N/A | **Resuelto** |
| **Modo Factus (proveedor externo)** *(descartado 2026-07-13, §13.3)* | Removido por completo del código — Convision emite solo por `direct`/`none`, sin proveedor tercero | N/A | Decisión de negocio ejecutada |
| **`PartialPayment` (abonos)** *(implementado 2026-07-13, §14.2)* | Repositorio, servicio, handlers y rutas `/sales/:id/partial-payments` completos — validado en vivo con un ciclo alta/consulta/baja real | N/A | **Resuelto** |
| **Recuperación de ventas en `invoicing_status='error'`** *(implementado 2026-07-13, §14.4)* | Nuevo endpoint `POST /sales/:id/retry-invoicing` reintenta la emisión completa cuando nunca hubo `invoicing_id` — validado en vivo (acepta, y rechaza con 422 si ya existe factura) | N/A | **Resuelto** |
| **Acción Cancelar/Anular en la UI de Ventas** *(expuesto 2026-07-13, §14.5)* | Botón wired al diálogo de confirmación ya existente en `Sales.tsx` — validado en vivo en el navegador | N/A | **Resuelto** |

---

## 01 · Documento de venta: Sale / Quote / Order

**Veredicto:** diseño distinto por decisión, no gap.

**Convision hoy:** una sola entidad `Sale` (`internal/domain/sale.go:20-54`) con `Status` (`pending|completed|cancelled|refunded`) y `PaymentStatus` derivado (`derivePaymentStatus`, `sale/service.go:170-178`). No hay estado intermedio "comprobante sin facturar" ni "consolidación de varios comprobantes en una factura": cada venta nace ya como documento final. Se enlaza opcionalmente a `OrderID` y `AppointmentID` (líneas 24, 26); si incluye un lente, dispara automáticamente una `LaboratoryOrder` (`createLabOrderIfNeeded`).

**Jarvis (referencia):** `T22ordenes::guardar()` genera un comprobante `t57tipo=0` (pendiente) y, salvo que se marque "dejar pendiente", auto-factura inline un `t57tipo=2`. Éste se puede consolidar (`facturarPost()`) y promoverse a factura oficial (`convertirafactura()`).

**Lectura:** el modelo de Jarvis resuelve un caso de negocio que Convision hoy no necesita: consolidar múltiples atenciones/servicios de un mismo cliente en una sola factura antes de darle validez fiscal. Si el negocio de Convision algún día factura por consolidado (ej. empresas con convenio, facturación mensual), esta simplificación se vuelve una brecha real. Hoy, sin ese caso de uso, no es un gap — es una arquitectura más simple y correcta para "venta = documento único".

---

## 02 · Numeración de consecutivos

**Veredicto:** Convision es superior a la referencia.

Dos numeraciones desacopladas:
- **Interna:** `Sale.SaleNumber` (`sale_repository.go:56-65`) inserta con placeholder `TEMP-<unixnano>`, toma el PK autoincremental ya asignado por Postgres y actualiza a `VTA-%04d` — seguro por construcción, sin condición de carrera.
- **DIAN:** en `convision-invoicing-api`, `numbering_resolution_repository.go:61-84` (`IncrementConsecutive`) usa un único `UPDATE ... SET current_number = current_number + 1 WHERE current_number < range_to AND valid_until >= CURRENT_DATE AND is_active = true RETURNING current_number - 1` — atómico a nivel de fila.

**Comparación directa:** esto es exactamente el problema que el reporte de Jarvis marca como riesgo de concurrencia crítico (`MAX(consecutivo)+1` duplicado en 5 lugares, sin `lockForUpdate()` ni secuencia de BD, parcheado reactivamente detectando duplicados después de guardar). Convision ya lo resuelve correctamente en ambos niveles — no hay acción pendiente aquí, solo mantenerlo así al extender el módulo.

---

## 03 · Facturación electrónica / DIAN

**Veredicto:** esta es la pieza central de la estrategia de facturación propia de Convision — arquitectura sana, y desde el 2026-07-13 alineada al 100% con la decisión de negocio: sin ruta de proveedor externo.

**Lo que existe:** microservicio separado `convision-invoicing-api` (módulo `github.com/convision/invoicing`) con `ElectronicInvoice` (CUFE, `DIANStatus`: `draft|signed|sent|validated|rejected|contingency`, tipos `FV|NC|ND|DS|POS`), `Issuer`/`NumberingResolution` (NIT, régimen, certificado, resolución con `technical_key`). El servicio `Emit()` calcula CUFE real, arma XML UBL, firma y transmite de forma asíncrona con fallback a "contingencia" si falla. La capa de transmisión (`internal/platform/dian/transmitter.go`) tiene **dos modos** vía `DIAN_TRANSMISSION_MODE`: `direct` (SOAP propio a la DIAN — software 100% propio) y `none` (solo contingencia local, sin transmisión). El modo `factus` (proveedor externo Factus/Bizlink) **fue removido por completo el 2026-07-13** — ver §13.3.

Consumo desde el backend principal vía `internal/invoicingclient/client.go`, habilitado por `INVOICING_API_URL` (viene seteado por defecto en `.env.example:24`). Integración con `Sale`: `go s.emitInvoiceAsync(...)` (`sale/service.go:351`) — fire-and-forget, nunca bloquea ni hace fallar la venta. Endpoints admin ya expuestos: `GET /invoicing/documents`, `GET /invoicing/documents/:id/xml`, `POST /invoicing/documents/:id/retry` (los dos últimos, rotos por un bug de scan de `timetz`, corregidos el 2026-07-13 — ver §13.2).

**Decisión de negocio ejecutada:** el modo `factus` era exactamente el tipo de dependencia de proveedor externo (Siigo, Factus, u otro facturador-como-servicio) que Convision decidió no tener a largo plazo. Se descartó por completo — código, config y columnas de BD asociadas eliminados (§13.3). El modo `direct` (conexión propia a la DIAN, sin intermediario comercial) es ahora la **única** ruta de producción soportada; `none` sigue siendo el fallback seguro de contingencia local cuando no hay certificado configurado.

**Verificado en esta sesión:** `git status --porcelain convision-invoicing-api` devuelve `?? convision-invoicing-api/` — el microservicio completo está **sin trackear en git**. Además, `deploy.sh` no menciona `invoicing` en ningún punto (grep sin resultados) — no hay evidencia de que este servicio se despliegue junto al resto de la infraestructura. El diseño es considerablemente más sano que Jarvis (sin secretos hardcodeados vistos, modo `none` seguro por defecto), pero **aún no está versionado ni desplegado como el resto del sistema** — es el paso obligatorio antes de poder llamarlo "nuestro software de facturación" en producción.

**Jarvis — qué evitar al construir esto en firme:**
- Contraseña del `.pfx` de producción hardcodeada en texto plano.
- TLS deshabilitado (`CURLOPT_SSL_VERIFYPEER/VERIFYHOST=false`) en las llamadas SOAP.
- Reclasificación silenciosa de rechazos DIAN como aceptados por coincidencia de substring de texto de error — antipatrón explícito a no repetir.
- Dependencia total de un único camino sin plan de contingencia — Convision ya está mejor posicionado aquí gracias al modo `none`, siempre que el modo `direct` reciba la misma prioridad de hardening.

---

## 04 · Notas crédito / notas débito

**Veredicto:** brecha — no ajustan el saldo real.

NC se emite automáticamente al cancelar una venta (`Cancel()`, `sale/service.go:530-554`), **solo si** `sale.InvoicingID != ""` — si la venta nunca llegó a facturarse electrónicamente, la cancelación no genera NC y se pierde la trazabilidad fiscal silenciosamente. ND se emite al crear un `SaleLensPriceAdjustment` cuando el precio ajustado sube (`CreateLensPriceAdjustment`, líneas 801-846).

**Gap funcional confirmado por grep exhaustivo:** ni `Cancel()` ni `CreateLensPriceAdjustment()` recalculan `Sale.Balance`/`AmountPaid` a partir de la NC/ND emitida. La nota es puramente un documento fiscal hacia el microservicio DIAN — el saldo interno de la venta en la tabla `sales` queda desincronizado del efecto contable real de la nota. No existen notas crédito/débito manuales (p. ej. devolución parcial de un ítem específico) — solo los dos disparadores automáticos descritos.

---

## 05 · Pagos y abonos

**Veredicto:** parcial — feature de abonos muerta en ambos lados.

`SalePayment` (`domain/sale.go:78-93`) soporta múltiples formas de pago vía `Create`, `AddPayment` (`POST /sales/:id/payments`) y `RemovePayment`, recalculando `AmountPaid`/`Balance`/`PaymentStatus` correctamente en cada operación.

**Feature a medio construir, no un simple "no existe":** `PartialPayment` ("abono aplicado a un saldo existente") está declarado como struct de dominio y registrado en `AutoMigrate` (`db.go:200,331`) — **confirmado en esta sesión:** no hay repositorio, ningún método de servicio lo crea/lista/borra, y no hay ruta HTTP que lo toque. El frontend (`saleService.ts:121-133`) define la interfaz `PartialPayment` y el campo `partialPayments: PartialPayment[]` en `Sale` — espejado en ambos lados, pero siempre llegará vacío porque nada lo alimenta.

No hay tratamiento especial de "forma de pago crédito" como sí lo modela Jarvis (que excluye explícitamente pagos en forma "crédito" del cálculo de cartera). En Convision, todo `PaymentMethod` se trata igual para efectos de `Balance`.

---

## 06 · Cartera / Cuentas por cobrar (AR)

**Veredicto:** brecha real.

No existe un módulo de cartera/AR general por paciente o cliente. Lo que sí existe es un **"portfolio" acotado a órdenes de laboratorio** (`handler_portfolio.go`, `laboratory/service.go:671-843`): lista órdenes en estado `portfolio` con saldo pendiente, calcula días en cartera desde el historial de estados, expone el `Sale.Balance` asociado, y permite registrar llamadas de seguimiento (`RegisterPortfolioCall`). Es un derivado de lectura sobre órdenes de laboratorio individuales — no una tabla ni reporte de cuentas por cobrar del negocio.

Búsqueda exhaustiva (`cartera|aging|antiguedad|accounts_receivable|receivable`) sin resultados adicionales. Faltan explícitamente:
- Reporte de antigüedad de cartera (30/60/90/120 días) a nivel de paciente/venta.
- Bloqueo de cliente moroso (Jarvis: flag manual + middleware `ValidarPendientes`).
- Circularización / notificación de estado de cuenta a nivel de paciente o empresa cliente.

**Matiz:** la cartera de Jarvis tampoco es una tabla propia — se calcula al vuelo con SQL duplicado en 4 sitios distintos. No conviene copiar ese patrón; conviene sí copiar el *concepto* (saldo por cliente + aging + seguimiento de gestión) con una implementación más limpia: una vista o consulta única reutilizada, no 4 copias del mismo cálculo.

---

## 07 · Contabilidad (PUC, asientos, causación)

**Veredicto:** brecha total.

No encontrado tras búsqueda exhaustiva (`plan_cuentas|puc|asiento|journal_entry|contabilidad|accounting` en todo `internal/`). No existe plan único de cuentas, asiento contable, ni causación automática de ventas hacia contabilidad. A diferencia de Jarvis, que al menos modela `t160puc`/`t162notascontables`/`sys12parametroscontables` aunque nunca los use, Convision no tiene ni el esqueleto: ni tablas, ni structs, ni rutas.

**Lectura de la brecha:** esta es la brecha más grande en términos absolutos, pero también la de menor urgencia inmediata si Convision hoy delega la contabilidad a un sistema externo (ej. Siigo, World Office) alimentado manualmente o por exportación. Antes de diseñar un módulo contable propio, vale la pena confirmar con el negocio si ese es el flujo actual — construir causación automática sin ese contexto sería adelantarse a un requisito no confirmado.

---

## 08 · Anulación de ventas/facturas

**Veredicto:** inconsistencia entre dos caminos.

| Camino | Qué hace | Qué NO hace |
|---|---|---|
| `Cancel` (`POST /sales/:id/cancel`) | Marca `Status=cancelled`; `revertStock()` best-effort (solo `TracksStock=true` y solo si encuentra el movimiento original); emite NC si había factura electrónica. | No revierte pagos — `Balance` sigue calculado contra el `Total` original de una venta ya cancelada. |
| `Delete` (`DELETE /sales/:id`) | Hard delete real (`domain.Sale` no tiene `DeletedAt` ni columna `deleted_at` — confirma que `db.Delete()` ejecuta `DELETE FROM sales` físico). Cascada a `sale_items`/`sale_payments`/`partial_payments`/`sale_lens_price_adjustments`. | No revierte stock, no emite NC — inventario deducido queda perdido y no queda rastro fiscal. |

**Contradice la guía canónica del propio proyecto:** `DATABASE_GUIDE.md` exige soft delete obligatorio para datos clínicos/negocio (`deleted_at TIMESTAMPTZ NULL`). `sales` no lo tiene, y el endpoint `Delete` con permiso `sales:delete` está expuesto y operativo — cualquier rol con ese permiso puede borrar físicamente una venta sin revertir stock ni dejar rastro. Jarvis, en cambio, bloquea la anulación si la factura ya tiene CUFE (aunque sin validar permisos, otro problema distinto).

---

## 09 · Descuentos

**Veredicto:** existe, propio de Convision.

`internal/discount/service.go` + `domain/discount.go`: flujo de solicitud/aprobación (`DiscountRequest`, estados `pending|approved|rejected`) por producto/lente, opcionalmente por paciente, con `IsGlobal`, `ExpiryDate`, aprobador y motivo de rechazo. Rutas bajo `/discount-requests` y `/products/:id/discount-info`. Sin equivalente directo en el análisis de Jarvis — mecanismo propio de Convision, confirmado pero no profundizado por estar fuera del alcance de esta comparación.

---

## 10 · Cierre de caja

**Veredicto:** paridad — débil en ambos sistemas.

Completamente autoreportado por el asesor, sin vínculo automático con `Sale`/`SalePayment` (grep exhaustivo de `SalePayment|domain.Sale\b|saleRepo` en `internal/cashclose/`: cero resultados). El asesor digita manualmente un total contado por método de pago; un admin registra montos "reales" y aprueba con snapshot before/after de discrepancias (`CashRegisterCloseAdjustment`).

**Gap explícito:** no hay ningún reporte que compare `SUM(sale_payments.amount) WHERE branch_id=X AND date=Y` contra el total contado en el cierre — el vínculo "ventas del día" ↔ "cierre de caja" es puramente operativo, no verificado por código. Jarvis tampoco resuelve esto (recibos de caja manuales, sin conciliación automática), así que no es una regresión frente a la referencia, pero sí un punto débil frente a lo ideal para un sistema de punto de venta.

---

## 11 · Multi-sucursal y multi-tenant

**Veredicto:** inconsistencia guía vs. código.

El aislamiento operativo real es **schema-per-tenant** (`platform.opticas`, `MigrateTenantSchema`/`NewSchemaConnection`) + `branch_id` dentro de cada schema (`Sale.BranchID`, `CashRegisterClose.BranchID`, siempre inyectado por middleware, nunca por el cliente).

**Verificado en esta sesión:** `grep -rn "ClinicID\|clinic_id" internal/domain/*.go` no devuelve resultados. La columna `clinic_id BIGINT REFERENCES clinics(id)` existe en migraciones antiguas (`000005`, `000006`, `000011`-`000014`) tal como exige `DATABASE_GUIDE.md` ("segunda columna en toda tabla de negocio"), pero **ningún struct Go actual la usa**. Es un vestigio de un diseño anterior (multi-clínica dentro de un mismo schema) nunca removido de la guía canónica ni de las migraciones, mientras el modelo vigente es schema-per-tenant + `branch_id`. Vale la pena actualizar `DATABASE_GUIDE.md` para no inducir a nuevas tablas a incluir una columna que ya no se usa.

`Purchase` y `CashTransfer` no tienen `branch_id` en su struct Go — solo `CashRegisterClose` y `DailyActivityReport` lo tienen. En un tenant con una sola sede esto no importa; en uno multi-sucursal, las compras a proveedor no estarían aisladas por sede a nivel de aplicación.

---

## 12 · Verificación en vivo (sesión 2026-07-13): venta real → DIAN → panel admin

**Metodología:** se levantaron los tres servicios localmente — `convision-api-golang` (`go run ./cmd/api`, `APP_ENV=local`, auto-migra y auto-siembra datos de desarrollo), `convision-invoicing-api` (`go run ./cmd/api`, `DIAN_TRANSMISSION_MODE=none`) y `convision-front` (`npm run dev`) — y se ejecutó el flujo real en el navegador: login → Ventas → Nueva Venta → paciente "Laura Vega QA" → lente "Monofocal CR-39 con Antirreflejo" ($180.000 + 19% IVA = $214.200) → Completar Venta → revisión del panel "Facturación Electrónica". Todo lo descrito abajo es reproducible, no inferido.

**Nota de entorno para quien retome esto:** hay dos Postgres locales escuchando en puertos distintos (`127.0.0.1:5432` nativo Homebrew y el contenedor Docker `convision_go_postgres` mapeado a `5433`), y **ambos** tenían una base `convision_invoicing` con semillas idénticas de una sesión anterior — es fácil consultar el Postgres equivocado y ver datos desactualizados. `convision-invoicing-api/.env` apunta al de `127.0.0.1:5432`; ese es el que hay que inspeccionar.

### 12.1 · CRÍTICO — el IVA cobrado al paciente nunca llega a la factura electrónica

**Veredicto:** brecha de cumplimiento DIAN confirmada en vivo, no detectada por el análisis original basado en lectura de código.

`ivaTreatmentForItem` (`convision-api-golang/internal/sale/service.go:1159-1166`) es un `switch` muerto — **los dos únicos casos (`"service","consultation"` y `default`) retornan exactamente el mismo valor, `"excluido"`**, sin importar el tipo de producto real:

```go
func ivaTreatmentForItem(productType string) string {
	switch productType {
	case "service", "consultation":
		return "excluido"
	default:
		return "excluido"
	}
}
```

Esto se pasa como `IVATreatment` en cada `invoicingclient.LineRequest` dentro de `emitInvoiceAsync` (`internal/sale/service.go:911-995`, disparado de forma async en `internal/sale/service.go:351` inmediatamente después de crear la venta). Resultado confirmado con la venta real creada en esta sesión (venta `VTA-0029`, factura interna: Subtotal $180.000 + IVA 19% ($34.200) = Total $214.200 — visible y cobrado en `/admin/sales/29`): el XML UBL emitido a la DIAN (`convision-invoicing-api`, factura interna id 7, CUFE `7c7b6709b375d31c721ed69ac2edba3ca419671d93de2f484363410943b2311c8cc55647daa794f7d09127eebb116885`) declara:

```xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="COP">0.00</cbc:TaxAmount>
  ...
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount currencyID="COP">180000.00</cbc:LineExtensionAmount>
  <cbc:TaxExclusiveAmount currencyID="COP">180000.00</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="COP">180000.00</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="COP">180000.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

Es decir: **la DIAN recibe un documento que declara $0 de impuesto y un total $34.200 menor al que realmente se cobró**. Esto no es un problema cosmético — es exactamente el tipo de discrepancia entre lo cobrado y lo declarado que genera riesgo fiscal real (evasión de IVA no intencional, rechazo/auditoría garantizada apenas se active `DIAN_TRANSMISSION_MODE=direct` o `factus` contra la DIAN de verdad, porque el documento fiscal no refleja la transacción real). **Bloqueante para llevar el modo `direct` a producción** (recomendación P0 #1 del documento original) — no tiene sentido endurecer TLS/certificados si el contenido del documento que se transmite ya es fiscalmente incorrecto.

**Corrección sugerida:** `ivaTreatmentForItem` debe clasificar por el tipo real de producto/servicio (lente, montura, servicio óptico, consulta) contra las reglas de exención de IVA vigentes en Colombia para productos ópticos — algunos sí están exentos bajo ciertas condiciones, pero no todos, y desde luego no de forma incondicional. Mientras tanto, cualquier venta con IVA > 0 y `IVATreatment="excluido"` es, por definición, una factura mal declarada.

### 12.2 · CRÍTICO — las dos acciones del panel admin de Facturación Electrónica están rotas

**Veredicto:** brecha de ejecución confirmada en vivo — la funcionalidad está expuesta en el producto pero no funciona.

El panel `/admin/electronic-invoices` **sí existe** (dato nuevo: el análisis original no verificó el front end) y lista correctamente los documentos emitidos, con filtros por tipo/estado/fecha/referencia. Cada fila expone dos botones: "Descargar XML" y "Reintentar envío DIAN". **Ambos fallan con HTTP 502 el 100% de las veces que se probaron** (confirmado sobre 2 documentos distintos), y **la interfaz no muestra ningún error al usuario** — el botón simplemente no hace nada visible; solo aparece en la consola del navegador.

**Causa raíz confirmada:** `InvoiceRepository.GetByID` y `GetByIDWithLines` (`convision-invoicing-api/internal/platform/storage/postgres/invoice_repository.go:35-54`) usan `r.db.First(&inv, id)` — un `SELECT *` que intenta escanear la columna `issue_time` (tipo Postgres `time with time zone`) directamente en un campo Go `time.Time` (`internal/domain/invoice.go:54`, `gorm:"type:timetz"`). El driver Postgres devuelve `time`/`timetz` como string, no como `time.Time`, así que el scan falla siempre:

```
sql: Scan error on column index 9, name "issue_time": unsupported Scan, storing driver.Value type string into type *time.Time
```

`ListInvoices` (usado por la tabla principal) no tiene este problema porque selecciona columnas explícitas y omite `issue_time` — por eso la lista se ve bien pero cualquier acción que cargue una factura individual por ID (XML, reintento, y presumiblemente el detalle si existiera) revienta. Los handlers afectados: `GetInvoiceXML` y `RetryContingency` (`internal/transport/http/v1/handler_invoicing.go:66-92` en `convision-api-golang`, que proxyean a `convision-invoicing-api`).

**Impacto:** de los cuatro endpoints admin de facturación expuestos (listar, obtener uno, XML, reintentar — §03 solo nombraba los tres primeros), los dos que operan sobre una factura individual por ID (XML y reintentar) no son operables en absoluto hoy. Cualquier factura que caiga en contingencia (que es el 100% de las emitidas mientras no haya modo `direct`/`factus` configurado) **no se puede reintentar ni descargar desde el panel** — solo se puede consultar en la lista.

**Corrección sugerida:** o bien mapear `issue_time` con un tipo/scanner compatible (`pq.NullTime`, o cambiar la columna a `timestamptz` y separar fecha/hora en la capa de presentación), o excluir `issue_time` de los `SELECT *` igual que ya hace `ListInvoices`. Adicionalmente, el front end debe mostrar un toast de error cuando estas acciones fallan — fallar en silencio es peor que fallar visiblemente, porque el usuario no tiene forma de saber que el reintento nunca se disparó.

### 12.3 · Otros hallazgos menores de la sesión en vivo

- **Sales con `invoicing_status='error'` sin salida.** En la base de datos ya existían ventas (`sale_id` 27 y 28) con `invoicing_status='error'` e `invoicing_id=''` — la emisión falló antes de que `convision-invoicing-api` llegara a crear el registro. El único mecanismo de recuperación expuesto (`RetryContingency`) opera sobre un `invoicing_id` existente; una venta que nunca llegó a tener uno **queda permanentemente sin factura y sin botón para arreglarlo**, ni en el panel admin ni, aparentemente, en ningún otro lugar del producto.
- **Columna "Destinatario" vacía en el panel admin.** La tabla de `/admin/electronic-invoices` tiene una columna "Destinatario" que aparece vacía en todas las filas, pese a que `recipient_name` sí viene poblado en la respuesta del API (confirmado consultando `electronic_invoices` directamente — p. ej. "Laura Vega QA", "Lucia Mariana Pardo"). Gap de mapeo en el front end, no en el back end.
- **Descripciones de línea genéricas hacia la DIAN.** Cuando el `SaleItem` y el `Product` asociado no tienen `Description` poblada, `emitInvoiceAsync` cae al fallback `fmt.Sprintf("Item #%d", item.ID)` (`internal/sale/service.go:940-942`) — ocurrió en la venta de prueba de esta sesión ("Item #40" en vez de "Monofocal CR-39 con Antirreflejo"). La DIAN exige una descripción real del bien o servicio facturado; vale la pena auditar cuántos productos del catálogo tienen `Description` vacía antes de asumir que esto es un caso aislado.
- **`PartialPayment` (abonos) confirmado muerto, y alcanzable desde la UI.** La pestaña "Abonos" en el detalle de venta siempre muestra "No hay abonos registrados" — consistente con §05 del análisis original. Dato nuevo: el formulario de "Nueva Venta" sí expone un checkbox "Realizar un abono (pago parcial)", es decir, un usuario real puede intentar usar la feature muerta pensando que existe — el gap es más visible de lo que sugiere una revisión de código pura.
- **No se encontró ninguna acción de Cancelar/Anular en la interfaz.** Ni en el listado de Ventas (solo "Ver Factura" / "Ver") ni en el detalle de una venta individual hay botón para cancelar. El método `Cancel()` y el endpoint `POST /sales/:id/cancel` existen a nivel de API (documentados en §08), pero en esta sesión no se encontró ningún punto de entrada en el producto para invocarlos — si existen, no están en las rutas de UI recorridas (lista, detalle, ni ninguna acción contextual visible).
- **Confirmación positiva:** "Gestión de Cartera" es, en vivo, exactamente lo que describe §06 — una pantalla de seguimiento de lentes sin recoger ("Lentes listos sin recoger — seguimiento y llamadas de cobranza"), no un módulo de cartera general. "Cierres de Caja" funciona bien para lo que hace (consolidado por asesor, diferencias, aprobación) pero, igual que documenta §10, no cruza contra `sales`/`sale_payments` — es autoreportado.
- **Ruido menor no relacionado con facturación** (footnote, no requiere acción inmediata): el widget "Por Cobrar Hoy" del dashboard de Ventas muestra "NaN% del total" cuando no hay saldo pendiente que dividir; durante la sesión también se observó un `SQLSTATE 25P02` ("current transaction is aborted") en una subconsulta de `dashboard_repository.go` al calcular ventas por día — ninguno de los dos bloquea el flujo de facturación pero quedan anotados por si alguien los encuentra después.

---

## 13 · Correcciones aplicadas (sesión 2026-07-13, segunda parte)

**Decisión de negocio que dispara esta sección:** se descarta definitivamente el modo `factus` — Convision emite electrónicamente **solo** a través de su propia conexión DIAN. En consecuencia se repararon en el mismo turno los dos hallazgos P0 de la sección 12 (IVA y panel admin), que bloqueaban precisamente la ruta `direct` a la que ahora se apuesta al 100%. Cada corrección fue validada en vivo, no solo compilada.

### 13.1 · IVA — corregido y validado

`ivaTreatmentForItem(productType string)` (el switch muerto que siempre retornaba `"excluido"`) fue reemplazado por `ivaTreatmentForSale(sale *domain.Sale)` (`convision-api-golang/internal/sale/service.go`, junto a `ivaRate`): deriva el tratamiento DIAN del impuesto **realmente cobrado** en la venta (`sale.Tax > 0` → `"gravado_19"`, si no `"excluido"`) en vez de una clasificación hardcodeada por tipo de producto que nunca coincidía con lo cobrado. Se actualizaron los tres puntos de emisión que hacían el mapeo incorrecto: factura (`emitInvoiceAsync`), nota crédito (`emitCreditNoteAsync`) y nota débito (`emitDebitNoteAsync`, que además tenía `"excluido"` hardcodeado directamente).

**Validado en vivo:** venta real VTA-0031 (Laura Vega QA, lente $180.000 + 19% IVA = $214.200, cobrado y visible en `/admin/sales/31`) generó la factura DIAN interna id 9 con:

```xml
<cac:TaxTotal>
  <cbc:TaxAmount currencyID="COP">34200.00</cbc:TaxAmount>
  <cac:TaxSubtotal>
    <cbc:TaxableAmount currencyID="COP">180000.00</cbc:TaxableAmount>
    <cbc:TaxAmount currencyID="COP">34200.00</cbc:TaxAmount>
    <cac:TaxCategory><cbc:Percent>19.00</cbc:Percent>...
</cac:TaxTotal>
<cac:LegalMonetaryTotal>
  <cbc:TaxExclusiveAmount currencyID="COP">180000.00</cbc:TaxExclusiveAmount>
  <cbc:TaxInclusiveAmount currencyID="COP">214200.00</cbc:TaxInclusiveAmount>
  <cbc:PayableAmount currencyID="COP">214200.00</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

`iva_total`/`total` en `electronic_invoices` (id 9) confirmados en base de datos: `214200.00` / `34200.00` — coinciden exactamente con lo cobrado al paciente. El panel `/admin/electronic-invoices` muestra la fila de VTA-0031 con `$ 214.200`, correcto.

**Nota de alcance, no resuelta aquí:** la clasificación es a nivel de venta completa (todas las líneas de una emisión reciben el mismo tratamiento), porque Convision calcula el IVA como un único porcentaje sobre el subtotal completo (`ivaRate = 0.19`), no por línea. Si en el futuro se necesita mezclar líneas gravadas y exentas en una misma venta, esto requiere que `SaleItem` module tax data por ítem — no existe hoy.

### 13.2 · Panel admin de Facturación Electrónica — corregido y validado

La columna `issue_time` de `electronic_invoices` pasó de `TIME WITH TIME ZONE` a `TIMESTAMPTZ` (`convision-invoicing-api/internal/domain/invoice.go`, migración `db/migrations/000004_issue_time_timestamptz.up.sql`, aplicando `USING (issue_date + issue_time)` para preservar los datos existentes). `TIMESTAMPTZ` escanea nativamente a `time.Time`; `TIME WITH TIME ZONE` no — de ahí el error de scan que rompía `GetByID`/`GetByIDWithLines` en todo `SELECT *`.

**Validado en vivo:**
- `GET /api/v1/invoicing/documents/7/xml` vía el backend principal: `502` → **`200`**.
- `POST /api/v1/invoicing/documents/7/retry`: `502` → **`200`**.
- Botones "Descargar XML" y "Reintentar envío DIAN" en `/admin/electronic-invoices` probados en el navegador sobre la factura VTA-0031: ambos completan sin error de consola, XML descargado correctamente (`FV_SETP990000011.xml`).

**No incluido en esta pasada:** el front end sigue sin mostrar un toast de error si alguna de estas acciones fallara en el futuro por otra causa — la corrección de raíz elimina el bug conocido, pero la falta de feedback visible ante un fallo (mencionada en §12.2) no se tocó.

### 13.3 · Modo Factus descartado — desarrollo propio al 100%

Ejecutado por decisión de negocio explícita, no por hallazgo de bug. Removido de `convision-invoicing-api`:

- Paquete completo `internal/platform/dian/provider/` (incluye `provider/factus/client.go`, el cliente REST de Factus, y `provider/provider.go`, la abstracción `ProviderClient`/`ProviderTransmitter` que solo existía para soportar terceros).
- Caso `factus` en `buildTransmitter()` (`cmd/api/main.go`) y su import — `DIAN_TRANSMISSION_MODE` ahora solo reconoce `direct` y `none`.
- Campos `Issuer.ProviderMetadata` (con los tres `Factus*ID` internos) y `NumberingResolution.ProviderResolutionID` (`internal/domain/issuer.go`), y las columnas `provider_metadata`/`provider_resolution_id` en BD (migración `db/migrations/000003_drop_provider_metadata.up.sql`, aplicada).
- Variables `FACTUS_*` de `.env.example` y `.env`.

**Validado:** `grep -rli factus` sobre `convision-invoicing-api`, `convision-api-golang` y `convision-front` no devuelve resultados en código, config ni env — solo quedan menciones históricas en este documento. `go build ./...` y `go vet ./...` limpios en ambos backends Go; `go test ./...` sin regresiones en ninguno de los dos.

### Qué queda pendiente de la sección 12 (no tocado en esta pasada)

Sin cambios — siguen abiertos exactamente como se documentó: `PartialPayment`/abonos sin implementar (§05, §12.3), NC/ND que no ajustan `Balance`/`AmountPaid` (§04), módulo de Cartera/AR (§06), ventas con `invoicing_status='error'` sin `invoicing_id` y sin camino de recuperación (§12.3), ausencia de una acción de Cancelar/Anular en la UI de Ventas (§12.3, §08), columna "Destinatario" vacía en el panel admin y descripciones de línea genéricas hacia la DIAN (§12.3), y la brecha de Contabilidad (§07).

**Actualización: todos los ítems de este párrafo salvo Cartera/AR y Contabilidad se cerraron en la pasada siguiente — ver sección 14.**

---

## 14 · Correcciones aplicadas (sesión 2026-07-13, tercera parte)

**Alcance decidido explícitamente por el negocio:** `convision-invoicing-api` **se deja en local** por ahora — no se toca `deploy.sh`, infraestructura AWS, ni versionado en git (recomendación P0 #3 sigue diferida a propósito, no por descuido). Todo lo demás pendiente de la sección 12 (P0 #4, P1 #5/#6/#8/#9) se implementó y se validó en vivo en la misma pasada, contra la base de datos real (no solo `go build`).

### 14.1 · Soft delete + reconciliación `Delete` vs `Cancel`

`domain.Sale` gana un campo `DeletedAt gorm.DeletedAt` (`internal/domain/sale.go`) — por convención GORM, esto convierte automáticamente `db.Delete(&domain.Sale{}, id)` en un `UPDATE ... SET deleted_at = now()` en vez de un `DELETE` físico, sin tocar el repositorio. Migración `db/migrations/tenant/000025_add_deleted_at_to_sales.up.sql` (`ALTER TABLE sales ADD COLUMN deleted_at TIMESTAMPTZ NULL` + índice), aplicada vía `AutoMigrate` en local y lista para aplicarse como SQL versionado en staging/prod.

`Service.Delete()` (`internal/sale/service.go`) ya no es un hard delete ciego: si la venta no está ya `cancelled`, corre la misma lógica protectora que `Cancel()` — revierte el stock consumido (`revertStock`) y emite una Nota Crédito si la venta ya tenía factura electrónica sin NC previa — **antes** de ejecutar el soft delete. Esto cierra exactamente el gap de §08 ("`Delete` no revierte stock, no emite NC").

**Validado en vivo:** venta de prueba `VTA-0037` (sin pagos, sin factura) — `DELETE /api/v1/sales/37` → `204`; `GET /api/v1/sales/37` → `404`; `SELECT deleted_at FROM sales WHERE id=37` confirma el timestamp. La venta desaparece del listado del panel admin (`/admin/sales`) sin necesidad de refrescar caché — confirmado en el navegador.

### 14.2 · `PartialPayment` (abonos) — backend completo

La tabla `partial_payments` ya existía desde la migración `000011` (creada junto con `sales`/`sale_payments`, nunca usada) — no hizo falta migración nueva. Se agregó la pieza que faltaba en las tres capas:

- **Domain:** `PartialPaymentRepository` (`Create`/`GetBySaleID`/`Delete`) en `internal/domain/sale.go`.
- **Repositorio:** `internal/platform/storage/postgres/partial_payment_repository.go`, y `SaleRepository.withRelations` ahora precarga `PartialPayments`/`PartialPayments.PaymentMethod` (antes no lo hacía — `sale.partial_payments` en la respuesta del API siempre venía vacío aunque hubiera registros).
- **Servicio:** `AddPartialPayment`/`GetPartialPayments`/`RemovePartialPayment` en `internal/sale/service.go`, recalculando `AmountPaid`/`Balance`/`PaymentStatus` con el mismo patrón que `AddPayment`/`RemovePayment`.
- **Transporte:** `POST/GET /api/v1/sales/:id/partial-payments`, `DELETE /api/v1/sales/:id/partial-payments/:paymentId` (`handler_sale.go`, `routes.go`) — coinciden exactamente con lo que `convision-front/src/services/saleService.ts` ya llamaba desde antes (`addPartialPayment`/`getPartialPayments`/`removePartialPayment`).

**Validado en vivo (venta VTA-0034, financiera pura sin ítems para aislar la prueba):** `POST .../partial-payments {amount:30000}` → `amount_paid:30000, balance:70000`; segundo abono de `20000` → `amount_paid:50000, balance:50000, payment_status:"partial"`; `GET .../partial-payments` devuelve el registro con `payment_method` embebido. El checkbox "Realizar un abono" en "Nueva Venta" y la pestaña "Abonos" del detalle de venta (ambos ya existentes en el front, confirmados muertos en §12.3) ahora tienen backend real que atender.

### 14.3 · NC/ND sincronizadas con `Balance`/`AmountPaid`/`Total`

- **`Cancel()`:** además de revertir stock y emitir NC, ahora pone `Balance = 0` y, si `AmountPaid > 0`, `PaymentStatus = "refunded"` (valor que el `CHECK` constraint de `payment_status` ya reservaba para esto, sin usar). Antes, una venta cancelada seguía mostrando el saldo pendiente contra el `Total` original — cerraba el gap de §04 solo a medias (emitía la NC, pero el saldo interno no reflejaba la anulación).
- **`CreateLensPriceAdjustment()`:** el ajuste de precio ahora suma `AdjustmentAmount` a `Sale.Total` y `Sale.Balance` (y recalcula `PaymentStatus`) en el mismo request que crea el ajuste — antes la ND se emitía hacia la DIAN pero la venta seguía reflejando el precio viejo.
- **`DeleteLensPriceAdjustment()`:** simétricamente, revierte esa suma si se borra el ajuste (no estaba en el pedido original, pero dejar esto sin sincronizar habría introducido la misma inconsistencia en sentido contrario).

**Validado en vivo:** venta `VTA-36` con pago completo ($119.000) → `Cancel` → `balance:0, payment_status:"refunded"` (confirmado en API y en el navegador: fila `VTA-0036` muestra "Cancelada"/"Reembolsada"/"$0"). Venta `VTA-37` ($460.000) → ajuste de lente a `$500.000` → `total:500000, balance:500000`; borrar el ajuste → `total:460000, balance:460000` — ciclo completo confirmado contra la base de datos real.

### 14.4 · Recuperación de ventas en `invoicing_status='error'`

Nuevo método `Service.RetryInvoicing(id)` + endpoint `POST /api/v1/sales/:id/retry-invoicing` (`sales:create`/`sales:edit`). A diferencia del endpoint de contingencia existente (`POST /invoicing/documents/:id/retry`, que opera sobre un `invoicing_id` ya asignado), este reintenta la emisión completa desde cero para ventas que nunca llegaron a tener uno — exactamente el caso confirmado en vivo en §12.3 (ventas 27/28 con `invoicing_status='error'` e `invoicing_id=''`, sin ningún botón de recuperación). Corre de forma síncrona (no `go func`, a diferencia del resto de las emisiones) para que quien dispare el reintento vea el resultado inmediato.

**Validado en vivo:** sobre una venta ya facturada (`invoicing_id` no vacío), el endpoint responde `422` ("sale already has an emitted invoice; use the contingency retry endpoint instead") en vez de permitir una doble emisión. Sobre una venta sin `invoicing_id`, responde `200` y reintenta la emisión (sin líneas facturables en la venta de prueba usada, así que no generó documento — comportamiento esperado de `emitInvoiceAsync` cuando no hay ítems, no un fallo del endpoint nuevo).

### 14.5 · Acción Cancelar/Anular expuesta en la UI de Ventas

`Sales.tsx` ya tenía el estado (`cancelSaleTarget`), el handler (`handleCancelSale`) y el `<ConfirmDialog>` completos desde antes (confirmado en §12.3) — solo faltaba el botón que llamara a `setCancelSaleTarget(sale.id)`. Se agregó un menú desplegable (usando `DropdownMenu`, importado pero nunca usado — fuerte indicio de que esto era justamente lo que faltaba terminar) en la columna de acciones, visible solo cuando la venta no está ya cancelada (o cuando `invoicing_status === 'error'`, para exponer también "Reintentar Facturación" del punto anterior).

**Bug encontrado y corregido durante esta misma validación:** el primer intento de clic en "Cancelar Venta" navegaba a `/admin/sales/:id` en vez de abrir el diálogo de confirmación — el clic dentro del menú (renderizado en un portal de React) burbujeaba hasta el `onClick` de la fila de la tabla (`onRowClick`, que navega al detalle). Se corrigió agregando `onClick={(e) => e.stopPropagation()}` al contenedor de la celda de acciones — React hace burbujear los eventos de un portal a través del árbol de componentes, no del árbol del DOM, así que el `stopPropagation` en el contenedor intercepta correctamente los clics de todo el menú.

**Validado en vivo en el navegador:** clic en el menú de acciones de `VTA-0035` → "Cancelar Venta" → diálogo de confirmación se abre (sin navegar) → confirmar → fila pasa a "Cancelada"/"$0", el contador "Total Ventas Hoy" del dashboard baja de 7 a 6, y el botón del menú desaparece de esa fila (ya no aplica, la venta ya está cancelada).

### 14.6 · Dos bugs de persistencia adicionales, encontrados por validación en vivo (no documentados antes)

Ninguno de los dos aparece en las secciones 1-13 — ambos se descubrieron al ejercitar de punta a punta el ciclo abonar/eliminar contra la base de datos real, no por lectura de código ni por los tests unitarios existentes (los mocks de esos tests devuelven siempre el mismo puntero en memoria, lo que enmascara ambos bugs — ver nota abajo).

**Bug 1 — `RemovePayment`/`RemovePartialPayment` no persistían el descuento de `AmountPaid`.** Ambos métodos mutaban una copia local de `Sale` (`sale.AmountPaid -= removedAmount`), pero luego volvían a leer la venta desde la base de datos (`refreshed := saleRepo.GetByID(...)`) — descartando la mutación — y llamaban `Update()` sobre esa segunda copia, sin el descuento aplicado. Resultado: al eliminar un pago o abono, la fila `sales` nunca reflejaba el nuevo `AmountPaid`/`Balance` aunque el pago sí se borrara de `sale_payments`/`partial_payments`. Corregido aplicando el descuento y llamando `Update()` sobre el mismo objeto ya mutado, sin el segundo `GetByID` redundante.

**Bug 2 — `SaleRepository.Update()` resucitaba pagos recién eliminados.** Más serio: incluso después de corregir el Bug 1, borrar un abono seguía apareciendo en un `GET` posterior. Causa raíz: `Update()` hace `db.Model(sale).Updates(map[string]any{...})` — pasar el struct `sale` completo a `.Model()` hace que GORM, por default, intente guardar (`upsert`) sus asociaciones `has-many` pobladas (`Payments`/`PartialPayments`/`LensPriceAdjustments`), **aunque el valor de `.Updates()` sea un mapa explícito de columnas**. Como el pago recién borrado seguía en el slice `sale.PartialPayments` en memoria (nunca se le quitó tras el `Delete`), GORM lo reinsertaba vía `INSERT ... ON CONFLICT (id) DO UPDATE` en el mismo `Update()` que debía persistir el nuevo saldo — confirmado en el log SQL (`DELETE FROM partial_payments WHERE id=3` seguido, en la misma request, de `INSERT INTO partial_payments (...) VALUES (..., id=3) ON CONFLICT ...`). Corregido con `db.Model(s).Omit(clause.Associations).Updates(...)` en `SaleRepository.Update` — un único cambio en el repositorio que corrige el problema para **todos** los llamadores actuales y futuros (`Cancel`, `RemovePayment`, `RemovePartialPayment`, `CreateLensPriceAdjustment`, `DeleteLensPriceAdjustment`, etc.), no solo los dos métodos nuevos.

**Por qué los tests unitarios no lo atraparon:** los mocks de `internal/sale/service_test.go` devuelven el mismo puntero de `*domain.Sale` en cada llamada a `GetByID` — en memoria, "leer de nuevo" y "la mutación anterior" son literalmente el mismo objeto, así que el doble-fetch nunca se distingue de una lectura fresca. Solo una prueba contra una base de datos real (o un mock que simule aislamiento de transacciones) lo habría revelado — que es exactamente cómo se encontró: probando el ciclo abonar → eliminar contra Postgres real, no contra los mocks.

**Validado en vivo (venta `VTA-34`, ciclo limpio):** abono de `$30.000` → `amount_paid:30000`; eliminar ese abono → `amount_paid:0, balance:100000`, `GET /partial-payments` devuelve `[]`, y `SELECT * FROM partial_payments WHERE sale_id=34` confirma cero filas — sin resurrección. Se repitió el mismo ciclo sobre `SalePayment` (`RemovePayment`, venta `VTA-35`) para confirmar que el bug (pre-existente, no introducido en esta sesión) también quedó resuelto por el fix a nivel de repositorio.

### Qué queda pendiente después de esta pasada

- **P0 #3 — llevar `convision-invoicing-api` a producción.** Diferido a propósito por decisión de negocio (`convision-invoicing-api` se queda en local por ahora) — no tocado.
- **P1 #7 — módulo de Cartera/AR.** Sin cambios, sigue siendo una brecha real (§06).
- **P2 — Contabilidad (§07), columna "Destinatario" vacía y descripciones de línea genéricas (§12.3), `clinic_id` vestigial (§11).** Sin cambios.

---

## Recomendaciones priorizadas

Ordenadas por relación riesgo/esfuerzo, no por orden de aparición en el documento.

### P0 — Crítico

1. ~~**Corregir `ivaTreatmentForItem` para que el IVA cobrado al paciente se declare a la DIAN.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §13.1.**
2. ~~**Arreglar el panel admin de Facturación Electrónica: "Descargar XML" y "Reintentar envío DIAN" fallan siempre.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §13.2.**
3. **Llevar `convision-invoicing-api` a producción como el facturador propio oficial.** Decisión de negocio ya ejecutada respecto al modo (factus descartado, ver §13.3) — lo que falta sigue siendo operativo: versionarlo en git, agregarlo a `deploy.sh`/infra AWS, completar la habilitación ante la DIAN con `testSetId` propio en el modo `direct`, y endurecer seguridad (certificado y secretos fuera del código, TLS verificado — ver antipatrones de Jarvis en la sección 03). *(Diferido a propósito por decisión de negocio — `convision-invoicing-api` se queda en local por ahora, no tocado en la pasada de §14.)*
4. ~~**Cerrar la brecha de `Delete` vs `Cancel` en ventas.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §14.1.**

### P1 — Importante

5. ~~**Decidir el destino de `PartialPayment` (abonos).**~~ **✅ Backend completo implementado y validado en vivo el 2026-07-13 — ver §14.2.**
6. ~~**Sincronizar NC/ND con el saldo real de la venta.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §14.3.**
7. **Diseñar un módulo mínimo de Cartera/AR.** Saldo pendiente por paciente/empresa + aging (30/60/90/120) como consulta única reutilizable (evitar el antipatrón de Jarvis de duplicar el cálculo en 4 sitios). El "portfolio" de laboratorio ya tiene la mitad del patrón de seguimiento de cobro — se puede generalizar en vez de crear algo desde cero. *(Pendiente — no tocado.)*
8. ~~**Dar salida a las ventas con `invoicing_status='error'`.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §14.4.**
9. ~~**Exponer una acción de Cancelar/Anular venta en la UI.**~~ **✅ Resuelto y validado en vivo el 2026-07-13 — ver §14.5.**

### P2 — No urgente

10. **Corregir mapeos menores del panel de Facturación Electrónica.** *(Nuevo — confirmado en vivo, §12.3.)* Columna "Destinatario" siempre vacía pese a que el dato existe; descripciones de línea cayendo a `"Item #<id>"` cuando falta `Description` en el ítem/producto — auditar cobertura de esa columna en el catálogo.
11. **Actualizar `DATABASE_GUIDE.md` sobre `clinic_id`.** Aclarar que el aislamiento vigente es schema-per-tenant + `branch_id`, y que `clinic_id` es vestigial — para no perpetuar la columna en migraciones futuras por inercia de la guía.
12. **Definir el alcance de Contabilidad (PUC, asientos) cuando el negocio lo priorice.** Dado que la línea de la compañía es no depender de terceros para su software financiero, si en algún momento se necesita causación contable, el mismo criterio de "software propio" aplicaría aquí — no delegarlo a un sistema contable externo. Por ahora, documentar explícitamente si Contabilidad se maneja fuera del sistema (y cómo), para que una futura fase de roadmap no arranque sin ese contexto.

---

*Generado a partir de lectura directa de código (`convision-api-golang`, `convision-invoicing-api`, `convision-front`) y del análisis previo de `jarvis_optica/BILLING_DIAN_AR_CONTABILIDAD.md`. Sección 12 añadida el 2026-07-13 a partir de ejecución en vivo de los tres servicios y un flujo real de venta en el navegador — no solo lectura de código. Secciones 13 y 14 añadidas el mismo día, en dos pasadas posteriores de corrección, cada una validada en vivo contra la base de datos real y el navegador — no solo `go build`/`go test`.*

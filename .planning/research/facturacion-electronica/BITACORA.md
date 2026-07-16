# Bitácora — Facturación Electrónica DIAN en Convision

## Propósito de este directorio

Este directorio documenta de forma exhaustiva la investigación, decisiones y guía de implementación
para añadir **facturación electrónica DIAN** al sistema Convision (software de gestión de ópticas / clínicas de
salud visual en Colombia).

Todo el contexto aquí es suficiente para retomar la implementación sin investigar de cero.

---

## Estado actual

| Campo | Valor |
|---|---|
| Estado | **INVESTIGACIÓN COMPLETA — implementación pendiente** |
| Fecha de investigación | 2026-07-03 |
| Decisión tecnológica | Software propio (path DIAN habilitado), o proveedor tecnológico — **pendiente decisión** |
| Fase en ROADMAP | No asignada aún (viene después de fase 23) |
| Próximo paso | Decidir path (ver §Decisión crítica), luego ejecutar `/gsd-plan-phase` para la fase de facturación |

---

## Historial de sesiones

### 2026-07-03 — Sesión 2: Re-verificación directa con búsquedas live (julio 2026)

**Trigger:** Solicitud de re-verificación independiente para confirmar que el plan es correcto.

**Metodología:** Búsquedas web directas en paralelo contra fuentes primarias DIAN y MinSalud, más
fetch de las páginas exactas del micrositio DIAN (sin intermediarios de workflow). 5 búsquedas
simultáneas + 2 fetches de fuentes primarias.

**Correcciones aplicadas al plan original:**

| # | Corrección | Impacto |
|---|---|---|
| 1 | **Set de pruebas software propio**: era 2+2+2 (incorrecto) → **correcto: 2 FV + 1 ND + 1 NC** | Medio — afecta el test harness de habilitación |
| 2 | **RIPS/Salud**: Res. 2275/2023 (citada en el plan) **fue derogada** por **Res. 948 del 14-may-2026** | **Alto** — si se factura a aseguradoras, la implementación debe basarse en la norma nueva |
| 3 | **CUCON**: la Res. 948/2026 introduce el Código Único de Contrato (SHA-256, generado por SIIFA). Sin CUCON, el pagador no acepta la factura | **Alto** — campo nuevo obligatorio para facturas a EPS/ARL |
| 4 | **Documentos Técnicos en SISPRO**: los Anexos Técnicos RIPS ya no están en el cuerpo de la resolución — se publican en SISPRO y son actualizables sin nueva resolución | Medio — el software debe monitorear SISPRO activamente |
| 5 | **Reglas de rechazo ya activas**: desde jun-2026 las reglas de validación del MUV que antes eran notificación ahora son rechazo; desde jul-2026 los cambios estructurales de software son exigibles | **Alto** — a la fecha ya aplican las reglas más estrictas |

**Confirmaciones (sin cambios):**
- ✅ Res. 000165/2023 sigue siendo la norma base DIAN para FEV — Anexo Técnico v1.9 en vigor
- ✅ CUFE SHA-384 — algoritmo confirmado en múltiples fuentes primarias
- ✅ Gafas oftalmológicas gravadas 19% IVA — confirmado por DIAN Concepto 627/2024 + múltiples fuentes
- ✅ Lentes sin montar (90.01.30/40/50) excluidos de IVA — Art. 424 E.T.
- ✅ Servicios de optometría excluidos de IVA — Art. 476 numeral 1 E.T.
- ✅ Portal habilitación: https://catalogo-vpfe-hab.dian.gov.co/User/Login — URL confirmada

---

### 2026-07-03 — Sesión inicial de investigación profunda

**Trigger:** El equipo quiere añadir facturación electrónica al sistema. Se solicitó investigación como
senior contador con conocimiento de DIAN y legislación colombiana.

**Metodología:** Deep-research workflow (fan-out de 5 ángulos, 40+ agentes, 18+ fuentes primarias DIAN/MinSalud,
verificación adversarial 3-votos). Adicionalmente se hizo fetch directo de:
- Micrositio DIAN habilitación / registro
- Oficio DIAN 005341 (int. 627) de 2024 — IVA gafas oftalmológicas
- Res. 2275/2023 MinSalud — RIPS + FEV salud (wiki The Factory HKA)
- PDF "Conocimientos requeridos VP-FACE" — guía oficial biller software propio
- Art. 476 E.T. — servicios excluidos IVA

**Resultado:** 5 documentos de referencia generados (este directorio).

**Interrupciones:** La sesión fue afectada 2 veces por rate-limit DIAN (restablece 1pm/2:50pm Bogotá).
Los agentes de verificación completaron ~60 de 105 verificaciones; el resto se marcó 🟡 plausible.

---

## Decisión crítica pendiente (leer antes de planear la fase)

Hay **tres paths** para emitir facturas electrónicas DIAN:

| Path | Esfuerzo build | Carga operativa permanente | Costo/factura | Recomendado cuando |
|---|---|---|---|---|
| **Software propio** (auto-habilitación) | Alto (4–8 meses) | Muy alta — el equipo mantiene conformidad con cada nueva versión del Anexo Técnico | $0/factura | Volumen muy alto, o se quiere productizar la facturación |
| **Proveedor tecnológico** (Siigo, Alegra, Facture, The Factory HKA, Carvajal) | Bajo (2–6 semanas) | Baja — el proveedor absorbe cada Res. DIAN y Anexo Técnico nuevo | ~$80–200 COP/factura o plan mensual | **Recomendado para la mayoría de clínicas** |
| **Solución gratuita DIAN** | Muy bajo | Media — interfaz manual, no automatizable con API | $0 | Solo si el volumen es < 50 facturas/mes y no se necesita integración |

**Recomendación del contador:** Para Convision (multi-tenant, múltiples ópticas) el path proveedor
tecnológico es el más seguro y rentable. La diferencia en costo es mínima comparada con el riesgo
de mantener conformidad indefinidamente con cada nuevo Anexo Técnico + RIPS + MinSalud.

El path **software propio** tiene sentido si Convision quiere ofrecerse a sí mismo como proveedor de
facturación para otras ópticas (productizar el módulo). En ese caso, la inversión de 4–8 meses se
amortiza.

**Esta decisión debe tomarse antes de planear la fase.**

---

## Índice de documentos

| Archivo | Contenido |
|---|---|
| `BITACORA.md` | Este archivo — logbook, estado, decisiones |
| `01-FRAMEWORK-LEGAL.md` | Marco normativo: Res. 000165/2023, cadena legal, obligados |
| `02-HABILITACION-SOFTWARE-PROPIO.md` | Path habilitación: CUFE, XAdES, SOAP, QR, contingencia |
| `03-DOCUMENT-TYPES.md` | Tipos de documento: FEV, NC/ND, POS, salud + RIPS, documento soporte |
| `04-IVA-OPTICA.md` | Reglas IVA / retenciones para óptica + servicios de salud |
| `05-IMPLEMENTATION-GUIDE.md` | Guía de implementación: modelo de datos Go/PG, arquitectura, roadmap |
| `SOURCES.md` | Fuentes primarias con URLs y nivel de confianza por claim |

---

## Leyenda de confianza usada en los documentos

| Símbolo | Significado |
|---|---|
| ✅ | Verificado adversarialmente (3 votos o 2 votos unánimes contra fuente primaria) |
| 🟡 | Plausible — procedente de fuente primaria DIAN/MinSalud pero verificación interrumpida por rate-limit. No refutado. **Re-confirmar contra fuente antes de implementar.** |
| 🔵 | Conocimiento del contador / dominio — no procedente de este ciclo de búsqueda |

---

## Próximos pasos

1. **Decidir path**: software propio vs. proveedor tecnológico (reunión de equipo + liderazgo).
2. **Si software propio:**
   a. Obtener certificado de firma digital de CA acreditada ONAC (Andes SCD, Certicámara, GSE).
   b. Registrar modo "software propio" en portal habilitación DIAN.
   c. Implementar UBL 2.1 + CUFE SHA-384 + XAdES-EPES + SOAP client (ver doc 02).
   d. Ejecutar set de pruebas (2 facturas, 2 notas débito, 2 notas crédito) → habilitado.
   e. Solicitar rangos de numeración producción → go live.
3. **Si proveedor tecnológico:**
   a. Evaluar Siigo API, Alegra API, The Factory HKA, Facture.co.
   b. Implementar adapter en `internal/invoicing/` que llama al proveedor y persiste CUFE/estado.
   c. La lógica de negocio (tipos de documento, IVA, RIPS) aplica igual — cambia solo el transporte.
4. **Independientemente del path:**
   a. Definir el modelo de datos (ver doc 05 §7.1) — es el mismo para ambos paths.
   b. Implementar la lógica de IVA por SKU (ver doc 04) — crítico, no delegar al proveedor.
   c. Decidir si se factura a aseguradoras (EPS/ARL) — si sí, el módulo RIPS + CUV es obligatorio.
5. **Crear fase en ROADMAP** con `/gsd-add-phase` o `/gsd-plan-phase`.

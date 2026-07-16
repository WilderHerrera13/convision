# Fuentes Primarias y Nivel de Confianza

> Tracker de cada fuente usada en la investigación de 2026-07-03.
> Para la leyenda de confianza ver `BITACORA.md`.

---

## Fuentes DIAN (primarias)

| Fuente | URL | Claims cubiertos | Confianza |
|---|---|---|---|
| **Resolución 000165 del 1-Nov-2023** — norma base del sistema de facturación electrónica | https://normograma.dian.gov.co | Marco legal base, validación previa, numeración, firma, representación gráfica | ✅ Verificado |
| **Anexo Técnico FEV v1.9** — spec técnico completo (753 pp.) | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ | CUFE SHA-384, CUDE, UBL 2.1, XAdES, campos QR, codificación XML, tablas de códigos | ✅ Verificado (algorítmico) |
| **Guía "Conocimientos requeridos VP-FACE"** (PDF DIAN) | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Conocimientos_requeridos_vp_face.pdf | 5 capacidades software propio, XAdES-EPES, SOAP métodos, GetNumberingRange | ✅ Verificado |
| **Micrositio DIAN habilitación / registro** | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/ | Set de pruebas (2 FV + 2 ND + 2 NC o 2+1+1), URL habilitación, modos, ClTec | 🟡 Plausible |
| **Concepto DIAN 005341 (int. 627) de 2024** — IVA gafas oftalmológicas | https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_5341_2024.htm | Gafas armadas gravadas 19%, lentes sin montar excluidos, monturas gravadas | ✅ Verificado |
| **Guía consumo web services DIAN** | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ | Métodos SOAP (SendBillSync, SendBillAsync, GetStatus, GetXmlByDocumentKey...), WS-Security | 🟡 Plausible |
| **Documentación RADIAN** | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ | Eventos RADIAN: acuse, aceptación, endoso | 🟡 Plausible |
| **Caja de herramientas v1.9** | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ | Validator XML DIAN para testing | 🟡 Plausible |
| **Resolución 000008 de 2024** (modificatoria) | normograma.dian.gov.co | Postergación fechas de obligación Anexo v1.9 | ✅ Verificado |
| **Resolución 000202 de 2025** (modificatoria) | normograma.dian.gov.co | Solo modifica artículos de la 000165, no toca Anexo Técnico ni algoritmos | ✅ Verificado |
| **Resolución 000167 de 2021** | normograma.dian.gov.co | Documento soporte en adquisiciones a no obligados | 🟡 Plausible |
| **Resolución 000013 de 2021** | normograma.dian.gov.co | Nómina electrónica | 🟡 Plausible |

---

## Fuentes MinSalud (primarias)

| Fuente | URL | Claims cubiertos | Confianza |
|---|---|---|---|
| **⚠️ DEROGADA — Resolución MinSalud 2275/2023** | MinSalud.gov.co | Archivada. Ya no es la norma vigente. | — Derogada |
| **⚠️ DEROGADA — Resolución 558 de 2024** | MinSalud.gov.co | Archivada. | — Derogada |
| **⚠️ DEROGADA — Resolución 1884 de 2024** | MinSalud.gov.co | Archivada. | — Derogada |
| **✅ NORMA VIGENTE — Resolución MinSalud 948 del 14-may-2026** | https://legalytributarioenlinea.co.pwc.com/Repositorio%20PwC/PDF/Normas%20Nacionales/Resoluciones/Ministerio%20de%20Salud%20y%20Protecci%C3%B3n%20Social/2026/RES-000948-26.pdf | RIPS como soporte FEV salud, CUV, CUCON (SHA-256), MUV, 2 niveles validación, arquitectura JSON+XML, plazo 22 días, fechas jun/jul 2026 | ✅ Verificado (fuente primaria texto oficial) |
| **Consultorsalud — análisis Res. 948/2026** | https://consultorsalud.com/rips-como-soporte-de-la-fev-en-salud/ | Comparativo régimen anterior vs. vigente, tabla de cambios, CUCON, Documentos Técnicos en SISPRO, cronograma | ✅ Verificado |
| **SISPRO micrositio oficial** | https://www.sispro.gov.co/central-financiamiento/Pages/facturacion-electronica.aspx | Documentos Técnicos 1 y 2 (actualizables sin resolución), validadores técnicos MUV | ✅ Fuente viva — consultar antes de implementar |

---

## Estatuto Tributario (fuentes legislativas)

| Fuente | URL | Claims cubiertos | Confianza |
|---|---|---|---|
| **Art. 424 E.T.** — bienes excluidos IVA | https://estatuto.co/424 | Subpartidas 90.01.30/40/50 excluidas (lentes sin montar, lentes de contacto) | ✅ Verificado |
| **Art. 476 E.T. numeral 1** — servicios excluidos IVA | https://estatuto.co/476 | Servicios médicos, odontológicos, hospitalarios, clínicos y de laboratorio; incluye optometría por nombre | ✅ Verificado |
| **Art. 616-1 E.T.** — obligatoriedad y validación previa | Secretaría del Senado | Mandato factura electrónica, DIAN como único validador | ✅ Verificado |
| **Art. 617 E.T.** — requisitos de la factura | Secretaría del Senado | Campos obligatorios del documento (consecutivo, NIT, fecha, valores…) | 🔵 Dominio contable |

---

## Claims con alta prioridad de re-verificación antes de implementar

Los siguientes requieren confirmación antes de escribir código:

1. **✅ RESUELTO — Número de documentos del set de pruebas para Software Propio**:
   **2 facturas + 1 nota débito + 1 nota crédito** (fuente: micrositio DIAN proceso-de-registro,
   verificado directamente en julio 2026). El set de 6+2+2 es para Proveedor Tecnológico.
   → Fuente confirmada: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/

2. **URLs exactas de los WSDLs** (habilitación y producción) — publicadas en el catálogo de
   participantes DIAN, pueden cambiar entre versiones.
   → Fuente: Guía consumo web services DIAN + portal habilitación.

3. **Perfil XAdES exacto** — EPES vs BES, versión ETSI, embedding del cert, SignatureAlgorithm.
   → Fuente: Art. 11 numeral 14 de la Res. 000165/2023 + política de firma DIAN (PDF).

4. **Plazo actual de obligación RIPS para ópticas/prestadores pequeños** — los plazos han sido
   modificados varias veces.
   → Fuente: Res. 1884/2024 + circulares MinSalud 2025.

5. **Clasificación IVA de "servicio de taller óptico" (tallado de lentes)** — si es servicio de
   salud (excluido) o servicio comercial (gravado). La doctrina DIAN no es explícita en este punto.
   → Fuente: DIAN, consultar con contador habilitado.

---

## Cómo consultar el Normograma DIAN

1. Ir a https://normograma.dian.gov.co/dian/
2. En "Búsqueda de normas" ingresar número de resolución (ej: 000165) y año (2023).
3. El texto consolidado incluye las modificaciones posteriores.
4. Para conceptos (oficios): buscar por número de concepto o por materia.

## Cómo descargar el Anexo Técnico v1.9

1. Ir a https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/
2. Sección "Documentación técnica" → "Factura Electrónica de Venta"
3. Descargar "Anexo técnico factura electrónica de venta versión 1.9"
4. Guardar en este directorio como referencia de la implementación.

⚠️ El Anexo Técnico es el documento definitivo. Si hay discrepancia entre cualquier otra fuente
(incluyendo este documento) y el Anexo Técnico, **el Anexo Técnico gana**.

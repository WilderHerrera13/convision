# Marco Normativo — Facturación Electrónica DIAN (Colombia)

> Audiencia: equipo de ingeniería + contador. Última actualización: 2026-07-03.
> Para leyenda de confianza (✅🟡🔵) ver `BITACORA.md`.

---

## 1. Cadena legal

```
Estatuto Tributario (Arts. 616-1, 617, 618, 420, 424, 476)
    └─ Decreto 1625 de 2016 (Decreto Reglamentario Único Tributario — DUT)
           └─ Resolución DIAN 000165 del 1 de noviembre de 2023  ◄── NORMA VIGENTE
                   ├─ Anexo Técnico FEV v1.9 (parte integral de la resolución)
                   └─ Anexo Técnico Documento Equivalente Electrónico v1.0
```

---

## 2. Resolución 000165 de 2023 — norma base vigente

✅ **Resolución DIAN 000165 del 1 de noviembre de 2023** es la regulación vigente del sistema de
facturación electrónica en Colombia (Diario Oficial 52.567 del 2-Nov-2023).
Reemplazó la Resolución 000042 de 2020.

Adopta como parte integral:
- **Anexo Técnico de Factura Electrónica de Venta v1.9** — en vigor desde el 1 de mayo de 2024.
  Es el spec técnico de 753 páginas que el equipo de ingeniería debe implementar.
- 🟡 **Anexo Técnico de Documento Equivalente Electrónico v1.0** — rige la migración del tiquete POS.

### Resoluciones modificatorias (NO reemplazan a la 000165)

✅ La norma base ha sido parcialmente modificada; debe implementarse sobre el **texto consolidado**:

| Resolución | Fecha | Qué modifica |
|---|---|---|
| 000008 de 2024 | 31-ene-2024 | Postergó fechas de obligación (inicialmente 1-feb-2024 → 1-may-2024 grandes contribuyentes) |
| 000119 de 2024 | 2024 | Ajustes de plazos |
| 000189 de 2024 | 2024 | Ajustes de plazos |
| 000202 de 2025 | 31-mar-2025 | Modificación parcial de artículos de la 000165; **NO toca Anexo Técnico, CUFE/CUDE, UBL, firma digital** |
| 000227 de 2025 | 2025 | Ajustes adicionales |

⚠️ **Ninguna de estas modificaciones cambia el target técnico**: el Anexo Técnico v1.9 sigue siendo el
spec de referencia estable para UBL, CUFE, firma y servicios web.

---

## 3. Artículos del Estatuto Tributario relevantes

| Artículo | Contenido relevante |
|---|---|
| **Art. 616-1** | Mandato de facturación electrónica + modelo de validación previa (DIAN es la única entidad validadora) |
| **Art. 617** | Requisitos obligatorios del contenido de la factura (consecutivo, NIT, fecha, descripción, valor…) |
| **Art. 618** | Obligación del comprador de exigir factura |
| **Art. 420** | Hecho generador del IVA (venta de bienes y prestación de servicios) |
| **Art. 424** | Bienes excluidos de IVA (lista taxativa — aplica a lentes ópticos) |
| **Art. 476** | Servicios excluidos de IVA (numeral 1 = servicios médicos/salud, incluyendo optometría) |

---

## 4. Modelo de validación previa

✅ Colombia usa un modelo de **validación previa** (no post-validación):

```
Emisor genera XML UBL 2.1 firmado
    └─ Transmite a DIAN (SOAP web service)
           └─ DIAN valida en tiempo real
                  ├─ OK → devuelve ApplicationResponse con "Documento validado por la Dian"
                  │        └─ Emisor entrega documento al comprador ✓ LEGALMENTE VÁLIDO
                  └─ NOK → devuelve ApplicationResponse con errores
                            └─ Emisor corrige y retransmite con EL MISMO número consecutivo
                               (el consecutivo NO se consume en rechazo)
```

✅ **El XML firmado y validado por DIAN ES la factura legal.** El PDF/representación gráfica es
solo una visualización y no puede entregarse al comprador en lugar del XML validado.

✅ **Contingencia:** Cuando los servicios DIAN no están disponibles, el emisor puede enviar el
documento al comprador sin validación previa. Una vez restablecido el servicio, tiene
**48 horas** para transmitir y obtener validación retroactiva.

---

## 5. Obligados a facturar electrónicamente

✅ Están obligados:
- Responsables del IVA
- Responsables del INC
- Todos los **comerciantes** (independientemente de su condición frente al IVA)
- En general, cualquier persona natural o jurídica que supere los umbrales de actividad comercial

🔵 **Excepciones residuales** (verificar contra texto actualizado antes de implementar):
- Personas naturales que venden **exclusivamente bienes excluidos de IVA o servicios no gravados**,
  con ingresos brutos anuales < 3.500 UVT (~$174M COP para 2025). En la práctica, una óptica con
  venta mixta (productos gravados + servicios excluidos) NO califica para esta excepción.

✅ Una óptica / clínica visual que vende lentes, monturas y presta servicios de optometría es
**plenamente obligada** a facturar electrónicamente.

---

## 6. Publicaciones DIAN de referencia obligatoria

Los siguientes documentos son los que el equipo debe descargar y mantener como referencia:

| Documento | URL / ubicación |
|---|---|
| Texto consolidado Res. 000165/2023 + modificaciones | https://normograma.dian.gov.co |
| Anexo Técnico FEV v1.9 (PDF ~753 pp.) | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ |
| Anexo Técnico Documento Equivalente v1.0 | Mismo micrositio |
| Guía de Usuario facturador electrónico | Mismo micrositio |
| Conocimientos requeridos VP-FACE (guía software propio) | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Conocimientos_requeridos_vp_face.pdf |
| Caja de herramientas v1.9 (validator DIAN) | Mismo micrositio — para validar XMLs propios |
| Guía consumo web services | Mismo micrositio |
| Documentación RADIAN (eventos) | Mismo micrositio |

---

## 7. Resumen ejecutivo para ingeniería

- El spec técnico vive en el **Anexo Técnico v1.9** — es el único documento que define el formato XML.
- La norma base es la **Res. 000165/2023** consolidada (base + 5 modificaciones al 2026).
- El modelo es **validación previa**: no se puede entregar factura al cliente hasta que DIAN la apruebe.
- El transporte es **SOAP** (no REST) — ver documento 02 para detalles de los web services.
- Una óptica es **plenamente obligada** — no hay ambigüedad en ese punto.

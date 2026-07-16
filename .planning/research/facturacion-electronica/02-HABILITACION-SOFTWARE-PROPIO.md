# Habilitación Software Propio — Guía Técnica Completa

> Path: el emisor construye su propio software y se auto-habilita directamente con DIAN.
> Para leyenda de confianza (✅🟡🔵) ver `BITACORA.md`.

---

## 1. Los tres modos DIAN — por qué importa elegir bien

✅ DIAN ofrece exactamente **tres modos de operación**:

| Modo | Descripción | Path Convision |
|---|---|---|
| **Solución Gratuita DIAN** | Interfaz web manual de DIAN | No aplica — no automatizable |
| **Software propio** | El emisor construye su propio software y lo habilita | **Opción A** |
| **Proveedor Tecnológico** | Un tercero habilitado por DIAN transmite en nombre del emisor vía API | **Opción B (recomendada)** |

---

## 2. Secuencia de habilitación — software propio

✅ El proceso oficial de habilitación (confirmado directamente del micrositio DIAN, julio 2026):

```
1. Registro en el Sistema de Facturación Electrónica (SFE)
   ├─ Portal de habilitación: https://catalogo-vpfe-hab.dian.gov.co/User/Login
   ├─ Ingresar NIT → el sistema envía TOKEN al correo del representante legal (registrado en RUT)
   ├─ Formalizar registro → clic en "Registrar"
   ├─ Salir del sistema (deja que actualice el cambio)
   ├─ Volver a ingresar y regenerar token
   └─ Seleccionar modo de operación = "Software de Factura Electrónica" (Software propio)
       └─ Ingresar: Nombre del software + PIN
           └─ DIAN asigna automáticamente:
               • ID del software
               • Rangos de numeración de prueba (NO se solicitan manualmente)

2. Set de pruebas (habilitación)
   ✅ Documentos requeridos para SOFTWARE PROPIO:
       • 2 Facturas Electrónicas de Venta
       • 1 Nota Débito
       • 1 Nota Crédito
   ⚠️ El set varía por modo (fuente: DIAN micrositio proceso-de-registro julio 2026):
       Proveedor Tecnológico → 6 facturas + 2 ND + 2 NC
       Software propio       → 2 facturas + 1 ND + 1 NC   ← Convision usa este
       Facturación Gratuita  → 2 facturas + 1 ND + 1 NC
   ├─ Método SOAP: SendTestSetAsync
   ├─ Endpoint habilitación: https://catalogo-vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
   └─ Resultado:
       ├─ PASS → estado cambia automáticamente a "Aceptado"
       │         → ingresar al portal "Habilitación" para ver cambio de "Registrado" a "Habilitado"
       └─ FAIL → estado "Rechazado" → clic en botón "Reiniciar" → corregir errores → reenviar

3. Go-live en producción
   ├─ Portal producción: https://catalogo-vpfe.dian.gov.co/User/Login
   ├─ Seleccionar fecha de inicio de facturación → RUT se actualiza automáticamente con responsabilidad 52
   ├─ Solicitar rangos de numeración en sistema MUISCA
   ├─ Asociar rangos en el portal "Facturando Electrónicamente"
   └─ TAMBIÉN solicitar rango de talonario de contingencia (papel para inconvenientes tecnológicos)
       └─ Este rango de contingencia se asocia directamente en el software, no en el portal
```

---

## 3. Lo que el software debe construir (5 capacidades obligatorias)

✅ Según la guía "Conocimientos requeridos VP-FACE" de DIAN, un software propio debe:

1. **Construir el XML UBL 2.1** para factura de venta + notas débito + notas crédito + documentos derivados, siguiendo el Anexo Técnico v1.9.
2. **Calcular el CUFE/CUDE** de cada documento (ver §4 — algoritmo exacto).
3. **Aplicar la firma digital** XAdES-EPES (ver §5 — XAdES).
4. **Transmitir a DIAN** para validación (ver §6 — SOAP web services).
5. **Entregar al comprador** SOLO después de recibir validación DIAN (ApplicationResponse con "Documento validado por la Dian").

---

## 4. CUFE — algoritmo exacto (implementar byte por byte)

✅ El CUFE (Código Único de Factura Electrónica) se genera así:

### 4.1 Concatenación

```
SHA384( NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1
       + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot
       + NitOFE + NumAdq + ClTec + TipoAmbiente )
```

### 4.2 Reglas de formato para cada campo

| Campo | Formato |
|---|---|
| `NumFac` | Número consecutivo de la factura, sin prefijo |
| `FecFac` | `YYYY-MM-DD` |
| `HorFac` | `HH:MM:SS-HH:MM` (hora local + offset UTC) |
| `ValFac` | Subtotal antes de impuestos. **Punto decimal, exactamente 2 decimales truncados, sin separador de miles** |
| `CodImp1` | `01` (IVA) |
| `ValImp1` | Valor IVA — mismas reglas de formato dinero |
| `CodImp2` | `04` (INC — Impuesto al Consumo) |
| `ValImp2` | Valor INC |
| `CodImp3` | `03` (ICA) |
| `ValImp3` | Valor ICA |
| `ValTot` | Total de la factura |
| `NitOFE` | NIT del emisor — **sin puntos, sin guiones, sin dígito de verificación** |
| `NumAdq` | Documento del adquiriente — sin puntos ni guiones |
| `ClTec` | Clave técnica asignada por DIAN al registrar el rango de numeración |
| `TipoAmbiente` | `1` = producción / `2` = habilitación (pruebas) |

### 4.3 Algoritmo de hash

```
CUFE = hex( SHA-384( concatenación ) ).toLowerCase()
```

⚠️ **Usar SHA-384, NO SHA-1** (SHA-1 era el algoritmo del sistema legado 2016 — encontrarás muchos
blogs incorrectos que lo mencionan). El Anexo Técnico v1.9 exige SHA-384.

### 4.4 CUDE (para notas crédito/débito)

✅ El CUDE usa el mismo algoritmo con los mismos campos, pero en el campo de tipo de documento
se usa el código correspondiente a nota crédito o débito. Ver Anexo Técnico v1.9 §5 para la
concatenación exacta de notas.

---

## 5. Firma digital — XAdES

✅ Toda factura electrónica debe llevar la **firma digital del emisor** al momento de la generación.

### 5.1 Estándar

✅ **XAdES-EPES** per ETSI TS 101 903 (v1.2.2 o v1.3.2), referenciando la política de firma DIAN
mediante `xades:SignaturePolicyIdentifier`.

El elemento de firma se ubica en `ds:Signature` (XMLDSig enveloped dentro del XML UBL).

### 5.2 Algoritmo de firma

🟡 `RSAwithSHA256` sobre el `SignedInfo`, con la cadena completa de certificados embebida.

### 5.3 Certificado requerido

🔵 Se necesita un **certificado de firma digital X.509** emitido a nombre del NIT de la empresa,
por una entidad certificadora acreditada ante ONAC:

| Entidad | Sitio |
|---|---|
| Andes SCD | andesscd.com.co |
| Certicámara | certicamara.com |
| GSE (Gestión de Seguridad Electrónica) | gse.com.co |
| Corpoica (limitada) | — |

El certificado se entrega en formato `.p12` (PKCS#12). Típicamente tiene vigencia de 1–3 años.
⚠️ Un certificado vencido bloquea la emisión de facturas — monitorear y renovar con anticipación.

### 5.4 Firma en la capa SOAP

🟡 Además de la firma XAdES en el XML, la transmisión SOAP requiere **WS-Security**: un header
`wsse:Security` con `ds:Signature` usando el mismo certificado, referenciando el body SOAP.
Tipo de identificador de clave: `X509KeyIdentifier`.

---

## 6. Servicios web DIAN (SOAP)

✅ El contrato es **WSDL SOAP**: interfaz `IWcfDianCustomerServices`.

### 6.1 Endpoints

⚠️ Hay DOS URLs diferentes que NO deben confundirse:

| Propósito | Ambiente | URL |
|---|---|---|
| **Portal web (gestión, registro, habilitación)** | Habilitación | `https://catalogo-vpfe-hab.dian.gov.co/User/Login` |
| **Portal web (gestión producción)** | Producción | `https://catalogo-vpfe.dian.gov.co/` |
| **Web service SOAP (envío de facturas)** | Habilitación | `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc` |
| **Web service SOAP (envío de facturas)** | Producción | `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc` |

✅ Los WSDLs (para generar el cliente SOAP) se obtienen con el parámetro `?singleWsdl`:
- Habilitación: `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?singleWsdl`
- Producción: `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?singleWsdl`

✅ El namespace SOAP es: `http://wcf.dian.colombia`
✅ La interfaz WSDL se llama: `IWcfDianCustomerServices`

### 6.2 Métodos disponibles

| Método SOAP | Uso |
|---|---|
| `SendBillSync` | Envío individual síncrono — factura individual (flujo POS / mostrador) |
| `SendBillAsync` | Envío en lote (batch) |
| `SendTestSetAsync` | SOLO habilitación — envío del set de pruebas |
| `GetStatus` | Consulta estado de un documento por TrackId |
| `GetStatusZip` | Consulta estado de un lote |
| `GetNumberingRange` | Recupera la clave técnica (ClTec) de un rango de numeración autorizado |
| `SendEventUpdateStatus` | Envío de eventos RADIAN (acuse de recibo, aceptación, rechazo) |
| `GetXmlByDocumentKey` | Recupera el XML validado de un documento por su CUFE |
| `GetAcquirer` *(buyer lookup)* | Auto-complete datos del adquiriente por NIT |

### 6.3 Contenedor de transmisión

✅ El documento XML firmado y el ApplicationResponse de DIAN viajan dentro de un **contenedor ZIP**
(el ZIP incluye el XML + el XML de respuesta anterior si aplica). El ZIP se envía como bytes en el
campo `fileName`/`contentFile` de la operación SOAP.

### 6.4 Flujo síncrono recomendado para el mostrador de óptica

```
Venta confirmada
    → Construir XML UBL 2.1 con CUFE correcto
    → Firmar XML (XAdES-EPES)
    → Empacar en ZIP
    → SendBillSync (SOAP)
    → Recibir TrackId
    → GetStatus(TrackId) — polling hasta ValidationResultInfo.IsValid = true
    → Persistir CUFE + applicationResponse en BD
    → Generar representación gráfica (PDF) con QR
    → Entregar al cliente
```

---

## 7. Representación gráfica y código QR

✅ La representación gráfica **no es la factura** pero es obligatoria como entregable al cliente.

### 7.1 QR code

✅ El QR debe:
- Tener **tamaño mínimo de 2 cm** y aparecer en **todas las páginas** del documento.
- Contener la URL de consulta con el CUFE codificado:

```
https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=<CUFE>
```

(En habilitación: `catalogo-vpfe-hab.dian.gov.co`)

### 7.2 Datos visibles obligatorios en la representación gráfica

🔵 El Anexo Técnico define los campos mínimos. Como mínimo:
- NumFac, FecFac, HorFac
- NIT y razón social del emisor
- Documento e identificación del adquiriente (o "consumidor final" + 222222222222)
- Detalle de líneas (descripción, cantidad, precio unitario, impuestos, total línea)
- Subtotales IVA por tarifa, total
- CUFE impreso en texto + QR
- Leyenda "Documento validado por la DIAN"

---

## 8. Numeración (rangos de numeración)

✅ La factura debe usar consecutivos dentro de un **rango autorizado por DIAN** (resolución de
numeración):

- Prefijo: hasta 4 caracteres alfanuméricos.
- Rango: número inicial y número final autorizado.
- Fecha de autorización y fecha de vencimiento.
- La `ClTec` (clave técnica) se obtiene por `GetNumberingRange` — es indispensable para el CUFE.

✅ **No se puede emitir fuera de un rango activo y no vencido.** El sistema debe:
1. Persistir el rango completo (prefijo, desde, hasta, current_number, valid_until).
2. Verificar que `current_number < range_to` y `NOW() < valid_until` antes de emitir.
3. Alertar cuando el rango esté por agotarse o por vencer.
4. Solicitar nuevo rango en MUISCA antes del agotamiento/vencimiento.

---

## 9. Contingencia

✅ Regla oficial: si los servicios DIAN no están disponibles:
1. Emitir el documento con estado `contingency` al cliente (sin validación previa).
2. Almacenar el XML firmado en `invoice_contingency`.
3. En máximo **48 horas** tras restablecerse el servicio, transmitir y obtener validación.

🔵 El sistema debe tener una cola de contingencia con reintentos automáticos y alertas si la
transmisión pendiente supera las 36 horas.

---

## 10. Eventos RADIAN (post-emisión)

🟡 El ecosistema RADIAN cubre los eventos de confirmación entre emisor y receptor:

| Evento | Descripción |
|---|---|
| Acuse de recibo | El receptor confirma que recibió el documento |
| Aceptación expresa | El receptor acepta expresamente la factura |
| Aceptación tácita | Transcurrido el plazo sin rechazo, se acepta automáticamente |
| Rechazo | El receptor rechaza la factura |
| Endoso en propiedad | Transferencia del título valor |

Para el flujo inicial de Convision (óptica retail + salud), los eventos mínimos a implementar son
acuse de recibo y aceptación. Los eventos de endoso son para factoring/título valor — fuera de scope
inicial.

---

## 11. Esfuerzo estimado — software propio

🔵 Estimación realista para un equipo senior Go+React:

| Módulo | Esfuerzo |
|---|---|
| UBL 2.1 XML builder + CUFE + firma XAdES + SOAP client | 6–10 semanas |
| Set de pruebas + habilitación | 1–2 semanas |
| Representación gráfica PDF + QR | 1–2 semanas |
| Modelo de datos + API handlers + frontend | 3–5 semanas |
| Notas crédito/débito + POS equivalente | 2–3 semanas |
| RIPS + MinSalud (si se factura a aseguradoras) | 4–6 semanas adicionales |
| **Total sin RIPS** | **~4–6 meses** |
| **Total con RIPS** | **~6–8 meses** |

---

## 12. Los 7 errores más comunes al implementar

1. **CUFE con formato de dinero incorrecto** — miles separados, 3 decimales → hash incorrecto → rechazo DIAN.
2. **CUFE con NIT con guiones o puntos** → hash incorrecto.
3. **SHA-1 en lugar de SHA-384** — copiado de documentación pre-2020.
4. **Política de firma XAdES incorrecta** — URI del `xades:SigPolicyId` no coincide con el publicado por DIAN.
5. **Certificado vencido** sin alerta → imposibilidad de emitir sin previo aviso.
6. **Emitir fuera del rango autorizado** → rechazo + posible sanción.
7. **No implementar contingencia** → si DIAN cae 2h, no se puede facturar en mostrador.

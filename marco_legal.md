Marco legal y técnico para historia clínica y gestión de consultas en software de ópticas en
Colombia

Un software de gestión de ópticas en Colombia debe cumplir simultáneamente con normativas de
salud (historia clínica, habilitación, RIPS), protección de datos sensibles (Ley 1581/2012), facturación
electrónica DIAN y regulaciones de dispositivos médicos INVIMA. El marco normativo ha cambiado
sustancialmente entre 2021 y 2025: los RIPS pasaron de archivos planos TXT a formato JSON
Ripsjson [Facturo Colombia]
(https://facturo.com.co/facturacion-electronica-rips-todo-lo-que-necesitas-saber-en-salud/)
(Resolución 2275 de 2023), [Cerlatam](https://www.cerlatam.com/wp-content//uploads/2023/11/PR-
UNICA-FEV-RIPS.pdf) Medifolios
la historia clínica electrónica debe prepararse para interoperabilidad HL7 FHIR (Resolución 1888 de
2025), y la transición a CIE-11 ya fue decretada (Resolución 1442 de 2024). [Medifolios]
(https://medifolios.net/articulos/rips-guia-completa-colombia.php) Este informe detalla cada
componente normativo y técnico necesario para implementar un módulo de historia clínica, consulta
optométrica/oftalmológica y dispensación óptica integrado.

1. Marco legal: las normas que gobiernan cada componente del sistema
Historia clínica
La Resolución 1995 de 1999 del MinSalud establece la historia clínica como documento privado,
obligatorio y sometido a reserva, vLex [minsalud]
(https://www.minsalud.gov.co/normatividad_nuevo/resoluci%C3%93n%201995%20de%201999.pdf)
accesible solo al paciente, equipo de salud, autoridades judiciales y terceros autorizados. [Studocu]
(https://www.studocu.com/co/document/universidad-simon-bolivar-colombia/semiologia/resolucion-
1995-de-1999-resumen/9543611) Exige que sea integral, secuencial, racional científicamente,
disponible y oportuna. Cada registro debe llevar fecha, hora, nombre completo y firma del profesional.
[Ministerio de Salud y Protección Social +2]
(https://www.minsalud.gov.co/normatividad_nuevo/resoluci%C3%93n%201995%20de%201999.pdf)
La Resolución 839 de 2017 modificó los períodos de retención: mínimo 15 años desde la
última atención (5 en archivo de gestión, 10 en archivo central), duplicándose a 30 años para víctimas
de violaciones de derechos humanos y conservación permanente para crímenes de lesa humanidad.
[Ministerio de Salud y Protección Social +2]
(https://www.minsalud.gov.co/Normatividad_Nuevo/Resolucion%20No%20839%20de%202017.pdf)

La Ley 2015 de 2020 creó la Historia Clínica Electrónica Interoperable [Suin-juriscol]
(https://www.suin-juriscol.gov.co/viewDocument.asp?id=30042299) (IHCE), [Función Pública]
(https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=105472) Secretaría del
Senado con plazo
máximo de implementación a enero de 2025. [Secretaría del Senado]
(http://www.secretariasenado.gov.co/senado/basedoc/ley_2015_2020.html) [Centro de Salud Suba]
(https://consultorsalud.com/historia-clinica-electronica-datos-relevantes/) La Resolución 866 de
2021 define los elementos de datos clínicos relevantes para interoperabilidad, [Studocu]
(https://www.studocu.com/co/document/institucion-educativa-nuestra-senora-del-
palmar/sociales/resolucion-866-de-2021-datos-clinicos-relevantes-hc/68280820) [Cerlatam]
(https://www.cerlatam.com/normatividad/minsalud-resolucion-866-de-2021/) organizados en cuatro
categorías: identificación del usuario, contacto con el servicio, tecnologías en salud y resultados.
Cerlatam Más
recientemente, la Resolución 1888 de 2025 establece el estándar HL7 FHIR y el modelo de
Resumen Digital de Atención en Salud (RDA) como base de interoperabilidad. [Ihcecol]
(https://vulcano.ihcecol.gov.co/)

Ejercicio profesional de optometría y oftalmología
La Ley 372 de 1997 reglamenta la optometría como profesión de salud que requiere título
universitario [Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?
i=66193) y tarjeta profesional. [Función Pública]
(https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=66193) Define su alcance:
prevención, examen, diagnóstico, tratamiento y manejo del sistema visual y ocular, [Función Pública]
(https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=66193) incluyendo
reconocimiento de manifestaciones sistémicas. [Secretaría del Senado +2]
(http://www.secretariasenado.gov.co/senado/basedoc/ley_0372_1997.html) Los optómetras están
autorizados para usar medicamentos definidos por el Consejo Técnico Nacional (Parágrafo Art. 4),
Función Pública pero
no pueden realizar procedimientos quirúrgicos convencionales ni láser. [Función Pública]
(https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=66193) La Ley 650 de
2001 expide el Código de Ética Profesional de Optometría, [Integral Vision]
(https://saludvisualyocular.com/legislacion-optometria) [Ministerio de Educación Nacional]
(https://www.mineducacion.gov.co/1621/articles-105024_archivo_pdf.pdf) exigiendo que las
prescripciones sean escritas, firmadas y selladas con número de tarjeta profesional (Art. 24).
[Ministerio de Educación Nacional](https://www.mineducacion.gov.co/1621/articles-
105024_archivo_pdf.pdf)

El registro profesional es obligatorio a través de ReTHUS (Ley 1164 de 2007), [Minsalud +2]
(https://www.minsalud.gov.co/salud/PO/paginas/registro-unico-nacional-del-talento-humano-en-
salud-rethus.aspx) verificable en web.sispro.gov.co. Los oftalmólogos, como médicos especialistas,
pueden realizar todas las intervenciones quirúrgicas oculares y tienen un alcance más amplio de
prescripción farmacológica.

Habilitación de servicios de salud visual
La Resolución 3100 de 2019 [Universidad El Bosque](https://www.unbosque.edu.co/educacion-
continua/blog-educacion-continua/funcion-de-la-resolucion-3100-de-2019) (modificada por
Resolución 544 de 2023) define los procedimientos de inscripción en el REPS y condiciones de
habilitación. El Decreto 1030 de 2007 establece una distinción crítica para el software:

Óptica con consultorio: puede realizar consulta de optometría/oftalmología, adaptación de lentes
de contacto, terapia visual, dispensación. Debe cumplir con el Sistema Único de Habilitación e
inscribirse en REPS.
Óptica sin consultorio: solo puede dispensar dispositivos de salud visual y accesorios bajo
supervisión profesional. [ICBF]
(https://www.icbf.gov.co/cargues/avance/compilacion/docs/decreto_1030_2007.htm) No puede
dispensar lentes de contacto, prótesis oculares ni ayudas de baja visión. [ICBF]
(https://www.icbf.gov.co/cargues/avance/compilacion/docs/decreto_1030_2007.htm) Requiere
Certificación de Capacidad de Dispensación.
Protección de datos en salud
La Ley 1581 de 2012 clasifica los datos de salud como datos sensibles [Studocu]
(https://www.studocu.com/co/document/institucion-educativa-nuestra-senora-del-
palmar/sociales/resolucion-866-de-2021-datos-clinicos-relevantes-hc/68280820) [minsalud]
(https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/DIJ/resolucion-866-de-
2021.pdf) (Art. 5), cuyo tratamiento está prohibido salvo autorización explícita del titular, Función
Pública [Suin-juriscol]
(https://www.suin-juriscol.gov.co/viewDocument.asp?id=1684507) interés vital, Superintendencia de
Industria y Comercio orden judicial o fines estadísticos
con anonimización. El Decreto 1377 de 2013 exige informar al titular que no está obligado a
autorizar el tratamiento de datos sensibles, identificar explícitamente cuáles datos son sensibles y

obtener consentimiento expreso con prueba de retención. La Ley 1751 de 2015 refuerza el
derecho a la confidencialidad de la historia clínica (Art. 10, literales g y k). [Studocu +2]
(https://www.studocu.com/co/document/institucion-educativa-nuestra-senora-del-
palmar/sociales/resolucion-866-de-2021-datos-clinicos-relevantes-hc/68280820)

El software debe implementar: mecanismos de consentimiento informado con prueba de retención,
cifrado de datos, controles de acceso por rol, trazabilidad de auditoría, portabilidad de datos y
políticas de privacidad documentadas.

RIPS: del TXT al JSON
La Resolución 3374 de 2000 (RIPS originales en archivos TXT) [Salud Putumayo]
(https://www.saludputumayo.gov.co/index.php/saludyaseguramiento/calidad-de-servicios-de-
salud/rips) fue completamente derogada [Medifolios](https://medifolios.net/articulos/rips-guia-
completa-colombia.php) desde el 30 de septiembre de 2024. [Ripsjson](https://ripsjson.com/rips-txt-y-
rips-json/) La norma vigente es la Resolución 2275 de 2023, que unifica los RIPS como soporte de
la Factura Electrónica de Venta (FEV) en salud. [cerlatam +3](https://www.cerlatam.com/wp-
content//uploads/2023/11/PR-UNICA-FEV-RIPS.pdf) El formato cambió a JSON para RIPS
Medifolios [Ripsjson]
(https://ripsjson.com/rips-txt-y-rips-json/) y XML UBL 2.1 para la FEV con extensión del sector
salud. [Cerlatam +2](https://www.cerlatam.com/wp-content//uploads/2023/11/PR-UNICA-FEV-
RIPS.pdf) Resoluciones posteriores (558/2024, 1884/2024) ajustaron cronogramas de transición y
establecieron el Mecanismo Único de Validación [Salud Putumayo]
(https://www.saludputumayo.gov.co/index.php/saludyaseguramiento/calidad-de-servicios-de-
salud/rips) (MUV) que emite un CUV (Código Único de Validación) [Invoway]
(https://invoway.com/latam/blog/resolucion-2275-cambios-en-el-sector-salud-en-colombia/) por cada
RIPS aprobado. [Minsalud]
(https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/OT/manual-usuario-cliente-
servidor-fev-rips.pdf) [Saludtools](https://www.saludtools.com/articulo/rips-json-facturacion-
electronica-salud-colombia)

Dispositivos médicos y normativa INVIMA
El Decreto 1030 de 2007 es la norma clave para productos ópticos. [Invima]
(https://invima.gov.co/biblioteca/decreto_201030_20de_202007v2023_4pdf) [Invima]
(https://www.invima.gov.co/biblioteca/decreto-1030-2007-reglamento-tecnico-dispositivos-medicos-
visual-ocular) Los lentes oftálmicos tallados a medida se clasifican como dispositivos médicos
sobre medida, regulados por este decreto y la Resolución 4396 de 2008 (requieren Certificado de
Capacidad de Producción de INVIMA). [Invima]
(https://www.invima.gov.co/invima_website/static/attachments/dispositivos_dispositivos_medicos_equipos_biomedicos/gu_C3_A
Los lentes comerciales prefabricados requieren Registro Sanitario INVIMA bajo el Decreto 4725 de

[Invima](https://www.invima.gov.co/biblioteca/decreto-4725-2005-registros-sanitarios-
dispositivos-medicos-106992) Las monturas no son dispositivos médicos (son accesorios) y no
requieren registro sanitario. Los lentes de contacto comerciales se clasifican como dispositivos
médicos Clase IIa-IIb.
2. Datos obligatorios de la historia clínica optométrica
Identificación del paciente y datos sociodemográficos
La Resolución 1995/1999 [minsalud]
(https://www.minsalud.gov.co/normatividad_nuevo/resoluci%C3%93n%201995%20de%201999.pdf) y
la estructura RIPS (Resolución 2275/2023) exigen como mínimo:

Campo	Formato RIPS	Obligatorio
Tipo de documento de identificación	CC, TI, RC, PA, CE, CD, SC, PT, PE, AS, MS (2 caracteres)	Sí
Número de documento	String, hasta 20 caracteres	Sí
Primer y segundo apellido	String, hasta 60 caracteres cada uno	Sí
Primer y segundo nombre	String, hasta 60 caracteres cada uno	Sí
Fecha de nacimiento	AAAA-MM-DD	Sí
Sexo	H (Hombre), M (Mujer), I (Indeterminado)	Sí
Estado civil	Texto	Sí (HC)
Ocupación	Texto	Sí (HC)
Dirección y teléfono del domicilio	Texto	Sí
Municipio de residencia	Código DANE, 5 dígitos	Sí
Zona territorial	01=Rural, 02=Urbana	Sí
País de residencia/origen	Código SISPRO (170=Colombia)	Sí
EPS/Aseguradora	Código entidad, 6 caracteres	Sí
Tipo de usuario	01=Cotizante, 02=Beneficiario, 03=Otro, 04=Subsidiado	Sí
Nombre y teléfono del acompañante/responsable	Texto	Sí (HC)
Anamnesis y antecedentes
Cada consulta debe documentar obligatoriamente: motivo de consulta (en palabras del paciente),
enfermedad actual (inicio, duración, evolución, síntomas asociados), antecedentes personales
sistémicos (diabetes, hipertensión, alergias, medicamentos actuales), antecedentes oculares
(cirugías previas, uso de lentes, antigüedad de fórmula, traumas, patologías oculares previas),
antecedentes familiares (glaucoma, diabetes, miopía, degeneración macular, cataratas,
estrabismo) y antecedentes farmacológicos (especialmente corticoides, antihistamínicos,
antihipertensivos).

Examen visual completo
El examen optométrico registra los siguientes datos, todos obligatorios excepto donde se indica:

Agudeza visual (AV): Se registra para cada ojo (OD/OI) sin corrección y con corrección, [Scribd]
(https://www.scribd.com/presentation/423923266/Historia-Clinica-Optometria) tanto en visión lejana
(notación Snellen 20/X) como cercana (escala Jaeger J1-J20). Se incluye AV con agujero estenopeico
cuando hay disminución significativa.

Refracción objetiva: Retinoscopía [Area of Ophthalmology]
(https://areaoftalmologica.com/terminos-de-oftalmologia/) estática y/o autorefractometría para cada
ojo, registrando esfera (SPH), cilindro (CYL) y eje (AXIS) en dioptrías, con pasos de 0.25D. La
convención predominante en Colombia es cilindro negativo.

Refracción subjetiva: Rx final para cada ojo (SPH/CYL/AXIS) más adición (ADD) si aplica. Se
registra la AV alcanzada con la corrección final.

Queratometría: K1 (meridiano plano) y K2 (meridiano curvo) en dioptrías y grados para cada ojo.
Recomendada pero no siempre obligatoria.

Presión intraocular (PIO): Valor en mmHg [Vistalaser](https://www.vista-laser.com/abreviaturas-
optometria-oftalmologia/) para cada ojo, especificando método utilizado (Goldmann, aplanación,
aire/NCT, iCare) [Areandina](https://www.areandina.edu.co/blogs/que-es-la-optometria-y-cual-es-su-
importancia) y hora de toma — dato clínicamente relevante por las variaciones diurnas.

Biomicroscopía (lámpara de hendidura): Evaluación obligatoria de párpados, conjuntiva, córnea,
cámara anterior, iris, cristalino y vítreo anterior, documentando hallazgos normales y patológicos.
Eyedoctorcostablanca

Fondo de ojo (oftalmoscopía): Evaluación obligatoria de papila/nervio óptico (color, bordes,
relación copa/disco), vasos retinianos, mácula (reflejo foveal, edema, drusen) y retina periférica.

Motilidad ocular: Ducciones, versiones, reflejo de Hirschberg, cover test (lejos y cerca) con
magnitud en dioptrías prismáticas, y cover alternante.

Pruebas complementarias (según indicación clínica): test de color (Ishihara), campimetría
computarizada, sensibilidad al contraste, test de Schirmer, [Slideshare]
(https://www.slideshare.net/slideshow/exploracin-oftalmologica-11529706/11529706) BUT (tiempo
de ruptura lagrimal), OCT, gonioscopia. [Scribd]
(https://www.scribd.com/presentation/423923266/Historia-Clinica-Optometria)

Códigos CIE-10 más frecuentes en optometría
Los diagnósticos se codifican en CIE-10 con 4 caracteres alfanuméricos sin punto para RIPS
(ejemplo: H521, no H52.1). Los más frecuentes incluyen:

Errores refractivos (H52): H520 (hipermetropía), H521 (miopía), H522 (astigmatismo), [Scribd]
(https://www.scribd.com/document/967085247/CODIGO-CIE-10-1-1) H524 (presbicia), H
(trastornos de acomodación), H523 (anisometropía).

Alteraciones visuales (H53-H54): H530 (ambliopía), H532 (diplopía), H535 (deficiencias de visión
cromática), H540 (ceguera binocular), H542 (disminución de AV binocular).

Glaucoma (H40): H400 (sospecha de glaucoma), H401 (glaucoma primario de ángulo abierto),
H402 (glaucoma primario de ángulo cerrado), H409 (glaucoma no especificado).

Patología de segmento anterior: H100-H109 (conjuntivitis), H010 (blefaritis), H110 (pterigión),
H041 (ojo seco), H160 (úlcera corneal).

Cataratas (H25-H26): H250 (catarata senil incipiente), H251 (nuclear), H259 (no especificada).

Otros: H500/H501 (estrabismo convergente/divergente), H353 (degeneración macular), H
(retinopatía diabética), H46 (neuritis óptica), Z010 (examen de rutina de ojos y visión). [NotaSalud]
(https://notasalud.com/cie-10/z010)

La Resolución 1442 de 2024 estableció la transición a CIE-11, pero CIE-10 sigue siendo el estándar
operativo predominante en la práctica. [Medifolios](https://medifolios.net/articulos/rips-guia-
completa-colombia.php)

---
3. Prescripción óptica: formato legal en Colombia
Requisitos legales de la fórmula óptica
El Decreto 825 de 1954 (Art. 6) prohíbe usar claves que imposibiliten la interpretación de la
prescripción en cualquier óptica, exigiendo idioma español. [Suin-juriscol](https://www.suin-
juriscol.gov.co/viewDocument.asp?id=1173372) La Ley 650 de 2001 (Art. 24) establece que toda
prescripción debe ir en papelería con nombre del profesional o institución, firmada y sellada con
número de registro o tarjeta profesional. [Ministerio de Educación Nacional]
(https://www.mineducacion.gov.co/1621/articles-105024_archivo_pdf.pdf)

Contenido obligatorio
Identificación del profesional (todo obligatorio): nombre completo, número de tarjeta profesional
(FEDOPTO/CTNPO), firma manuscrita o digital, sello profesional, nombre de la institución (si aplica),
dirección y teléfono del consultorio.

Identificación del paciente (todo obligatorio): nombre completo, tipo y número de documento de
identificación, número de historia clínica.

Datos clínicos de la prescripción:

Fecha de prescripción: DD/MM/AAAA

## OD: SPH ±X.XX CYL ±X.XX × EJE XXX° ADD +X.XX

## OI: SPH ±X.XX CYL ±X.XX × EJE XXX° ADD +X.XX

DP (Distancia pupilar): XX mm binocular
DNP (Distancia nasopupilar): OD XX mm / OI XX mm
Los valores se expresan en dioptrías con pasos de 0.25D, el cilindro típicamente en convención
negativa, el eje en grados (0°-180°). [Colgafas](https://www.colgafas.com/co/contenidos/como-leer-
tu-formula) El valor "N" o "NEUTRO" indica 0.00 (plano). [Optik Express SAS]
(https://optik.com.co/pages/aprende-a-leer-tu-prescripcion-optica) La adición solo se incluye cuando
existe presbicia. Optik Express SAS
Colgafas

Campos adicionales recomendados: prisma (monto y dirección de base: BI, BO, BU, BD), [Colgafas]
(https://www.colgafas.com/co/contenidos/como-leer-tu-formula) tipo de lente (monofocal, bifocal,
progresivo), material recomendado, filtros/tratamientos, uso indicado (permanente, lectura,
computador), altura de montaje (especialmente para progresivos), AV alcanzada con la corrección. Tu
Optometrista

Vigencia de la prescripción
La legislación colombiana no establece un período de vigencia universal en una resolución
específica, aunque el Decreto 2200 de 2005 exige incluir la vigencia como campo obligatorio.
Medicamentosaunclic En la
práctica, las prescripciones se consideran válidas por 1 año, con períodos más cortos para
pacientes pediátricos o con condiciones progresivas. Cada EPS puede fijar sus propias políticas de
vigencia (típicamente 6-12 meses).

---
4. Flujo completo de la consulta: del agendamiento a la entrega
Fase pre-consulta
Agendamiento: El paciente solicita cita (teléfono, web, WhatsApp, presencial). Se registra nombre,
identificación, EPS, contacto y motivo. Se asigna código CUPS: 890207 (primera vez por
optometría) o 890307 (control por optometría). Para oftalmología: 890202 (primera vez por
especialidad) o 890302 (control).

Recepción y registro: Verificación de identidad con documento. Apertura o recuperación de
historia clínica. Firma de consentimiento informado. Diligenciamiento de formulario de anamnesis
(primera visita).

Verificación de derechos: Para pacientes EPS, verificación de afiliación activa a través de la
plataforma ADRES. Determinación de copago o cuota moderadora según régimen y rango de ingreso.
En régimen contributivo, la cuota moderadora para consulta paramédica oscila entre ~$4.500 y
~$47.700 COP según nivel salarial; [Infobae]
(https://www.infobae.com/colombia/2024/01/09/ministerio-de-salud-ajusto-las-tarifas-de-cuotas-
moderadoras-y-copagos-en-salud-esto-es-lo-que-tendra-que-pagar-en-2024/) en régimen subsidiado
no aplica cuota moderadora. [Salud Total](https://saludtotal.com.co/plan-de-beneficios-en-
salud/cuotas-moderadoras-copagos-y-upc-en-2024/) Pacientes particulares pactan tarifa
directamente.

Pre-consulta (en clínicas avanzadas): autorefractometría/queratometría automatizada, tonometría
de no contacto, retinografía y/o topografía corneal previas al examen del optómetra.

Consulta optométrica u oftalmológica
El profesional realiza el examen completo documentado en la sección 2 (AV, refracción objetiva y
subjetiva, biomicroscopía, tonometría, fondo de ojo, motilidad ocular, pruebas complementarias).
Establece diagnósticos con códigos CIE-10 y define el plan de tratamiento: corrección óptica
(fórmula), tratamiento farmacológico si aplica, recomendaciones de higiene visual, educación al
paciente y programación de seguimiento. Si detecta patología que excede el alcance optométrico,
genera remisión a oftalmología con resumen clínico, diagnóstico presuntivo CIE-10, motivo de
remisión y nivel de urgencia. [Fedopto]
(https://fedopto.org/documentos/Normatividad/LEY_372_DE_1997.pdf) [Sociedadcirugiaocular]
(https://sociedadcirugiaocular.com/consultas/optometria/)

Generación de fórmula óptica
Se genera la prescripción con todos los campos legales detallados en la sección 3. El sistema debe
permitir impresión en formato papel con membrete institucional y firma digital o espacio para firma
manuscrita.

Dispensación óptica (post-consulta)
Selección de montura: Considerando forma facial, compatibilidad con la prescripción
(prescripciones altas requieren monturas más pequeñas), material (metal, acetato, TR-90, titanio),
medidas del armazón (tamaño horizontal/Boxing, puente/DBL, largo de varilla).

Selección de lentes: Tipo (monofocal, bifocal FT-28/FT-35, progresivo
freeform/estándar/ocupacional), material (CR-39 n=1.498, policarbonato n=1.586, Trivex n=1.532, alto
índice 1.60/1.67/1.74), tratamientos (antirreflejo, filtro luz azul, fotocromático, polarizado, endurecido,
hidrofóbico).

Toma de medidas para laboratorio:

Medida	Descripción	Herramienta
DIP binocular	Distancia total entre centros pupilares (54-74mm adultos)	Pupilómetro/regla
DIP monocular (DNP)	Distancia de cada pupila al centro del puente (OD/OI)	Pupilómetro
Altura de montaje/pupilar	Distancia vertical del borde inferior de la montura al centro pupilar
Regla/sistema digital
Distancia al vértice	Distancia de la superficie posterior del lente a la córnea (12-14mm)	Regla de
vértice
Ángulo pantoscópico	Ángulo de inclinación de la montura (8-12°)	Transportador
Curvatura de montura	Ángulo de envolvimiento del armazón	Medición directa
Pedido al laboratorio óptico
El pedido debe incluir: datos del paciente (nombre, identificación), prescripción completa
(SPH/CYL/EJE/ADD/prisma por ojo), especificaciones de montura (marca/modelo, tamaño A, B, DBL,
calibre total, curva base, largo de varilla), todas las medidas tomadas, especificaciones del producto
(tipo de lente, material, índice de refracción, tratamientos, tinte/color), y datos logísticos (número de
orden, fecha, si se envía montura al laboratorio o lentes sueltos).

El Decreto 1030 de 2007 establece que el director científico del laboratorio no puede calcular
independientemente los parámetros del lente — estos deben provenir del profesional prescriptor.
[Invima]
(https://www.invima.gov.co/invima_website/static/attachments/dispositivos_dispositivos_medicos_equipos_biomedicos/gu_C3_A
Los laboratorios requieren Certificado de Capacidad de Producción de INVIMA y se clasifican en alta y
mediana complejidad. [Invima +2]
(https://www.invima.gov.co/invima_website/static/attachments/dispositivos_dispositivos_medicos_equipos_biomedicos/gu_C3_A

Recepción, verificación y entrega
Al recibir los lentes del laboratorio (tiempo de producción típico: 24-72 horas), se verifican con
lensómetro/frontofocómetro contra las tolerancias de la norma NTC 5145 (ISO 8980): potencia
esférica ±0.12D para prescripciones hasta ±6.00D, potencia cilíndrica ±0.12D hasta ±2.00D, tolerancia
de eje desde ±2° (cilindros >2.50D) hasta ±14° (cilindros bajos), adición ±0.12D. Se realiza ajuste final
de la montura al paciente, se verifica alineación pupilar con centros ópticos, y se entregan
instrucciones de cuidado, información de garantía y programación de control de adaptación (1-
semanas, especialmente para progresivos).

---
5. Interoperabilidad: RIPS, SISPRO y MIPRES
Estructura JSON de RIPS para consultas de optometría
Desde octubre de 2024, los RIPS se generan exclusivamente en formato JSON [Ripsjson]
(https://ripsjson.com/rips-txt-y-rips-json/) (Resolución 2275 de 2023). [Saludtools +3]
(https://ayuda.saludtools.com/rips-de-cero-a-entenderlos) La estructura principal contiene un bloque
raíz con identificación del obligado y número de factura, un array usuarios con datos demográficos
del paciente, y un objeto servicios que contiene arrays para consultas, procedimientos,
medicamentos y otros servicios. [Cerlatam](https://www.cerlatam.com/wp-
content//uploads/2023/11/PR-UNICA-FEV-RIPS.pdf) [Miscuentasmedicas]
(https://miscuentasmedicas.com/guia-sobre-la-estructura-de-los-datos-a-reportar-en-los-RIPS-en-
formato-JSON)

El objeto de consulta (consultas) para una atención optométrica incluye 21 campos:

Campo	Tipo	Descripción
codPrestador	C(12)	Código REPS del prestador (12 dígitos en JSON)
fechaInicioAtencion	C(16)	Fecha/hora "AAAA-MM-DD HH:MM"
numAutorizacion	C(0-30)	Número de autorización EPS
codConsulta	C(6)	Código CUPS (e.g., "890207")
modalidadGrupoServicioTecSal	C(2)	Código de modalidad del servicio
grupoServicios	C(2)	Código de grupo de servicios
codServicio	C(4)	Código del servicio
finalidadTecnologiaSalud	C(2)	"01"=diagnóstico, "02"=terapéutico, etc.
causaMotivoAtencion	C(2)	Causa de la atención
codDiagnosticoPrincipal	C(4)	CIE-10 principal (e.g., "H521")
codDiagnosticoRelacionado1-3	C(0-4)	Hasta 3 diagnósticos relacionados
| tipoDiagnosticoPrincipal | C(1) | "1"=impresión, "2"=confirmado, "3"=recurrente |
| tipoDocumentoIdentificacion (profesional) | C(2) | Documento del profesional tratante |
| numDocumentoIdentificacion (profesional) | C(4-12) | Número de documento del profesional |
| vrServicio | N(1-11) | Valor monetario (entero positivo, sin decimales) |
| conceptoRecaudo | C(2) | Concepto de copago |
| valorPagoModerador | N(0-11) | Valor de pago moderador |
| consecutivo | N(1-11) | Consecutivo del registro |

Los tipos de dato son estrictos: C (cadena/string entre comillas dobles, UNICODE UTF-8) y N
(numérico entero positivo sin comillas ni separadores de miles). [miscuentasmedicas]
(https://miscuentasmedicas.com/ANEXO-resolucion-2275-de-2023) Las fechas van como string en
formato "AAAA-MM-DD HH:MM". [miscuentasmedicas](https://miscuentasmedicas.com/ANEXO-
resolucion-2275-de-2023) Los campos opcionales sin dato se envían como null (sin comillas).
Cerlatam

Códigos CUPS aplicables a optometría y oftalmología
Los códigos correctos de consulta son 890207 (primera vez por optometría) y 890307 (control
por optometría) Scribd
— no 890204/890304 que corresponden a odontología especializada. Para oftalmología: 890202
(primera vez por medicina especializada) y 890302 (control). [Scribd]
(https://www.scribd.com/document/435715049/Codigos-CUPS-Consulta-xls) Los procedimientos
diagnósticos comunes incluyen: 150101/150102/150103 (tonometría), 150201 (campimetría
computarizada), 150301 (oftalmoscopia), 150401 (biomicroscopía), 150501 (refracción clínica),
150601 (topografía corneal), 150701 (paquimetría), 150901 (OCT), 151101 (gonioscopia). La
clasificación CUPS vigente es la establecida por la Resolución 2641 de 2024 (CUPS 2025),
verificable en web.sispro.gov.co. [Centro de Salud Suba](https://consultorsalud.com/clasificacion-
unica-de-procedimientos-en-salud-cups-2025-todo-sobre-la-resolucion-2641-de-2024/)

Flujo de validación y reporte RIPS-FEV
El proceso operativo post-octubre 2024 funciona así: se registra la atención clínica en el software, se
genera el JSON de RIPS desde los datos clínicos, se genera la FEV en XML UBL 2.1 con los 11 campos
adicionales del sector salud [Saludtools](https://www.saludtools.com/articulo/rips-json-facturacion-
electronica-salud-colombia) (código prestador, modalidad de pago, cobertura plan de beneficios,
número de contrato, copago, cuota moderadora, entre otros), [Salud Total]
(https://saludtotal.com.co/plan-de-beneficios-en-salud/normas-de-interes-facturacion-electronica-y-
rips-resolucion-2275-y-2284-de-2023/) btw
se envían ambos archivos al MUV (Mecanismo Único de Validación) [Invoway]
(https://invoway.com/latam/blog/resolucion-2275-cambios-en-el-sector-salud-en-colombia/) Facturo
Colombia
disponible como cliente-servidor desktop o API Docker, [Minsalud]
(https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/OT/lineamientos-generacion-
validacion-rips-factura-electronica-fev-doc-electronicos.pdf) y si se aprueban se recibe el CUV
(Código Único de Validación). [cerlatam](https://www.cerlatam.com/wp-
content//uploads/2023/11/PR-UNICA-FEV-RIPS.pdf) La FEV+RIPS+CUV deben radicarse ante la
Entidad Responsable de Pago dentro de 22 días hábiles desde la expedición de la FEV. [Saludtools]
(https://ayuda.saludtools.com/rips-de-cero-a-entenderlos) [Salud Total]
(https://saludtotal.com.co/plan-de-beneficios-en-salud/normas-de-interes-facturacion-electronica-y-
rips-resolucion-2275-y-2284-de-2023/)

Las validaciones del MUV operan en tres niveles: estructura (JSON válido, propiedades case-sensitive
correctas), contenido (valores contra tablas de referencia SISPRO, códigos CUPS/CIE-10 vigentes,
tipos de dato) y relaciones (coherencia interna entre campos y consistencia RIPS-FEV).
miscuentasmedicas [Ministerio
de Salud y Protección Social]

(https://www.minsalud.gov.co/Normatividad_Nuevo/Resoluci%C3%B3n%20No.%201036%20de%202022.pdf)
Los rechazos más frecuentes incluyen: sintaxis JSON inválida, NIT no coincide con autenticación,
formato de código prestador incorrecto [Doctoralia](https://pro.doctoralia.co/blog/cinco-cosas-
diligenciar-rips) (XML usa 10 dígitos, JSON usa 12), [Softwaremedilink]
(https://ayuda.softwaremedilink.com/es/articles/11062330-catalogo-de-errores-fev-rips-validador)
códigos CUPS/CIE-10 obsoletos, tipos de dato erróneos [Doctoralia]
(https://pro.doctoralia.co/blog/cinco-cosas-diligenciar-rips) (numérico enviado como string o
viceversa), e incoherencia entre cobertura/tipo de usuario/modalidad de pago/concepto de recaudo.
[Yeminus](https://www.yeminus.com/fev-rips-sispro-noviembre-2025-validaciones-estrictas-y-
novedades-en-facturacion/)

Integración con MIPRES
MIPRES (Mi Prescripción) es la herramienta para prescribir y reportar tecnologías en salud no
financiadas con recursos UPC Globho (no-
PBS). [Ministerio de Salud y Protección Social]
(https://www.minsalud.gov.co/Normatividad_Nuevo/Resoluci%C3%B3n%203951%20de%202016.pdf)
Los optómetras están expresamente autorizados para prescribir en MIPRES. [Globho]
(https://globho.com/todo-lo-que-debe-saber-de-mipres/) Se requiere cuando se prescriben
medicamentos oftálmicos no cubiertos por el PBS, procedimientos diagnósticos avanzados no
incluidos en el plan, lentes de contacto especiales para queratocono, dispositivos de baja visión o
ayudas visuales especiales. Desde la Circular 0044 de diciembre 2025, los medicamentos PBS
ambulatorios también deben reportarse a través de MIPRES. [Globho](https://globho.com/todo-lo-que-
debe-saber-de-mipres/) Cada prescripción recibe un número único asignado por la plataforma, y el
prescriptor debe estar registrado en ReTHUS. La norma vigente es la Resolución 740 de 2024
(actualizada por Resolución 2622 de 2024).

6. Estructura de datos y consideraciones técnicas para el software
Diseño de base de datos orientado a RIPS
La base de datos debe mapear directamente a la estructura JSON de RIPS para facilitar la generación
automática. Las tablas fundamentales son:

Pacientes (patients): Mapea al bloque usuarios del JSON. Campos clave:
tipo_documento_identificacion VARCHAR(2), num_documento_identificacion VARCHAR(12),
nombres y apellidos VARCHAR(60) cada uno, fecha_nacimiento DATE, cod_sexo CHAR(1),
cod_municipio_residencia VARCHAR(5) con código DANE, cod_zona_territorial VARCHAR(2),
tipo_usuario VARCHAR(2), cod_entidad_aseguradora VARCHAR(6). Clave única compuesta: tipo +
número de documento.

Consultas (consultations): Mapea al array consultas. Incluye cod_prestador VARCHAR(12),
fecha_inicio_atencion TIMESTAMP, cod_consulta VARCHAR(6) para CUPS, diagnóstico principal y
hasta 3 relacionados VARCHAR(4) cada uno, identificación del profesional tratante, valores
monetarios como INTEGER (sin decimales), y consecutivo numérico.

Procedimientos (procedures): Para tonometrías, campimetrías y demás procedimientos
diagnósticos que se facturen independientemente de la consulta.

Prescripciones/Medicamentos (prescriptions): Incluye código CUM (INVIMA), nombre genérico,
forma farmacéutica, cantidad, días de tratamiento, y campo mipres_numero VARCHAR(30) para el
número de prescripción MIPRES cuando aplique.

Facturas (invoices): Seguimiento de la FEV con num_factura, cuv VARCHAR(100) para el
Código Único de Validación, estados (PENDIENTE/APROBADO/RECHAZADO) y fechas de validación y
radicación.

Tablas de referencia: Diagnósticos CIE-10, códigos CUPS (actualizados anualmente), municipios
DANE, entidades aseguradoras, tipos de documento PISIS. Todas verificables en web.sispro.gov.co.

Requisitos técnicos de codificación
La codificación debe ser UTF-8 en toda la aplicación. Los nombres de propiedades en el JSON son
case-sensitive (e.g., tipoDocumentoIdentificacion, no TipoDocumentoIdentificacion). Los
valores monetarios siempre son enteros positivos sin separadores de miles ni decimales. Los campos
nulos se representan como null JSON (sin comillas). Las fechas siguen el formato "AAAA-MM-DD HH:MM" como strings.

Tratamiento fiscal diferenciado en facturación
El módulo de facturación debe manejar la separación fiscal correctamente: la consulta
optométrica está excluida de IVA como servicio de salud, los lentes oftálmicos (vidrios para
gafas) y lentes de contacto están excluidos de IVA (Art. 424 Estatuto Tributario), pero las
monturas/armazones están gravadas al 19% de IVA según Concepto DIAN 627 de 2024. La factura
electrónica debe discriminar correctamente ítems excluidos de los gravados, emitirse en formato UBL
2.1 XML validado en tiempo real por la DIAN con generación de CUFE y código QR.

Módulos recomendados del software
El sistema debe integrar tres dominios funcionales con puntos de conexión claros:

Módulo clínico: Agendamiento de citas con recordatorios automatizados, registro de pacientes,
verificación de derechos ADRES, historia clínica electrónica con formularios especializados de
optometría (todos los campos de examen detallados en la sección 2), generación de fórmula óptica
imprimible, gestión de remisiones, prescripción de medicamentos, y generación automática de RIPS
JSON.
Módulo de dispensación: Orden de trabajo generada automáticamente desde la prescripción,
catálogo de monturas con gestión de inventario, catálogo de lentes con validación de compatibilidad
(rango de prescripción vs. disponibilidad de material), registro digital de medidas (DIP, alturas,
ángulos), generación de pedido al laboratorio con todos los campos requeridos, seguimiento de
estado del pedido, verificación de calidad con checklist y registro de lecturas del lensómetro, y
confirmación de entrega al paciente.
Módulo administrativo-financiero: Punto de venta con deducciones de inventario y múltiples
medios de pago, facturación electrónica DIAN (UBL 2.1), facturación a aseguradoras con integración
de tarifarios ISS/SOAT, cálculo automático de copagos y cuotas moderadoras, gestión de inventario
con trazabilidad por lotes y alertas de stock, cartera y cuentas por cobrar (especialmente crítico para
cobros a EPS), y reportes analíticos.
El punto de integración más importante es el flujo prescripción → orden de trabajo → pedido al
laboratorio: la fórmula óptica generada en el módulo clínico debe poblar automáticamente la orden
de dispensación, que a su vez genera el pedido al laboratorio con todos los datos de prescripción,
montura y medidas, evitando transcripción manual y errores asociados.

Preparación para interoperabilidad futura
El software debe diseñarse para soportar la transición hacia HL7 FHIR (Resolución 1888 de 2025) y el
modelo RDA (Resumen Digital de Atención en Salud). Esto implica estructurar los datos clínicos de
forma que puedan mapearse a recursos FHIR estándar (Patient, Encounter, Observation,
DiagnosticReport, MedicationRequest). Igualmente, debe contemplar la migración de CIE-10 a CIE-

establecida por la Resolución 1442 de 2024, manteniendo capacidad de codificación dual durante el
período de transición.

Conclusión: un ecosistema regulatorio en transición acelerada
El desarrollo de un módulo de historia clínica y gestión de consultas para ópticas en Colombia debe
navegar un marco regulatorio que está en plena transformación digital. Los tres ejes de cambio más
relevantes son la migración de RIPS a JSON como soporte de facturación electrónica (ya obligatorio),
la preparación para interoperabilidad HL7 FHIR de la historia clínica electrónica (en implementación), y
la transición de CIE-10 a CIE-11 (decretada). El sistema debe ser lo suficientemente flexible para
absorber estos cambios sin reestructuraciones mayores.

La distinción regulatoria entre óptica con consultorio y sin consultorio tiene implicaciones directas en
la arquitectura: el software debe poder configurarse para cada tipo de establecimiento, habilitando o
restringiendo funcionalidades según corresponda. La integración clínica-dispensación-facturación no
es un lujo sino una necesidad operativa, dado que la misma atención genera simultáneamente un RIPS
JSON para el sistema de salud, una FEV XML para la DIAN con tratamiento IVA diferenciado (lentes
excluidos, monturas gravadas), y potencialmente un reporte MIPRES. Diseñar esta convergencia
desde la arquitectura de datos —no como una integración posterior— es el factor técnico más
determinante para el éxito del proyecto.

This is a offline tool, your data stays locally and is not send to any server!

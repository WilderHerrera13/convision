# QA — Motor de Promociones: resolución de conflictos, casos borde y promoción cruzada

**Fecha:** 2026-07-03 · **Alcance:** `internal/promotion` (motor), `internal/sale` (aplicación server-side), carrito receptionist, admin Promociones.
**Método:** 37 tests unitarios table-driven del motor puro + pruebas API en vivo (curl, T1–T6) + E2E Playwright (navegador real, venta persistida VTA-0019).

---

## 1. Modelo de resolución de conflictos (decisión de diseño)

Las promociones se dividen en **dos capas** y dos modos de convivencia:

| | Capa ítem (`category`, `second_pair`, `cross_product`) | Capa carrito (`cart_total`, `fixed_amount`, `birthday`) |
|---|---|---|
| **Exclusiva** (default) | Compiten por **unidades**: cada unidad del carrito puede ser descontada por **máx. una** promoción exclusiva. Al tocar una unidad la **reclama** entera. | Aplica **solo la mejor** (mayor monto en su turno). |
| **Acumulable** (`stackable=true`) | Corre después, sobre el **valor restante** de cada unidad; convive con todo. | Corre después, secuencialmente sobre el subtotal ya reducido. |

**Reglas de orden y desempate (deterministas):** `priority DESC` → mayor descuento potencial → menor `id`. La prioridad es la perilla explícita del comercio para decidir conflictos; sin prioridad gana el mayor beneficio al cliente; el `id` garantiza que dos evaluaciones idénticas jamás difieran.

**Interacción entre capas:** la capa carrito se calcula sobre el subtotal **ya reducido** por la capa ítem (el cupón se aplica "encima de la rebaja", nunca doble), pero su **puerta** `min_cart_total` se evalúa contra el subtotal **original** — un descuento de ítem nunca des-califica retroactivamente un umbral de gasto que la compra sí alcanzó.

**Invariante duro:** la suma de descuentos nunca excede el subtotal elegible (cap por unidad y por promoción, redondeo a centavos).

## 2. Nueva promoción: `cross_product` ("compra X → descuento en Y")

- **Trigger** (condición): scope propio (`trigger_scope` = categoría / marca / tipo de producto + objetivo), evaluado contra el **carrito original** — comprar el producto disparador es un hecho, no se "consume" aunque otra promoción lo descuente (validado: `TestConflict_CrossProductTriggerNotConsumedByOtherPromos`).
- **Recompensa**: los ítems que matchean el `scope` normal reciben el % o monto fijo; el disparador **nunca se descuenta a sí mismo** (scopes trigger≠target obligatorios).
- `min_quantity` opcional exige N unidades disparadoras (p. ej. "2 monturas → 25% en lentes").
- Validaciones 422: trigger faltante, trigger==target (degenera en `category`; se rechaza con mensaje que guía al admin), scope sin objetivo.
- Pasa por el **mismo pipeline de reclamo** que `category` → conflictos con otras promociones quedan resueltos por las mismas reglas.

## 3. Matriz de casos validados

### Motor (unit tests — 37/37 verdes, cobertura 71.5%)
| Caso | Resultado |
|---|---|
| Mismo producto, 2 promos exclusivas | Solo una reclama la unidad; la otra **cero** (ni siquiera el remanente) |
| Prioridad vs valor | `priority` gana aunque el descuento sea menor |
| Igual prioridad | Gana el mayor descuento |
| Empate total | Menor `id` — determinista ante cualquier orden de entrada |
| Solapamiento parcial de scopes | El perdedor conserva las unidades que solo él matchea |
| Exclusiva + acumulable, mismo target | 20% + 10% sobre remanente = 28% efectivo |
| 2 promos de carrito exclusivas | Solo la mejor |
| Ítem + carrito | Carrito sobre base reducida; puerta sobre subtotal original |
| Stack patológico (100% + fijos gigantes) | Total ≤ subtotal, siempre |
| cross vs category sobre el mismo lente | Gana el de mayor valor (empate de prioridad) |
| Trigger descontado por otra promo | El cross **sigue disparando** |
| Carrito vacío / sin candidatos / precios 0 / qty 0 / línea sobre-descontada | Sin promos, sin negativos |
| Monto fijo repartido sobre unidades semi-reclamadas | Cap exacto al valor restante |
| second_pair tras reclamo total | No dispara con <2 unidades con valor |
| Redondeo | A centavos en cada promoción |

### API en vivo (T1–T6) y E2E navegador
| Escenario | Verificado |
|---|---|
| T1 cross: montura $360k + lente $240k → **-$60.000** (25% solo al lente) | ✅ |
| T2 sin montura → sin descuento | ✅ |
| T3 conflicto cross(25%) vs category(15%) mismo lente → solo cross | ✅ |
| T4 category con `priority=50` → gana pese a menor valor (-$36.000) | ✅ |
| T5 category `stackable` → cross -$60.000 + 15% del remanente -$27.000 | ✅ |
| T6 + cart_total 10% (min $500k) → -$51.300 sobre base reducida $513.000 | ✅ |
| Carrito muestra **3 filas** de promoción y TOTAL $549.423 (subtotal $600k − $138.300, IVA $87.723) | ✅ |
| **Venta persistida** (VTA-0019): server recalcula todo — `promotion_discount=138300`, `promotion_id=7` (representativa = mayor), `total=549423` idéntico a UI | ✅ |
| Formulario admin: tipo "Compra X → descuento en Y" muestra sección **Condición/Recompensa** + checkbox **Acumulable**; 422 en configs inválidas | ✅ |

## 4. Hallazgos corregidos durante el QA

1. **Stacking por la puerta de atrás (CRÍTICO, corregido):** la primera implementación dejaba que una segunda promo exclusiva tomara % del *remanente* de una unidad ya descontada — dos promos exclusivas se combinaban de facto. Ahora la unidad queda **reclamada** (`claimed`) y es invisible para otras exclusivas. Detectado por los tests de conflicto antes de llegar al navegador.
2. **`second_pair` por líneas, no unidades (corregido):** qty=2 de un mismo producto no disparaba "segundo par". El motor ahora explota líneas en unidades físicas.
3. **Salida de un solo ganador (corregido):** `Evaluate` devolvía máximo una promoción; ahora retorna la lista completa aplicada + `total_discount`, y `sale.Create` suma todas (id representativo = la mayor).

## 4.1 Adenda — Carga masiva de promociones (Excel) y bugs encontrados

Se agregó el tipo **Promociones** al módulo `/admin/bulk-import` (plantilla descargable con
un ejemplo por cada uno de los 6 tipos; encabezados y valores en español con alias en
inglés; validación compartida con la API vía `promotion.BuildFromInput`). E2E verificado
con un archivo de 8 filas: **3 creadas, 1 duplicada (por Nombre), 4 errores** con causa
por fila (tipo inválido, `min_cart_total` faltante, trigger==target, marca inexistente).

Bugs reales encontrados por esta QA y corregidos:

1. **`PUT /promotions/:id` no persistía `brand_id`/`product_category_id`** — el repo hacía
   `db.Model(p).Updates(...)` con las asociaciones precargadas y GORM restauraba el FK
   desde la asociación vieja. Corregido con modelo desacoplado (`&Promotion{ID}`).
   *El mismo patrón existe en `discount_repository.Update` — revisar aparte.*
2. **Enriquecimiento de `/promotions/evaluate` todo-o-nada** — un ítem con `brand_id`
   explícito perdía su `product_type` de catálogo. Ahora completa solo los campos ausentes.
3. **Dato preexistente:** hay marcas duplicadas por nombre en la BD dev (p. ej. dos
   "MAORI"); una promoción por marca puede apuntar al duplicado que el producto no usa.
   Recomendación: deduplicar `brands`.

## 5. Riesgos y pendientes

- `sales.promotion_id` guarda solo la promoción representativa; el desglose multi-promo no se persiste por línea (suficiente para caja/reportes hoy; tabla `sale_promotions` si se necesita atribución exacta por campaña).
- Módulo `notification` está a mitad de un refactor en otra sesión → el binario E2E se compiló desde un worktree (HEAD + archivos de promociones); al terminar ese refactor, `make build` normal vuelve a funcionar.
- Permisos: gestión gated por `RequireRole(admin)`; migrar a permisos `promotions:*` (fase RBAC) sigue pendiente.

/**
 * Pixel Apply — inyector de scripts a Figma via WebSocket bridge
 * Mata el servidor existente en puerto 3000 y sirve como reemplazo
 * con soporte de broadcast. El plugin de Figma se reconecta en ≤3s.
 */

const WebSocket = require('ws');
const { execSync } = require('child_process');

// ─── Scripts de mejoras a aplicar ──────────────────────────────────────────

const SCRIPTS = [

  // ── FIX 1: Corregir badges incorrectos en frame 1843:1166 (Listado) ─────
  // Atendido (51:6) y En curso (51:8) → reemplazar por estados correctos de lab
  `
(async () => {
  const frame = await figma.getNodeByIdAsync('1843:1166');
  if (!frame) { figma.notify('❌ Frame 1843:1166 no encontrado'); return; }

  const badgeEnLab  = await figma.getNodeByIdAsync('51:14'); // En lab.
  const badgeListo  = await figma.getNodeByIdAsync('51:18'); // Listo

  if (!badgeEnLab || !badgeListo) { figma.notify('❌ Badge components no encontrados'); return; }

  // findAll traverse dentro de todas las instancias
  const allInstances = frame.findAll(n => n.type === 'INSTANCE');

  let countLab = 0;
  let countListo = 0;

  for (const inst of allInstances) {
    if (!inst.mainComponent) continue;
    const mcId = inst.mainComponent.id;

    // Badge/En curso (51:8) → En lab. (órdenes activas en laboratorio)
    if (mcId === '51:8') {
      inst.swapComponent(badgeEnLab);
      countLab++;
      continue;
    }

    // Badge/Atendido (51:6) — los primeros 2 → En lab., el último → Listo
    // Usamos un contador para distinguirlos
    if (mcId === '51:6') {
      if (countLab < 2) {
        inst.swapComponent(badgeEnLab);
        countLab++;
      } else {
        inst.swapComponent(badgeListo);
        countListo++;
      }
    }
  }

  figma.notify(\`✅ Fix 1/3 — \${countLab} badges → "En lab.", \${countListo} badges → "Listo"\`);
})();
  `,

  // ── FIX 2: Actualizar CTA en Topbar — "Nueva Orden" → "Exportar" ────────
  `
(async () => {
  const frame = await figma.getNodeByIdAsync('1843:1166');
  if (!frame) { figma.notify('❌ Frame 1843:1166 no encontrado'); return; }

  const texts = frame.findAll(n => n.type === 'TEXT' && n.characters.includes('Nueva Orden'));
  for (const t of texts) {
    await figma.loadFontAsync(t.fontName);
    t.characters = 'Exportar';
  }

  figma.notify(\`✅ Fix 2/3 — CTA actualizado: "Nueva Orden" → "Exportar"\`);
})();
  `,

  // ── FIX 3: Laboratorio destino en frame 1844:1551 → Dropdown/Filled ──────
  `
(async () => {
  const frame = await figma.getNodeByIdAsync('1844:1551');
  if (!frame) { figma.notify('❌ Frame 1844:1551 no encontrado'); return; }

  // Buscar la página de componentes
  const compPage = figma.root.children.find(p => p.name.includes('00 · Componentes'));
  if (!compPage) { figma.notify('❌ Página 00 · Componentes no encontrada'); return; }

  const dropdownComp = compPage.findOne(n => n.name === 'Dropdown/Filled');
  if (!dropdownComp) { figma.notify('❌ Dropdown/Filled no encontrado en catálogo'); return; }

  // Encontrar el texto estático "Joyas Óptica" dentro del frame
  const staticTexts = frame.findAll(n => n.type === 'TEXT' && n.characters.trim() === 'Joyas Óptica');

  if (staticTexts.length === 0) {
    figma.notify('⚠️ Fix 3/3 — No se encontró texto estático "Joyas Óptica" (puede ya estar como dropdown)');
    return;
  }

  for (const textNode of staticTexts) {
    const parent = textNode.parent;
    if (!parent) continue;
    
    const idx = parent.children.indexOf(textNode);
    const absX = textNode.absoluteBoundingBox?.x ?? 0;
    const absY = textNode.absoluteBoundingBox?.y ?? 0;

    // Clonar Dropdown/Filled y posicionar en lugar del texto
    const dropdown = dropdownComp.createInstance();
    parent.insertChild(idx, dropdown);

    // Posicionar relativo al parent
    const parentAbs = parent.absoluteBoundingBox;
    if (parentAbs) {
      dropdown.x = absX - parentAbs.x;
      dropdown.y = absY - parentAbs.y - 4; // pequeño ajuste para alineación
    }

    // Redimensionar para que ocupe el mismo ancho que el área del campo
    dropdown.resize(300, 36);

    // Actualizar texto dentro del dropdown con el valor actual
    const innerText = dropdown.findOne(n => n.type === 'TEXT');
    if (innerText) {
      await figma.loadFontAsync(innerText.fontName);
      innerText.characters = 'Joyas Óptica';
    }

    // Eliminar el texto estático original
    textNode.remove();
  }

  figma.notify('✅ Fix 3/3 — "Laboratorio destino" ahora es Dropdown/Filled');
})();
  `,

];

// ─── Servidor WebSocket reemplazante ───────────────────────────────────────

console.log('[Pixel Apply] Matando servidor anterior en puerto 3000...');
try {
  execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null || true', { shell: true });
} catch (_) {}

// Esperar 500ms para que el puerto se libere
setTimeout(() => {
  const wss = new WebSocket.Server({ port: 3000 });
  let pluginConnection = null;
  let scriptIndex = 0;

  wss.on('listening', () => {
    console.log('[Pixel Apply] ✅ Servidor WebSocket activo en puerto 3000');
    console.log('[Pixel Apply] Esperando que el plugin de Figma se reconecte...');
  });

  wss.on('connection', (ws) => {
    pluginConnection = ws;
    console.log(`[Pixel Apply] Plugin conectado — enviando ${SCRIPTS.length} scripts...`);

    // Enviar scripts en secuencia con 1.5s de delay entre cada uno
    const sendNext = () => {
      if (scriptIndex >= SCRIPTS.length) {
        console.log('[Pixel Apply] 🎉 Todos los scripts enviados.');
        // Mantener el servidor activo como bridge normal
        return;
      }

      const script = SCRIPTS[scriptIndex];
      scriptIndex++;

      console.log(`[Pixel Apply] → Enviando script ${scriptIndex}/${SCRIPTS.length}`);
      ws.send(JSON.stringify({ type: 'execute', script }));

      setTimeout(sendNext, 2000);
    };

    sendNext();

    ws.on('close', () => {
      console.log('[Pixel Apply] Plugin desconectado');
      pluginConnection = null;
    });
  });

  wss.on('error', (err) => {
    console.error('[Pixel Apply] ❌ Error WebSocket:', err.message);
    process.exit(1);
  });

}, 600);

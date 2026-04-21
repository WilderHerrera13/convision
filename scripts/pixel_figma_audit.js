const fs = require('fs');
const path = require('path');

const FILE_KEY = 'dHBbcAQTlUSXGKnP6l76OS';
const TOKEN_PATH = path.join(__dirname, '../figma_token.txt');

async function main() {
    let nodeId = process.argv[2];
    if (!nodeId) {
        console.error("Uso: node scripts/pixel_figma_audit.js <node-id>");
        console.error("Ejemplo: node scripts/pixel_figma_audit.js 1758:128");
        process.exit(1);
    }

    // Normalizar node-id (ej: 1758-128 -> 1758:128)
    nodeId = nodeId.replace('-', ':');

    if (!fs.existsSync(TOKEN_PATH)) {
        console.error(`[ERROR] No se encontro el archivo de token en: ${TOKEN_PATH}`);
        process.exit(1);
    }
    
    const token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();

    try {
        const url = `https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${nodeId}`;
        const response = await fetch(url, {
            headers: {
                'X-Figma-Token': token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.nodes || !data.nodes[nodeId]) {
            console.error(`[ERROR] No se pudo encontrar el nodo ${nodeId} en el archivo.`);
            process.exit(1);
        }

        const node = data.nodes[nodeId].document;

        function printTree(n, depth = 0) {
            const indent = '  '.repeat(depth);
            let info = `${indent}- [${n.type}] ${n.name} (${n.id})`;
            if (n.fills && n.fills.length > 0 && n.fills[0].color) {
                const c = n.fills[0].color;
                const hex = ((1 << 24) + (Math.round(c.r * 255) << 16) + (Math.round(c.g * 255) << 8) + Math.round(c.b * 255)).toString(16).slice(1).toUpperCase();
                info += ` bg:#${hex}`;
            }
            if (n.characters) {
                info += ` => "${n.characters.replace(/\n/g, ' ').substring(0, 50)}"`;
            }
            console.log(info);
            if (n.children) {
                n.children.forEach(c => printTree(c, depth + 1));
            }
        }

        console.log(`[PIXEL FIGMA AUDIT] Archivo: Convision (${FILE_KEY}) | Nodo: ${nodeId}\n`);
        printTree(node);
        
    } catch (err) {
        console.error("[ERROR] Hubo un problema comunicándose con la API de Figma:", err.message);
    }
}

main();

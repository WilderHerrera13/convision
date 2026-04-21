#!/usr/bin/env node
const WebSocket = require('ws');
const readline = require('readline');

// 1. Iniciar servidor WebSocket (Puerto 3000)
const wss = new WebSocket.Server({ port: 3000 });
let activeFigmaConnection = null;

wss.on('connection', (ws) => {
    activeFigmaConnection = ws;
    ws.on('close', () => { 
        if (activeFigmaConnection === ws) activeFigmaConnection = null; 
    });
});

// 2. Servidor MCP sobre STDIO
const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout, 
    terminal: false 
});

function sendResponse(id, result) {
    console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function sendError(id, code, message) {
    console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

rl.on('line', (line) => {
    try {
        const req = JSON.parse(line);
        if (req.method === 'initialize') {
            sendResponse(req.id, {
                protocolVersion: "2024-11-05",
                capabilities: { tools: {} },
                serverInfo: { name: "pixel-figma-bridge", version: "1.0.0" }
            });
        } else if (req.method === 'tools/list') {
            sendResponse(req.id, {
                tools: [{
                    name: "execute_figma_script",
                    description: "Ejecuta código Javascript directamente en el canvas de Figma para construir UI. Usa la API local de Figma (figma.root, figma.createFrame, etc).",
                    inputSchema: { 
                        type: "object", 
                        properties: { 
                            script: { type: "string" } 
                        }, 
                        required: ["script"] 
                    }
                }]
            });
        } else if (req.method === 'tools/call') {
            if (req.params.name === 'execute_figma_script') {
                if (!activeFigmaConnection) {
                    sendResponse(req.id, { 
                        content: [{ type: "text", text: "ERROR: El plugin 'Pixel Bridge' no está conectado. Por favor corre el plugin en Figma primero." }],
                        isError: true
                    });
                } else {
                    activeFigmaConnection.send(JSON.stringify({ type: 'execute', script: req.params.arguments.script }));
                    sendResponse(req.id, { content: [{ type: "text", text: "✅ Script enviado a Figma exitosamente." }] });
                }
            }
        }
    } catch (e) { 
        // ignore parse errors
    }
});

// Lanzar UI invisible para acceso a red (WebSocket)
figma.showUI(__html__, { visible: false });

figma.ui.onmessage = async (msg) => {
    if (msg.type === 'execute') {
        try {
            // Ejecutar el script recibido en el contexto del canvas
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction(msg.script);
            await fn();
        } catch (err) {
            console.error("Error al ejecutar el script de Pixel:", err);
        }
    }
};

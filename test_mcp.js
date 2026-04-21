const { spawn } = require('child_process');

const token = process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
if (!token) {
    console.error('Set FIGMA_PERSONAL_ACCESS_TOKEN in the environment.');
    process.exit(1);
}
const figmaProcess = spawn('npx', ['-y', '@figma/mcp'], {
    env: { ...process.env, FIGMA_PERSONAL_ACCESS_TOKEN: token }
});

const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
            name: "test-client",
            version: "1.0.0"
        }
    }
};

figmaProcess.stdout.on('data', (data) => {
    console.log(`[MCP Server Response]:\n${data}`);
    // Once initialized, kill the process
    figmaProcess.kill();
});

figmaProcess.stderr.on('data', (data) => {
    console.error(`[MCP Server Error/Log]: ${data}`);
});

figmaProcess.on('close', (code) => {
    console.log(`MCP server process exited with code ${code}`);
});

// Send the initialize request
const reqStr = JSON.stringify(initRequest) + "\n";
figmaProcess.stdin.write(reqStr);

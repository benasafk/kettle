import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { CONTRACT_VERSION } from '../../packages/contracts/index.ts';

export async function handleMcp(request: Request): Promise<Response> {
  const server = new McpServer({ name: 'kettle-foundation', version: '0.1.0' });
  server.registerTool('kettle_diagnostic', {
    description: 'Check Kettle connectivity. Returns no account data and performs no writes.',
    inputSchema: z.strictObject({}),
    outputSchema: z.object({ status: z.literal('ok'), contract_version: z.literal(CONTRACT_VERSION) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { securitySchemes: [{ type: 'noauth' }] },
  }, async () => ({
    content: [{ type: 'text', text: 'Kettle foundation is reachable. Account tools are not enabled yet.' }],
    structuredContent: { status: 'ok', contract_version: CONTRACT_VERSION },
  }));
  // A new stateless transport per request works across Worker isolates. Product
  // state will live in Postgres, not an MCP session or an isolate global.
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true, maxRequestBodySize: 128 * 1024,
  });
  await server.connect(transport);
  try { return await transport.handleRequest(request); }
  finally { await server.close(); }
}

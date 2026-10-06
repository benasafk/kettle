import { ListToolsRequestSchema, ToolSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { CONTRACT_VERSION, toolContracts } from '../../packages/contracts/index.ts';

import type { createOperations, IdentityVerifier } from '../../packages/application/operations.ts';
import { bearer, challenge, type AuthConfig } from '../../packages/auth/index.ts';

export interface McpAuth {
  config: AuthConfig;
  verifier: IdentityVerifier;
  operations: ReturnType<typeof createOperations>;
}
export async function handleMcp(request: Request, auth?: McpAuth): Promise<Response> {
  const token = bearer(request);
  if (auth && request.headers.has('authorization') && (!token || !await auth.verifier.verify(token))) {
    return new Response('Authentication required', { status: 401, headers: {
      'WWW-Authenticate': challenge(auth.config), 'Cache-Control': 'no-store',
    } });
  }
  const server = new McpServer({ name: 'kettle-foundation', version: '0.1.0' });
  server.registerTool('kettle_diagnostic', {
    description: 'Check Kettle connectivity. Returns no account data and performs no writes.',
    inputSchema: z.strictObject({}),
    outputSchema: z.object({ status: z.literal('ok'), contract_version: z.literal(CONTRACT_VERSION) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { securitySchemes: [{ type: 'noauth' }] },
  }, async () => ({
    content: [{ type: 'text', text: auth ? 'Kettle is reachable. Account tools require authorization.' : 'Kettle foundation is reachable. Account tools are not enabled yet.' }],
    structuredContent: { status: 'ok', contract_version: CONTRACT_VERSION },
  }));
  if (auth) {
    for (const name of Object.keys(toolContracts) as (keyof typeof toolContracts)[]) {
      const contract = toolContracts[name];
      server.registerTool(name, {
        description: name === 'save_project' ? 'Save a complete project brief in your Kettle account with version and request-ID checks.'
          : name === 'get_project' ? 'Reopen a saved project in your Kettle account.' : 'Read your Kettle account status.',
        inputSchema: contract.input,
        outputSchema: contract.output,
        annotations: { readOnlyHint: contract.readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [contract.scope] }] },
      }, async (input: unknown) => {
        const result = await auth.operations.execute(name, token, input);
        const needsAuth = !result.ok && (result.error.code === 'UNAUTHENTICATED'
          || (result.error.code === 'FORBIDDEN' && token && !(await auth.verifier.verify(token))?.scopes.includes(contract.scope)));
        return {
          content: [{ type: 'text' as const, text: result.ok ? JSON.stringify(result.data) : result.error.message }],
          structuredContent: result, isError: !result.ok,
          ...(needsAuth ? { _meta: { 'mcp/www_authenticate': [challenge(auth.config,
            result.error.code === 'FORBIDDEN' ? 'insufficient_scope' : 'invalid_token', contract.scope)] } } : {}),
        };
      });
    }
  }
  // SDK 1.32's high-level registration only serializes _meta. Publish the
  // standard top-level securitySchemes as well, using its public list handler API.
  type AuthTool = Tool & { securitySchemes: ({ type: string; scopes?: string[] })[] };
  const diagnostic: AuthTool = {
    name: 'kettle_diagnostic', description: 'Check Kettle connectivity. Returns no account data and performs no writes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: { type: 'object', properties: { status: { const: 'ok' }, contract_version: { const: CONTRACT_VERSION } }, required: ['status', 'contract_version'] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    securitySchemes: [{ type: 'noauth' }], _meta: { securitySchemes: [{ type: 'noauth' }] },
  };
  const descriptors: AuthTool[] = [diagnostic];
  if (auth) for (const name of Object.keys(toolContracts) as (keyof typeof toolContracts)[]) {
    const contract = toolContracts[name];
    const securitySchemes = [{ type: 'oauth2', scopes: [contract.scope] }];
    descriptors.push({ name,
      description: name === 'save_project' ? 'Save a complete project brief in your Kettle account with version and request-ID checks.'
        : name === 'get_project' ? 'Reopen a saved project in your Kettle account.' : 'Read your Kettle account status.',
      inputSchema: ToolSchema.shape.inputSchema.parse({ ...z.toJSONSchema(contract.input), type: 'object' }),
      outputSchema: ToolSchema.shape.outputSchema.parse({ ...z.toJSONSchema(contract.output), type: 'object' }),
      annotations: { readOnlyHint: contract.readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      securitySchemes, _meta: { securitySchemes },
    });
  }
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: descriptors }));
  // A new stateless transport per request works across Worker isolates. Product
  // state will live in Postgres, not an MCP session or an isolate global.
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true, maxRequestBodySize: 128 * 1024,
  });
  await server.connect(transport);
  try { return await transport.handleRequest(request); }
  finally { await server.close(); }
}

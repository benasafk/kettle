import { creatorContracts } from '../../packages/contracts/creator-operations.ts';
import type { createCreatorOperations } from '../../packages/application/creator-operations.ts';
import { registerCreatorReviewResource, CREATOR_REVIEW_URI } from './creator-review-resource.ts';
import { ListToolsRequestSchema, ToolSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { CONTRACT_VERSION, toolContracts } from '../../packages/contracts/index.ts';

import { registerProjectReviewResource, PROJECT_REVIEW_URI } from './project-review-resource.ts';

import type { createOperations, IdentityVerifier } from '../../packages/application/operations.ts';
import { bearer, challenge, type AuthConfig } from '../../packages/auth/index.ts';

export interface McpAuth {
  config: AuthConfig;
  verifier: IdentityVerifier;
  operations: ReturnType<typeof createOperations>;
  creatorOperations?: ReturnType<typeof createCreatorOperations>;
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
  // One definition drives both registration and the overridden tools/list.
  // The render tool is a transport alias, never a new application operation.
  const productTools = [
    ...Object.keys(toolContracts).map((name) => ({
      name, operation: name as keyof typeof toolContracts,
      description: name === 'save_project' ? 'Save a complete project brief in your Kettle account with version and request-ID checks.'
        : name === 'get_project' ? 'Reopen a saved project in your Kettle account.' : 'Read your Kettle account status.',
      ui: undefined as { resourceUri: string } | undefined,
    })),
    {
      name: 'show_project_brief', operation: 'get_project' as const,
      description: 'Show the saved brief for an existing Kettle project as an inline review card. Use its explicit project ID. After saving corrections, call this tool to show the saved version. This tool does not generate content or save changes.',
      ui: { resourceUri: PROJECT_REVIEW_URI },
    },
  ].map((tool) => {
    const contract = toolContracts[tool.operation];
    const securitySchemes = [{ type: 'oauth2', scopes: [contract.scope] }];
    return { ...tool, contract, securitySchemes,
      annotations: { readOnlyHint: contract.readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { securitySchemes, ...(tool.ui ? { ui: tool.ui } : {}) },
    };
  });
  const creatorTools = [
    { name: 'get_creator_dna', operation: 'get_creator_dna' as const,
      description: 'Read saved Creator DNA by its explicit DNA ID, optionally at a historical version. Returns permitted evidence and limitations. Does not scan profiles or start research.', ui: undefined as { resourceUri: string } | undefined },
    { name: 'render_creator_dna', operation: 'get_creator_dna' as const,
      description: 'Show saved Creator DNA as an inline review card using its explicit DNA ID. After a correction, call this to show the saved version. Does not scan, research or generate.', ui: { resourceUri: CREATOR_REVIEW_URI } },
    { name: 'correct_creator_dna', operation: 'correct_creator_dna' as const,
      description: 'Save user-requested corrections to existing Creator DNA traits. Read the current DNA first and use its claim IDs and version. Use a new request ID for each intended correction; reuse it only for an exact retry. On version conflict, reread and reconcile with the user before retrying. Preserves history; does not scan or generate.', ui: undefined },
  ].map(tool => {
    const contract = creatorContracts[tool.operation];
    const securitySchemes = [{ type: 'oauth2', scopes: [contract.scope] }];
    return { ...tool, contract, securitySchemes,
      annotations: { readOnlyHint: contract.readOnly, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: { securitySchemes, ...(tool.ui ? { ui: tool.ui } : {}) },
    };
  });
  if (auth?.creatorOperations) {
    const operations = auth.creatorOperations;
    registerCreatorReviewResource(server);
    for (const tool of creatorTools) {
      const { contract } = tool;
      server.registerTool(tool.name, {
        description: tool.description, inputSchema: contract.input,
        outputSchema: contract.output.options[0], annotations: tool.annotations, _meta: tool._meta,
      }, async (input: unknown) => {
        const result = await operations.execute(tool.operation, token, input);
        const needsAuth = !result.ok && (result.error.code === 'UNAUTHENTICATED'
          || (result.error.code === 'FORBIDDEN' && token && !(await auth.verifier.verify(token))?.scopes.includes(contract.scope)));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          structuredContent: result, isError: !result.ok,
          ...(needsAuth ? { _meta: { 'mcp/www_authenticate': [challenge(auth.config,
            result.error.code === 'FORBIDDEN' ? 'insufficient_scope' : 'invalid_token', contract.scope)] } } : {}),
        };
      });
    }
  }
  if (auth) {
    registerProjectReviewResource(server);
    for (const tool of productTools) {
      const { contract } = tool;
      server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: contract.input,
        // SDK 1.32 validates successful results as object schemas and skips
        // validation for isError results. A discriminated union crashes its
        // object normalizer. The application still validates the full v1 union;
        // tools/list below publishes that unchanged union for clients.
        outputSchema: contract.output.options[0],
        annotations: tool.annotations, _meta: tool._meta,
      }, async (input: unknown) => {
        const result = await auth.operations.execute(tool.operation, token, input);
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
  if (auth) for (const tool of productTools) {
    descriptors.push({ name: tool.name, description: tool.description,
      inputSchema: ToolSchema.shape.inputSchema.parse({ ...z.toJSONSchema(tool.contract.input), type: 'object' }),
      outputSchema: ToolSchema.shape.outputSchema.parse({ ...z.toJSONSchema(tool.contract.output), type: 'object' }),
      annotations: tool.annotations, securitySchemes: tool.securitySchemes, _meta: tool._meta,
    });
  }
  if (auth?.creatorOperations) for (const tool of creatorTools) {
    descriptors.push({ name: tool.name, description: tool.description,
      inputSchema: ToolSchema.shape.inputSchema.parse({ ...z.toJSONSchema(tool.contract.input), type: 'object' }),
      outputSchema: ToolSchema.shape.outputSchema.parse({ ...z.toJSONSchema(tool.contract.output), type: 'object' }),
      annotations: tool.annotations, securitySchemes: tool.securitySchemes, _meta: tool._meta,
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

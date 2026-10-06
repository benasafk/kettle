import { handleMcp } from './mcp.ts';
import { website } from '../web/index.ts';
export { FoundationWorkflow } from './workflow.ts';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'kettle', stage: 1 });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(website, { headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
      } });
    }
    if (url.pathname === '/mcp') {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return new Response('Origin not allowed', { status: 403 });
      return handleMcp(request);
    }
    return new Response('Not found', { status: 404 });
  },
};

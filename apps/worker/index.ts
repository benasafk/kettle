import { handleMcp } from './mcp.ts';
import { website } from '../web/index.ts';
import { authConfig, authServices } from './auth.ts';
import { protectedResource } from '../../packages/auth/index.ts';
import { handleWebsiteAuth, websiteAuthUnavailable } from '../../packages/auth/website.ts';
export { FoundationWorkflow } from './workflow.ts';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const config = authConfig(env);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'kettle', stage: 2, auth: config ? 'configured' : 'not_configured' });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(website(config !== null), { headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      } });
    }
    if (url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/oauth-protected-resource/mcp') {
      return config && request.method === 'GET' ? Response.json(protectedResource(config)) : new Response('Not configured', { status: 404 });
    }
    if (url.pathname === '/mcp') {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) return new Response('Origin not allowed', { status: 403 });
      try {
        if (config && url.origin !== new URL(config.resource).origin) return new Response('Invalid resource origin', { status: 400 });
        return await handleMcp(request, config ? await authServices(env, config) : undefined);
      } catch { return new Response('Authentication service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/') || url.pathname === '/account') {
      if (!config) return new Response('Sign-in is not configured for this development build.', { status: 503 });
      try {
        const services = await authServices(env, config);
        return await handleWebsiteAuth(request, config, services.metadata, services.websiteVerifier, services.websiteOperations);
      } catch { return websiteAuthUnavailable(request, config); }
    }
    return new Response('Not found', { status: 404 });
  },
};

/** Local smoke entrypoint only; never referenced by production wrangler.jsonc. */
import worker from '../apps/worker/index.ts';
export { FoundationWorkflow } from '../apps/worker/workflow.ts';
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__fixture/workflow' && request.method === 'POST') {
      const request_id = crypto.randomUUID();
      const instance = await env.FOUNDATION_WORKFLOW.create({ id: request_id, params: { request_id } });
      return Response.json({ id: instance.id });
    }
    if (url.pathname.startsWith('/__fixture/workflow/') && request.method === 'GET') {
      const instance = await env.FOUNDATION_WORKFLOW.get(url.pathname.split('/').at(-1)!);
      return Response.json(await instance.status());
    }
    return worker.fetch(request);
  },
};

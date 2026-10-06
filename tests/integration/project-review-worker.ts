/** Local fixture entry only. Production configuration never imports this file. */
import { handleMcp } from '../../apps/worker/mcp.ts';
import { createOperations, failure } from '../../packages/application/operations.ts';
import { config, fixtureAuth } from '../auth-fixtures.ts';
export { FoundationWorkflow } from '../../apps/worker/workflow.ts';
export default {
  async fetch(request: Request): Promise<Response> {
    const auth = await fixtureAuth();
    return handleMcp(request, { config, verifier: auth.verifier,
      operations: createOperations(auth.verifier, { async call() { return failure('NOT_FOUND'); } }),
    });
  },
};

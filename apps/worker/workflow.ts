import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { runFoundationCheck, type FoundationCheckInput } from '../../packages/application/foundation-check.ts';

/** Runtime boundary only; no generation, dispatch or persistence claims. */
export class FoundationWorkflow extends WorkflowEntrypoint<Env, FoundationCheckInput> {
  async run(event: WorkflowEvent<FoundationCheckInput>, step: WorkflowStep) {
    return step.do('validate-foundation-input', {
      retries: { limit: 2, delay: '1 second', backoff: 'exponential' }, timeout: '10 seconds',
    }, async () => runFoundationCheck(event.payload));
  }
}

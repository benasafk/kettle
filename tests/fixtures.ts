import { SaveProjectInput } from '../packages/contracts/index.ts';
export const accountA = '11111111-1111-4111-8111-111111111111';
export const accountB = '22222222-2222-4222-8222-222222222222';
export const createInput = () => SaveProjectInput.parse({
  request_id: crypto.randomUUID(), project_id: null, expected_version: 0,
  name: 'Fictional desk lamp', project_type: 'brand',
  brief: {
    product: 'A fictional rechargeable lamp with three brightness settings',
    audience: 'Remote workers', goal: 'Show a desk setup', tone: 'Practical', language: 'en',
    duration_seconds: 20, filming_constraints: ['One person', 'Home desk'], facts: [],
  },
});

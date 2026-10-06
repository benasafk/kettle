import { Project } from '../../../packages/contracts/index.ts';

const id = '00000000-0000-4000-8000-000000000001';
const captured = '2026-10-06T09:00:00Z';
export const project: Project = {
  id, name: 'Daylight desk lamp', project_type: 'brand', current_version: 3,
  created_at: captured, updated_at: captured,
  brief_version: {
    id: '00000000-0000-4000-8000-000000000002', project_id: id,
    name: 'Daylight desk lamp', version: 3, created_at: captured,
    brief: {
      product: 'A rechargeable desk lamp with three brightness settings. Made for a little light at the end of the workday.',
      audience: 'Remote workers with a small home desk', goal: 'Show how the lamp fits into an evening work routine.',
      tone: 'Calm, clear and practical', language: 'English', duration_seconds: 20,
      filming_constraints: ['One person, at a home desk', 'Hands and product only; no face-to-camera shots'],
      facts: [
        { id: '00000000-0000-4000-8000-000000000003', statement: 'The lamp has three brightness settings.', user_confirmed: true, source: { kind: 'user', captured_at: captured } },
        { id: '00000000-0000-4000-8000-000000000004', statement: 'The lamp is rechargeable.', user_confirmed: false, source: { kind: 'url', url: 'https://example.com/daylight', captured_at: captured } },
      ],
    },
  },
};
export const emptyProject = structuredClone(project);
emptyProject.brief_version.brief.facts = [];
emptyProject.brief_version.brief.filming_constraints = [];
export const longProject = structuredClone(project);
longProject.name = longProject.brief_version.name = 'A fictional project with a very long name — ' + 'lamp'.repeat(19);
longProject.brief_version.brief.product = 'Long fictional product description.\n'.repeat(100);
longProject.brief_version.brief.audience = 'UnbrokenAudience'.repeat(60);
longProject.brief_version.brief.filming_constraints = Array.from({length:20}, (_, i) => `Constraint ${i + 1}: ${'Film at the desk. '.repeat(25)}`);
longProject.brief_version.brief.facts = Array.from({length:50}, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`,
  statement: `Fact ${i + 1}: ${'Fictional supplied detail. '.repeat(35)}`,
  user_confirmed: i % 2 === 0,
  source: { kind: 'user' as const, captured_at: captured },
}));
export const hostileProject = structuredClone(project);
hostileProject.brief_version.brief.product = '<img src=x onerror="alert(1)"> <script>alert("fixture")</script> & "quotes"';
hostileProject.brief_version.brief.facts[0]!.statement = '<svg onload=alert(1)>This stays text</svg>';

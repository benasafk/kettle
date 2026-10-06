-- Fictional fixture identities only. These are internal accounts, not login users.
insert into public.accounts(id, display_name) values
  ('11111111-1111-4111-8111-111111111111', 'Fictional Lamp Studio'),
  ('22222222-2222-4222-8222-222222222222', 'Fictional Mug Studio');

select public.kettle_save_project('11111111-1111-4111-8111-111111111111', '{
  "request_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "project_id": null,
  "expected_version": 0,
  "name": "Fictional desk lamp",
  "project_type": "brand",
  "brief": {
    "product": "A fictional rechargeable desk lamp with three brightness settings.",
    "audience": "Remote workers",
    "goal": "Show how the lamp fits a home desk",
    "tone": "Practical",
    "language": "en",
    "duration_seconds": 20,
    "filming_constraints": ["One person", "Home desk"],
    "facts": [{
      "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "statement": "The fictional lamp has three brightness settings.",
      "source": {"kind": "user", "captured_at": "2026-10-06T00:00:00Z"},
      "user_confirmed": true
    }]
  }
}'::jsonb);

-- Keys created before scopes existed get full access so existing integrations keep working.
UPDATE "api_keys"
SET "scopes" = '["content:read","content:write","preview:write","settings:read","settings:write","users:read","users:write","sites:read","sites:write","system:read","system:write"]'::jsonb
WHERE "scopes" = '[]'::jsonb;

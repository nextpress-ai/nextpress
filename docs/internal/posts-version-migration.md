# Posts `version` column migration

The `posts` table now includes `version integer NOT NULL DEFAULT 0` for optimistic concurrency (same contract as pages).

Run this against your database after pulling:

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
```

Drizzle push/migrate: use your usual workflow (`pnpm db:push` or equivalent) once approved.

# Errors and Validation

**Type:** Reference  
**Source:** `packages/sdk/src/client/`

## Two error classes

| Source | Type | When |
|--------|------|------|
| Local Zod / guards | `Error` | Before HTTP (invalid options, inputs, tokens) |
| API non-2xx | `NextpressError` | After HTTP response |

---

## NextpressError

```ts
class NextpressError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;
}
```

Thrown by `createHttpClient` when `response.ok` is false.

### Common API codes

| Code | Status | Meaning |
|------|--------|---------|
| `API_KEY_SCOPE_DENIED` | 403 | Key lacks required permission |
| (varies) | 401 | Invalid or missing auth |
| (varies) | 404 | Resource not found |

Scope denial body example:

```json
{
  "message": "This API key does not have permission for this action",
  "code": "API_KEY_SCOPE_DENIED",
  "requiredScopes": ["content:write"]
}
```

### Handling

```ts
import { isNextpressError } from "@nextpress-org/sdk";

try {
  await nextpress.pages.create({ title: "X", blocks: [] });
} catch (error) {
  if (isNextpressError(error)) {
    console.error(error.status, error.code, error.message);
    // error.body may contain requiredScopes
  } else {
    throw error;
  }
}
```

The API key is never included in error messages (verified in security tests).

---

## Local validation errors

All public resource methods call `parseInput()` with a Zod schema before `http.request()`.

Message format:

```
Invalid {label}: {zod details}
```

Examples:

- `Invalid createNextpress options: …`
- `Invalid pages.create input: …`
- `Invalid pages.get id: id is required`

### Factory options schema

`nextpressOptionsSchema` validates:

- `baseUrl` — non-empty URL string
- `apiKey` — non-empty string
- `siteId` — optional UUID
- `timeout` — optional positive number

### Block security

Creating pages/posts with blocks validates media URLs. `javascript:` and other unsafe schemes throw locally:

```
Invalid pages.create input: … Media URL must be http…
```

---

## Request options

Advanced use via `nextpress.http.request()`:

| Option | Default | Description |
|--------|---------|-------------|
| `method` | `GET` | HTTP verb |
| `query` | — | Query params (merged with siteId) |
| `body` | — | JSON object or `FormData` |
| `headers` | — | Extra headers (not Authorization) |
| `raw` | false | Return raw `Response` |
| `auth` | true | Set false for public share preview |

---

## Timeouts

Default 30 seconds. Configurable in factory options:

```ts
createNextpress({ baseUrl, apiKey, timeout: 60_000 });
```

Timeout aborts via `AbortController` and surfaces as a fetch error.

---

## 204 No Content

DELETE and some PATCH endpoints may return 204. The client returns `undefined` typed as the expected response.

---

## Type exports

Input and output types are exported from the package:

```ts
import type {
  CreatePageInput,
  UpdatePageInput,
  BlockConfig,
  Page,
} from "@nextpress-org/sdk";
```

Zod-derived schemas are also exported from `@nextpress-org/sdk` for custom validation or tooling.

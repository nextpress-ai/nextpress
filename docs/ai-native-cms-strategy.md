# Strategy: Nextpress as the Best AI-Native CMS

**Date:** 2026-06-07  
**Status:** Draft strategy  
**Goal:** Make Nextpress the best CMS for building websites and web apps with AI.

---

## North Star

AI should be able to:

1. **Understand** your site (structure, design tokens, blocks, templates)
2. **Propose and apply** changes as **drafts** with validation
3. **Preview/render** results and iterate
4. **Extend into web apps** (data, forms, custom logic) — not just static pages

MCP is one **transport layer**. The real product is an **Agent Platform** underneath.

---

## Current State (Baseline)

### Strengths

- Block tree model (`BlockConfig` in `shared/schema-types.ts`)
- REST CRUD for pages, posts, media, templates, users
- Template system with variables (`{{namespace.field}}`) and display conditions
- Separate renderer with island architecture
- WordPress-style hooks scaffold (`server/hooks.ts`)
- Global design token system (`docs/design-reference.md`)
- Self-host via Docker + CLI (`@nextpress-org/cli`)

### Gaps for AI

- Session-only auth — no API keys or scoped machine credentials
- No machine-first Agent API (agents must use human-oriented CRUD)
- No block schema registry or server-side validation on write
- No semantic operations (patch block tree, validate, preview)
- No search endpoint
- Known reliability issues (posts save, auto-save) that would corrupt agent workflows
- Plugin/hook system not fully shipped

**Gate:** An agent must be able to create a page, save it, reload it, and get identical `blocks[]` back. Without that, no AI strategy holds.

---

## Architecture: Three Layers

```
┌─────────────────────────────────────────────────────────┐
│  AI Clients                                             │
│  Cursor / Claude Code │ Webapp Copilot │ CI / Agents   │
└────────────┬──────────────────┬─────────────────┬────────┘
             │                  │                 │
┌────────────▼──────────────────▼─────────────────▼────────┐
│  Transport Layer                                        │
│  @nextpress/mcp (stdio) │ @nextpress/sdk │ Remote MCP  │
└────────────┬──────────────────┬─────────────────┬────────┘
             │                  │                 │
┌────────────▼──────────────────▼─────────────────▼────────┐
│  Nextpress Core (server)                                 │
│  Agent API v1 │ Block Schema Registry │ Webhooks/Audit  │
│  Preview/Render API                                      │
└──────────────────────────────────────────────────────────┘
```

| Layer | What it is | Where it lives |
|-------|------------|----------------|
| **Agent API** (core) | Machine-first HTTP API | **Server** (part of Nextpress app) |
| **SDK + MCP** (adapters) | Thin clients exposing tools/resources | **npm** (`@nextpress/sdk`, `@nextpress/mcp`) |
| **Web copilot** (UX) | In-admin assistant in page builder | **Webapp** (uses same Agent API) |
| **Docker** | Deployment bundle | Ships server; optional MCP sidecar — **not** primary dev interface |

### Decision Summary

| Question | Answer |
|----------|--------|
| Is MCP the strategy? | MCP is **distribution**, not the core. Core = **Agent API + schemas + safe drafts**. |
| npm, Docker, or webapp? | **All three, different roles:** server API (core), **npm** for dev agents, **webapp** for in-product AI, **Docker** for deployment. |
| What beyond MCP? | Schema registry, semantic patch API, preview loop, web copilot, collections/forms, skills, webhooks, RAG. |

**Build order:** Agent API on server → `@nextpress/sdk` → `@nextpress/mcp` (thin stdio wrapper). Docker packages what already exists.

---

## Phase 0 — Fix the Foundation (Before AI)

AI multiplies bugs. Must fix first:

| Issue | Impact on AI |
|-------|--------------|
| Posts not saving content/slug | Agents lose work |
| Auto-save unreliability | Partial/corrupt state |
| Missing search, categories, tags | Agents can't discover content |
| No block validation on write | Invalid trees persisted |

**Exit criteria:** Create page → save → reload → identical `blocks[]`. Validation rejects malformed trees.

---

## Phase 1 — Agent API (The Real Product)

Add `/api/agent/v1/*` — separate from human session auth.

### 1.1 Machine Auth

- **API keys** with scopes: `content:read`, `content:write`, `media:write`, `settings:read`, `preview`, `publish`
- Optional **OAuth2 client credentials** for enterprise
- Rate limits + audit log (who changed what, when)

Session cookies are wrong for agents.

### 1.2 Semantic Operations

Raw `PUT /api/pages/:id` with a 200-block JSON blob is fragile for LLMs. Expose **intent-level operations**:

| Operation | Purpose |
|-----------|---------|
| `getSiteContext` | Site title, theme tokens, nav, homepage, block catalog |
| `getPageTree` / `getPostTree` | Full block tree + metadata |
| `patchBlocks` | JSON Patch or block-path ops (`insert`, `update`, `move`, `delete`) |
| `applyTemplate` | Insert template by ID with variable bindings |
| `validateBlocks` | Dry-run schema + render check |
| `previewPage` | Return rendered HTML or screenshot URL |
| `publishDraft` | Explicit promotion with diff summary |
| `searchContent` | Full-text across pages/posts/media |

These map to MCP tools **and** the web copilot.

### 1.3 Block Schema Registry

Export machine-readable contracts from all blocks:

- JSON Schema per block (`core/heading`, `core/columns`, etc.)
- Allowed `content.kind`, `settings` keys, container rules
- Design token vocabulary (`TokenEntry`, `npb-*` tokens)

Expose as MCP resources (`nextpress://blocks/schema`) and validate every write.

### 1.4 Safe Mutation Model

Leverage existing `PageVersionEntry`:

- All agent writes go to **draft** first
- Return **change summary** (blocks added/removed/modified)
- Human or agent calls `publish` explicitly
- Optional "agent session" branch for multi-step edits before commit

---

## Phase 2 — MCP Implementation

### MCP Tools (actions)

- `get_site_context`
- `list_pages` / `get_page` / `patch_page_blocks`
- `create_page_from_prompt` (high-level; uses schema + templates internally)
- `upload_media`
- `preview_url`
- `search`
- `validate_blocks`

### MCP Resources (read-only)

- Block catalog + schemas
- Design tokens / theme
- Template library
- Site map (slug → title → status)

### MCP Prompts (optional)

- "Landing page for SaaS product"
- "Blog post layout with TOC and author box"

### Where MCP Runs

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **npm `@nextpress/mcp`** | Works in Cursor/Claude Desktop; versioned | Needs `NEXTPRESS_URL` + API key | **Primary** |
| **Remote MCP on server** (`/mcp` SSE) | Zero local install | Auth, scaling, spec churn | **Phase 2b** |
| **Docker-only MCP** | Easy for self-hosters | Ties AI to ops, not dev workflow | **Optional sidecar** |
| **Webapp-only** | Great for non-dev users | Useless for Cursor/CI | **Complement** |

### Package Structure

```
packages/
  sdk/           # @nextpress/sdk — typed client, all Agent API methods
  mcp/           # @nextpress/mcp — MCP server, imports sdk, stdio transport
  block-schemas/ # shared JSON schemas, generated from block definitions
```

### Developer Experience (target)

```bash
npx @nextpress/mcp --url https://mysite.com --api-key np_xxx
```

MCP server is thin (~200–400 LOC): map tools → SDK calls. **No business logic in MCP** — all logic in Agent API.

---

## Phase 3 — Webapp AI (Beyond MCP)

MCP serves **external agents** (Cursor, Claude Code, custom bots). The webapp serves **in-product users**.

### 3.1 Builder Copilot

Inside `PageBuilder`:

- Side panel chat tied to current page + selected block
- Uses same Agent API (server-side, user session or scoped key)
- Actions: "make hero taller", "add pricing section", "fix mobile layout"
- Visual feedback: highlight changed blocks; undo integrates with `useUndoRedo`

### 3.2 Agent-Native Editor Primitives

- "Generate from prompt" → creates block tree, opens in draft
- "Import from URL/Figma screenshot" → multimodal block assembly
- Diff view before apply

### 3.3 AI Settings in Admin

- BYOK model provider (user's OpenAI/Anthropic key) vs hosted
- Per-role permissions (subscriber can't let agent publish)

---

## Phase 4 — Web Apps, Not Just Websites

| Capability | Why AI Needs It |
|------------|-----------------|
| **Custom content types** | Agents model data, not only pages |
| **Collections / CRUD APIs** | "Build a job board" = schema + list UI + detail page |
| **Form blocks + submissions** | Lead gen, apps with user input |
| **Custom blocks (code)** | Agent generates React block or HTML+hydration |
| **Server hooks / edge functions** | Webhooks, auth gates, dynamic logic |
| **`isReactive` blocks** (existing flag) | Interactive components in renderer |

**Sequence:** collections API → form block → custom block SDK → hook-based server extensions.

---

## Phase 5 — Ecosystem Moat

### 5.1 Nextpress Skills

Ship agent skills (like Cursor Skills):

- `nextpress-blocks.md` — how to compose valid trees
- `nextpress-design-tokens.md` — token rules from `design-reference.md`
- `nextpress-templates.md` — variable/condition patterns

### 5.2 Webhooks + Event Stream

`page.draft_updated`, `page.published`, `media.uploaded` — external agents react (SEO audit, broken links, translation).

### 5.3 RAG Over Site Content

Embeddings index of published content for "what did we say about pricing?" — MCP resource or `search_semantic` tool.

### 5.4 Marketplace for AI Block Packs

Vetted templates: pricing table, waitlist, dashboard shell — agents insert known-good layouts.

---

## 90-Day Priority Roadmap

| Priority | Deliverable | Outcome |
|----------|-------------|---------|
| **P0** | Reliability fixes + block validation | Agents don't corrupt data |
| **P1** | API keys + Agent API (`patchBlocks`, `validate`, `preview`) | Any client can integrate |
| **P2** | Block Schema Registry + `getSiteContext` | Agents understand Nextpress |
| **P3** | `@nextpress/sdk` + `@nextpress/mcp` | Cursor/Claude work out of the box |
| **P4** | Builder copilot (webapp) | Non-dev users get AI |
| **P5** | Collections + forms | "Web apps" story becomes real |

---

## Competitive Positioning

| Competitor | Weakness | Nextpress Wedge |
|------------|----------|-----------------|
| WordPress + AI plugins | Bolt-on, inconsistent block model, PHP friction | Native block model + JS stack |
| Headless CMS (Sanity, Contentful) | Great APIs, weak visual builder | Visual builder + Agent API |
| Webflow/Framer | Visual-first, closed to agents | Self-hosted + open Agent API |

**Positioning:** Self-hosted + visual block builder + **first-class Agent API** with MCP/SDK shipped day one — same contract for Cursor and in-admin copilot.

---

## Next Steps (When Ready to Implement)

1. Draft **Agent API OpenAPI spec** (endpoints + scopes)
2. Draft **MCP tool/resource manifest** (exact tool list)
3. Plan **block schema generation** from `createBlockDefinition` / `*-model.ts` files

---

## References

- `shared/schema-types.ts` — `BlockConfig`, `PageVersionEntry`
- `docs/block-state-architecture.md` — block data flow
- `docs/design-reference.md` — design tokens
- `docs/templates-feature-spec.md` — template variables/conditions
- `server/hooks.ts` — extensibility scaffold
- `context.md` — known issues and audit findings

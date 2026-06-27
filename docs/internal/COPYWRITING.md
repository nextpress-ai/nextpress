# Copywriting Rules

Rules for all user-facing copy across the project. Agents must read this before writing admin UI strings, What's New text, dialogs, toasts, or empty states.

## Language

- No em dashes. Use commas, periods, or colons instead.
- Avoid the word "that" in explanations when you can rephrase naturally without it.
- No emojis.
- No abbreviations in user-facing text. Use full words (developers not devs, company not co.).
- Avoid risky or harsh terms like "legal" or "skip". Prefer softer alternatives like "registered" or "reduce".
- Do not expose unnecessary implementation detail (library names, API routes, query params, filter names, schema jargon). Say what the user gets or can do.

## Audience

- **Admin UI** (dashboard, import, What's New, settings): write for **site owners and editors**, not engineers.
- **GitHub release notes / deploy scripts**: may include Docker tags and CLI commands for operators.
- **Agent docs** (`context.md`, code comments): technical language is fine.

## Tone

- Professional and clear. No hype or marketing fluff.
- Direct and factual. Prefer shorter sentences over long compound ones.
- Plain words over product jargon ("Improvement" not "UX", "Bug fix" not "status=any filter fixed").

## What's New (`shared/release/release-manifest.ts`)

Each highlight needs a `kind` and user-visible outcome, not how we built it.

| Kind | Badge | Color | Use for |
|------|-------|-------|---------|
| `update` | New feature | Orange | New capability the user can try |
| `fix` | Bug fix | Red | Something broken now works |
| `improvement` | Improvement | Blue | Clearer, easier, or polished flow |

Rendered in admin via `WhatsNewHighlightItem` and `RELEASE_HIGHLIGHT_META`.

Examples:

- Good fix: "Pages list shows all your pages"
- Bad fix: "Pages admin fix (status=any filter fixed)"
- Good improvement: "Clearer WordPress import"
- Bad improvement: "Import UX: limitations dialog, failed-item details"

## Accuracy

- All pricing, rates, and business facts must match the current source of truth.
- Never invent or round figures. Use exact numbers.
- Feature descriptions must reflect actual functionality, not aspirational claims.

## Related

- **AGENTS.md** → Consumer-facing copy (admin UI) summarizes the same rules for agents.
- **docs/design-system.md** → visual tokens for admin and builder chrome.

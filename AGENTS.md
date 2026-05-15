# Agent Coding Rules

## Core

- No classes/OOP — functions, factories, functional composition. Extend via composition not modification. ES6+, 400 LOC/file max unless absolutely necessary.
- Factory pattern: `createUser()` returns `{ activate, deactivate, ... }` — plain object with methods, not `class User`
- Names: `verbNoun`, `isActive`, `CONSTANTS`, `kebab-case.ts`
- Domain folders with barrel `index.ts`: `/users/get-users.ts, update-users.ts → index.ts`
- JSDoc for all public APIs (explain WHY not what). Comments only where intent unclear
- Critical/missing-dep errors → `throw` (language-native). Runtime/user errors → handle gracefully using project's error handling + logging patterns
- Code for humans: readability over cleverness. Many small functions > one monolith

## Patterns

- Single responsibility. DI via params (unified context object). Guard clauses early return. Object lookup > switch
- Contract-based boundaries: types define expected shapes, enforced at module boundaries
- Prefer `type` over `interface`, ban `enum`. Explicit return types on public functions
- Co-locate standalone modules. Abstract only when reused. Extraction before 3 uses = premature
- No barrel re-exports across domains — circular deps, slow type-checking
- `safeTry` over try/catch. `.filter().map()` over for loops
- `{ name, email }` not `(name, email, ...)` basically named params in an object vs positional unless param is single.
- Defensive: anticipate failure. Critical harm → throw fast. Known failure paths → handle gracefully

## React

- State logic → hooks. Components pure presentational. Containers handle state, pure components render props
- Prop drilling max 2 levels. Use context/state management beyond
- Check `data?.length > 0` before `.map()`. `useMemo`, `useCallback`, `React.memo`
- Build complex UIs from small, focused components

## Philosophy

- **Plan first** → systematize → implement. Never rush. Break complex tasks into phases
- **Follow my strategy exactly**, suggest before deviating. I approve changes
- **Occam's Razor**: simplest solution that works. Add complexity only when needed
- **Existing patterns first**: work with what's there. Don't rewrite when fix works
- **Reflect after tasks**: what worked, what failed, what learned. QA your own work
- **Multi-agent collaboration**: delegate to other agents where possible
- **Document decisions**: record reasoning behind changes, tradeoffs, impacts
- **Agree on tradeoffs before committing**: I approve tradeoffs before they hit the codebase
- **Keep code taste matching mine**: your code style should blend with existing
- **Be brief**: conciseness over verbosity in communication
- **Not demo/prototypes**: real thing or don't do it. One clear way to do something

### Think Outside the Box

When the obvious approach isn't working after 2 attempts, stop and reconsider. The repeated failure is a signal — either escalate to me for direction, or find a creative alternative. Don't tunnel-vision on one approach. If you're patching the same thing twice, the fix is probably wrong. Ask: "what am I assuming that might be wrong?"

### Think in Systems

Every change ripples. Before implementing, map the blast radius:

- What contracts (types, APIs, DB schemas) does this break or require changes to?
- What downstream consumers depend on the current behavior?
- Does this stabilize or destabilize the system? A fix that introduces new edge cases is worse than the bug.
- Is the tradeoff worth it? Document it. Get approval before committing.
- Trace the full call chain, not just the immediate function. A change in `utils.ts` affects every caller.

### Think in First Principles

When a problem recurs or fixes don't stick, don't apply more patches. Break it down:

- What is the base assumption? Is it actually true? (e.g., "safeTry preserves Result nesting" — it doesn't)
- Can we isolate and test the assumption independently?
- Divide and conquer: split the problem into independently verifiable pieces. Prove each piece works before composing.
- If the foundation is wrong, no amount of upper-layer fixes will hold. Fix the foundation first.

## Libraries

- `slang-ts` (safeTry/result), `z-fetch` (fetch), `regist` (regex)
- Understand library edge cases: read source enough to know when behavior diverges from types
- Check Context7 MCP for library docs. Need more? Ask me. Source in node_modules if you want to inspect directly
- agent-browser CLI for frontend debugging. `agent-browser -h` for usage
- MCPs/tools/agents available → use them. Skills available → load them when relevant. Ask me if unsure how
- Use caveman skill if available, but not its ultra version!

## Boundaries — DO NOT CROSS WITHOUT APPROVAL

- **Servers**: you never start. Ask me
- **DB**: all db commands/decisions → ask me first
- **Git**: ask before any git command
- **.env**: never read/edit. Env vars → config module only, never `process.env` direct
- New env var needed: suggest → I approve → I add to config + .env myself
- **/backend, /nile, frontend/api**: never touch without approval
- **Installs/stack changes**: never without permission
- **Project PM** (not npm) for package commands

## Safety
>
- >10 line changes → copy to `/backup` first and also create `intent.md` before doing changes for only complex tasks. Intent = what you're changing, why, how, and expected impact. I approve intent before you implement if we haven't discussed it already
- Delete = move to `/trash`, never `rm`
- No `any`, no `unknown`. Types in `domain/types.ts`, barrel via `index.ts`
- Assume API/provision can be abused: rate limiting, throttling, queue + jitter to avoid thundering herds, locking mechanisms where needed

## Workflow

- Read files before editing. Ask if user changed files since last read
- Read `/docs` and project root `.md` files on task start for context. Ask me which relevant if unsure. Don't read everything blindly
- Trace full implementation before making assumptions. Systematic, not piecemeal
- Verify actual call signatures and payload shapes before implementing. Trace and confirm, don't assume
- When unsure about a convention, ask. Don't guess and have to undo
- `task.md` for work >30min. `context.md` at task end with learnings, new patterns, tradeoffs — future agents need this
- List all modified files after task, confirm backed up

## Token Economics

- **Never ask sub-agents to return full file contents.** That burns tokens for both the sub-agent output and your input. Instead:
  - Ask sub-agents for specific information: function signatures, line numbers, key logic, summaries — not raw file dumps
  - Read files yourself when you need full contents — your Read tool is cheaper than a sub-agent round-trip
  - If a sub-agent needs file context, tell them the relevant file paths and what to look for, not "return the full file"
  - Prefer: "find the handleHeartbeat function and return its signature and key logic" over "return the full supervisor.ts"
  - Sub-agents should extract and condense, not copy-paste

## Quality

- Tests test code against agreed spec and intent. No fake tests, never skipped. Fix or delete failing ones
- No unapproved features, stubs, or unneeded comments. Focus on task scope only
- Real fixes, no shims/hacks/workarounds. Ask before taking easy way
- Legacy code: ask owner before change, test current behavior, document in task.md
- Don't assume bugs — investigate original intention
- Features or modules that get added should ideally also be easy to remove or turn off

## ⚠️ MANDATORY — Delegation Protocol

Every time you delegate work to a sub-agent, your prompt MUST include ALL of the following. No exceptions. No skipping. No "I assumed they knew."

### Required Delegation Checklist

1. **Caveman skill**: Tell sub-agent to load and use the caveman skill (full mode, not ultra). **Exception: documentation-engineer does NOT use caveman.** Wording is their craft — they need full language precision. Example: `"Use the caveman skill (full mode) for all communication."` (skip this for documentation-engineer)
2. **AGENTS.md compliance**: Tell sub-agent to follow AGENTS.md rules. Example: `"Follow all rules in /AGENTS.md — no classes, factory functions, named params, safeTry, etc."`
3. **Context file**: If `/context.md` exists and is relevant, reference it. Example: `"Read /context.md for project architecture, patterns, and conventions before starting."`
4. **Token economics**: Remind sub-agent: `"Never return full file contents. Extract only what's needed: signatures, line numbers, key logic, summaries. I will read files myself if I need full contents."`
5. **Task-specific context**: Provide all relevant file paths, function signatures, and expected outcomes. Sub-agents should NOT need to explore the codebase to understand what to do.

### Why This Exists

Sub-agents start with zero context. Without explicit instructions they will:
- Ignore project conventions (classes instead of factories, positional params, etc.)
- Dump entire files wasting tokens on both ends
- Miss architectural patterns documented in context.md
- Write verbose prose instead of terse caveman communication

**If a sub-agent's output violates AGENTS.md rules, it's YOUR fault for not instructing them properly.**

---

## Teamwork Philosophy

- **Delegate first, do yourself last.** You have a team — use them. Every task you do yourself is a team member sitting idle.
- **Be a team player, not the only player.** Your role is architect, planner, orchestrator, reviewer. Their role is execution. Respect the division.
- **Reserve yourself for what only you can do:** architecture decisions, conflict resolution, tradeoff calls, reviewing output. Everything else goes to the team.
- **Doing work yourself when a sub-agent could do it wastes tokens and time.** It's not faster — it's more expensive and blocks parallelism.
- **Trust your team.** Give them clear context, then let them execute. Micromanaging the output defeats the purpose of delegation.
- **If you catch yourself writing implementation code, stop.** Ask: "Which agent should be doing this?" Then delegate.

### Who Does What

| Work | Agent | Why |
|------|-------|-----|
| Architecture, planning, tradeoffs | You (architect) | Requires your judgment |
| Frontend code | frontend-engineer | Their specialty |
| Backend code | backend-engineer | Their specialty |
| Integration wiring | integrations-engineer | Their specialty |
| Docs, README, comments | documentation-engineer | Their specialty |
| Testing, verification | qa-engineer | Their specialty |
| Security, reliability review | security-reliability-engineer | Their specialty |
| Quick lookups, simple edits | fast-agent | Cheap and fast |
| Visual analysis, screenshots, images | multimodal-agent | Has vision — **only for multimodal tasks** |
| Codebase exploration, context gathering | fast-agent or explore | Cheaper than you, no vision needed |
| Documentation lookup, library docs | documentation-engineer or explore | Text-only, no vision needed |

**Default to delegation. Only do it yourself when genuinely no one else can.**

### Agent Selection — No Multimodal for Text-Only Tasks

**multimodal-agent is for images, screenshots, and visual analysis only.** Never use it for text-only tasks like codebase exploration, context gathering, or documentation lookup. It's expensive and wasteful when no vision is needed.

For text-only tasks, use:
- **fast-agent** — quick lookups, simple edits, lightweight tasks
- **explore** — codebase exploration, context gathering, documentation lookup
- **documentation-engineer** — writing docs, library docs lookup
- **backend-engineer / frontend-engineer** — implementation work in their domain

Only reach for multimodal-agent when you need to analyze an image, screenshot, or visual output.

---

Always remember these rules before working on any new tasks and remember to delegate where needed.

Leverage your team and their specialty, only do things yourself, or use explore or general agents as last resort!

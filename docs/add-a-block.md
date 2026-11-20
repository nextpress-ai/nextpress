# Adding a block

Every block exists in three places that must look the same: the **editor canvas** (`client/…/blocks`), the **published page** (`renderer/react`, rendered on the server) and **agents** (the shared catalog, which the SDK, MCP and the AI assistant read). Miss one and the block works in one place and breaks in another.

## Checklist

1. **Name**: add it to `shared/block-catalog/block-names.ts`.
2. **Model**: `shared/blocks/<name>-model.ts`. It holds:
   - the content type and its defaults;
   - a forgiving `read<Name>Content(content)`: unknown or missing values fall back to defaults, and it never throws;
   - small helpers, such as CSS variables or element ids.

   Use `readStructuredData`, `readChoice`, `readCount` and `readText` from `shared/blocks/read-structured.ts`.
3. **Catalog entry** (`shared/block-catalog/*-blocks.ts`):
   - the basics: `label`, `description`, `category` and `kind` (`block` or `container`);
   - `defaultContent` (`structured(DEFAULTS)`) and `defaultStyles`;
   - `defaultChildren` for containers that start with items. Build these by hand, like `design-blocks.ts` does; importing `createDefaultBlock` here is circular.
   - `placement.parents` when the block only works inside another. The page check then refuses it anywhere else.
4. **Agent note** in `shared/block-catalog/agent-notes.ts` (TypeScript makes you): when to use it, the fields that matter, and what not to do. A field that isn't in the defaults also goes in `shared/block-catalog/content-fields.ts`, or agents are refused when they set it.
5. **Editor block** in `client/src/components/PageBuilder/blocks/<name>/`, built with `createBlockDefinition`:
   - pass `...catalogMeta(name)`, `icon`, `defaultContent`, `parseContent` (the model's reader), `render` and `settings`;
   - containers set `handlesOwnChildren: true` and render children through `ContainerChildren`;
   - the settings panel follows `docs/design-system.md` §16: `CollapsibleCard`, `SettingsLabel`, chips over free text, and plain words;
   - register the block in `blocks/index.ts`.
6. **Published view** at `renderer/react/<group>/<name>.tsx`:
   - a plain function component: `getRenderProps(block)` for style, class and attributes, and `renderChildBlocks(children)` for children;
   - no hooks or state, since it renders on the server;
   - the **same classes and structure** as the canvas, so one stylesheet serves both;
   - register it in `renderer/react/block-components.tsx`.
7. **CSS** in `shared/blocks/<name>-css.ts`, appended to `PUBLISH_BLOCK_CSS` through `shared/blocks/blocks-css.ts`:
   - prefer a class plus inline CSS variables (`--np-…`) set from content over CSS generated per block;
   - phone is ≤767px and tablet is 768–1023px. Write each rule twice: `@media (max-width: 767px)` for published pages and `@container npb-canvas (max-width: 767px)` scoped to `.npb-canvas-page` for the editor's device preview;
   - animate only `transform` and `opacity`, and stop movement under `prefers-reduced-motion` (design system §8).
8. **Behaviour on published pages**: published pages run no React. Interactivity is a small vanilla script in `client/public/vendor/<name>.js`:
   - it installs once (guard flag), uses event delegation, and handles the keyboard and ARIA;
   - `server/routes/shared/build-published-page-html.ts` loads it only when the page has the block;
   - the editor does the same thing with React state.
9. **Agents**: add an identifying field to `STRUCTURED_FIELDS` in `shared/page-tools/outline-page.ts` (a title or text), so the page outline shows it.
10. **Tests**:
    - the published view (`renderToString`), the editor canvas and settings (Testing Library), and the vendor script (`client/src/test/vendor-*.test.ts`);
    - update the defaults snapshot (`npx vitest run client/src/test/block-defaults-snapshot.test.ts -u`) only after checking the diff is just your block.
11. **SDK / MCP**: they read the catalog, so `blocks.fromName(name)` and `change_page_blocks` work automatically. Rebuild the SDK (`pnpm build` in `packages/sdk`) before running the MCP tests, then note the block in both changelogs.

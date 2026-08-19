# NextPress release demo video — agent workflow

Reusable workflow for producing a short **announcement / demo MP4** for a NextPress release.  
Scripts live in the repo root `scripts/` folder; outputs go to `release-assets/<version>/`.

**Read the owner messages below first.** They are copied verbatim from the chat transcript (including typos). Later messages override earlier ones where they conflict.

---

## Owner messages (verbatim, in order)

### Message 1 — 2026-08-19 ~2:58 AM

```text
now do you think you can make some short video for announcing this version? is it possible? a demo video?
```

### Message 2 — 2026-08-19 ~3:15 AM

```text
NextPress 1.3.5 announcement demo video

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
```

### Message 3 — 2026-08-19 ~3:32 AM (re-run after v1)

```text
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
```

### Message 4 — 2026-08-19 ~3:32 AM (v2 creative direction)

```text
amazing, have seen video, but do it when nextpress is in light mode, and for transition say you need to go to another page or something as page is loading, show some simple anitmation of the feature you going to show next with some svg icons animated or some ilustration but simple... something to keep user engagged, and also can have a second audio that is slow moving so you play it in such case then put back the fast playing one when the page is laoding and you demoing feature, also show some nice blog pages or examples of what one can do with next press with visual and colorful stuff or using selected theme, in theme showcase show selecting diferrent themes and also as I said do all this in light mode. but nice work so far!
```

### Message 5 — 2026-08-19 ~3:57 AM (v3 corrections — **current rules**)

```text
ok not bad, ok remove the different music speed requirement, have harmonic music accross, full flow and matching no need for slow and fast, when demoing feature don't again add explain text, you only show that on the animation phase we talked of, use nextpress logo in animation and colors, show example stuff on end only... and not everything only the pretty ones 3 at max.
```

### Message 6 — 2026-08-19 ~4:18 AM (black frame + this document)

User also attached a screenshot of the black-frame artifact.

```text
why is it there's this when you showing another screen? is this a defect in current nextpress or? also can you write all this into a re-usable easy to follow workflow for other agents with all the corrections I have said so far including my exact messages
```

### Message 7 — 2026-08-19 ~4:23 AM

```text
am not seeing my orignal mesages in the worlfow file
```

### Message 8 — 2026-08-19 ~4:30 AM (v4 rebuild)

```text
see @scripts/release-demo-video/WORKFLOW.md follow it and generate a video, you can see release assets for what another agent tempted but they had not got things right, for browser use agent broswer cli or as workflow says not your chrome bs or plugins or whatever, plan first then act.
```

### Planning UI choices (not typed as chat messages)

During planning, the owner confirmed via Cursor **AskQuestion** prompts (not separate chat messages):

| Question | Choice |
|----------|--------|
| Video format | ~60s silent demo with on-screen title cards |
| Local app for recording | Yes — agent may start `pnpm dev` on `:5000` |
| Background audio | Agent picks a short royalty-free track |

The production plan also states the agent acts as **producer end-to-end** (script, record, edit, music, deliver finished MP4).

---

## Consolidated rules (after all corrections)

| Topic | Do | Don’t |
|-------|----|-------|
| **Length** | ~60–120s is fine; prioritize clarity over cramming | Don’t list every fix from the release checklist |
| **Browser** | Drive everything through the `agent-browser` CLI | No Chrome extensions / MCP browser tools / manual clicking |
| **Light mode** | Force light before and during capture (`localStorage npb-theme=light`, `ab set media light`, click “Switch to light mode” if shown) | Don’t ship demo with dark admin chrome unless product default changed |
| **Explain text** | **Only** on transition/animation cards (“Opening the page builder…”) | No lower-thirds, captions, or titles **on** feature demo footage |
| **Transitions** | 2.6s branded cards **between** segments; NextPress **logo mark**, animated lucide glyph on brand blue `#3b82f6`, light `#f8fafc` background, filling progress bar | Don’t record transitions in a headless browser (they export black); use the ffmpeg generator |
| **Music** | **One** continuous harmonic bed, same tempo/volume end-to-end | No slow/fast dual track (removed per Message 5) |
| **Example sites** | **End only**, **max 3 pretty** public demos | Don’t open 4+ sites; don’t put showcase at the start |
| **Theme showcase** | Theme editor: apply several palettes and let the live preview repaint | Don’t point at a built-in theme (read-only, no palettes) |
| **Login** | Login **before** the first `record start`; credentials never in frame | Don’t flash login mid-segment |
| **Voice** | Silent + music + on-screen transition copy | No voiceover unless owner asks |

**Recommended 3 showcase slugs** (seeded demo pages):

- `demo-nimbus-saas` — SaaS landing  
- `demo-oak-ember-cafe` — local business  
- `demo-studio-meridian` — portfolio  

Skip blog/newsletter slugs for the “pretty end montage” unless owner asks.

---

## The dark blank frame: what it is and how it is now fixed

**Not a NextPress bug.** Measured on the raw v4 captures:

| Video time | 10th/90th luma percentile | What it is |
|-----------|---------------------------|------------|
| `0.0s → ~6–10s` | `YLOW == YHIGH == 37` | `record start` boots a **fresh browser context**; the recorder rolls through the blank canvas and the app's own loading state |
| after that | `YLOW 30 / YHIGH 235` | real UI |

Two rules kill it:

1. **One URL per segment.** `record start` takes the url as its second argument, and nothing in the segment navigates again. With this alone, every v4 segment had *exactly one* blank run and it was always at position 0. Interior black frames — the thing the owner screenshotted — disappeared entirely.
2. **Content-based trimming in post.** `post-produce-release-demo.sh` runs `signalstats` over each clip and cuts every run where `YHIGH - YLOW <= 25`.

Why percentiles and not min/max or a black filter:

- `blackdetect` misses it — the loading state is not pure black.
- `YMIN`/`YMAX` misses it too — a mostly-uniform frame with a small spinner still has a wide min/max spread, so the detector stops too early and leaves seconds of spinner in the cut.
- `YLOW`/`YHIGH` (10th/90th percentile) collapse to zero spread for *both* the blank canvas and the spinner, and jump to ~205 the moment real UI paints. One ffmpeg pass, no per-frame ImageMagick.

**Do not** try to calibrate the trim from wall-clock time around `record start`. The recorded timeline does not include browser-context startup, so measured lead-ins overshoot — in testing they exceeded the clip's own duration.

The only interior blank that survives by design is the **live-preview iframe load** in `05-preview` (~2.5s); the de-blank pass cuts it out.

---

## Tools & files

| Item | Path |
|------|------|
| Record segments | [`scripts/record-release-demo-1.3.5.sh`](../record-release-demo-1.3.5.sh) |
| Transition cards | [`scripts/generate-demo-transitions.sh`](../generate-demo-transitions.sh) |
| Assemble MP4 | [`scripts/post-produce-release-demo.sh`](../post-produce-release-demo.sh) |
| Lucide glyph extractor | [`scripts/release-demo-video/lib/extract-icons.mjs`](lib/extract-icons.mjs) |
| Logo (transitions) | [`client/public/logo.svg`](../../client/public/logo.svg) → `transitions/_build/logo-mark.png` |
| Demo page seed | `pnpm seed:demo-pages` (see `docs/internal/demo-pages.md`) |
| Output | `release-assets/<version>/nextpress-<version>-demo.mp4` |
| Music attribution | `release-assets/<version>/MUSIC-ATTRIBUTION.txt` |

**Requires:** `agent-browser`, `ffmpeg`, `curl`, `jq`, ImageMagick `convert`, `node`, dev server on `:5000`.

**Default credentials:** `responsive-fixtures@example.com` / `TestPass1`  
Site, page and theme ids are resolved from the API at run time; override with `DEMO_SITE_ID` if needed.

---

## Video structure (current, ~103s)

```
intro (logo + "NextPress 1.3.5")
  → transition → 01 inline edit      (heading retyped, canvas updates live)
  → transition → 02 Ctrl+K palette   (on the dashboard)
  → transition → 03 theme editor     (Classic / Slate / Forest / Sunset)
  → transition → 04 pages            (card view + site menu reorder)
  → transition → 05 live preview     (rails collapsed, full-width render)
  → transition → 06 delete + undo    (block removed, then restored)
  → transition → 07 showcase         (3 public demos, back to back)
outro ("Available now · 1.3.5")
```

Single music track under the full timeline.

---

## Step-by-step for agents

### 0. Prep

```bash
# Terminal A (the agent may start this itself)
pnpm dev

# Terminal B — seed once
pnpm seed:demo-pages
```

Confirm: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/` → `200`.

> `pnpm seed:demo-pages -- --via-api` is **broken**: `listApiPages()` calls
> `/api/pages?limit=100&status=any` with no `siteId`, and the endpoint 400s.
> Use the plain (direct-DB) form.

### 1. Record segments (light mode)

```bash
./scripts/record-release-demo-1.3.5.sh                 # all
./scripts/record-release-demo-1.3.5.sh 03-themes       # just one
```

Sanity-check that no clip is all blank:

```bash
for f in release-assets/1.3.5/segments/*.webm; do
  printf "%-28s %ss\n" "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done
```

Raw clips legitimately carry 6–10s of blank lead-in; post-production removes it.
A clip under ~8s total, though, means the interaction failed — re-record that one.

### 2. Generate transition cards

```bash
./scripts/generate-demo-transitions.sh
```

ffmpeg only — **never** browser-recorded HTML transitions.

### 3. Post-produce

```bash
./scripts/post-produce-release-demo.sh
```

It regenerates the cards, de-blanks each segment, concatenates, and lays the music bed.
Deliverable: `release-assets/1.3.5/nextpress-1.3.5-demo.mp4`

### 4. QA checklist

Automated — every uniform run in the final file must line up with an intended card:

```bash
ffmpeg -hide_banner -loglevel verbose -i release-assets/1.3.5/nextpress-1.3.5-demo.mp4 \
  -vf "signalstats,metadata=print" -f null - 2>&1 | awk '
  BEGIN{n=0}
  /pts_time:/ { split($0,a,"pts_time:"); t=a[2]+0 }
  /signalstats.YLOW=/ { split($0,b,"="); lo=b[2]+0 }
  /signalstats.YHIGH=/ { split($0,b,"="); hi=b[2]+0
    blank=(hi-lo<=25)
    if(blank&&!r){r=1;s=t}
    if(!blank&&r){r=0; if(t-s>0.3) printf "%6.2f -> %6.2f\n", s,t}
  } END{ if(r) printf "%6.2f -> EOF\n", s }'
```

Then confirm by eye:

- [ ] Intro/outro light background + logo mark  
- [ ] Transition cards show logo, glyph, title, “Opening…” subtitle, progress bar — **no** explain text on demo clips  
- [ ] Admin UI in light mode (main panels white; dark sidebar is normal product chrome)  
- [ ] No login/password visible  
- [ ] Music continuous, no tempo changes, no silent gaps (`silencedetect`)  
- [ ] Showcase **only at end**, **3** sites max  
- [ ] Card frames are near-white, not black (`-format '%[fx:mean]'` ≈ 0.95)  
- [ ] File size reasonable for GitHub release (<15 MB target)

### 5. Optional publish

```bash
gh release upload v1.3.5 release-assets/1.3.5/nextpress-1.3.5-demo.mp4
```

Only if owner asks.

---

## Segment map (record script)

| File | Shows | URL |
|------|--------|-----|
| `01-inline-edit.webm` | Select heading → retype in inspector → canvas updates live | builder |
| `02-cmdk.webm` | Ctrl+K → type “theme” → results filter | `/admin/dashboard` |
| `03-themes.webm` | Apply Classic / Slate / Forest / Sunset, live preview repaints | `/admin/themes/<editable id>` |
| `04-pages.webm` | List → Cards → Site menu → re-position to 1 | `/admin/pages` |
| `05-preview.webm` | Collapse both rails → Live preview full width → scroll | builder |
| `06-undo.webm` | Delete heading → toast → **toolbar** Undo → restored | builder |
| `07a/07b/07c-showcase-*.webm` | Nimbus, Oak & Ember, Studio Meridian — one file each | `/page/<slug>` |

Showcase is three separate recordings on purpose: one URL per file means no clip
contains a navigation, so no clip contains an interior black frame.

---

## Selectors that actually work

Guessing these wrong is what produced the dead segments in earlier runs.

| Target | Selector | Note |
|--------|----------|------|
| Palette preset | `button[aria-label="Apply Forest palette"]` | Button **text is a swatch**; matching `textContent === "Forest"` finds nothing |
| Canvas block | `xpath=//*[@data-block-id="saas-pricing-title"]/ancestor::*[@role="group"][1]` | The toolbar attaches to the `role="group"` wrapper, not the inner block div |
| Block toolbar | `button[aria-label="Edit block" \| "Delete block" \| "Duplicate block"]` | Only present while a block is selected; `scrollintoview` first |
| Heading text | `input[aria-label="Heading text"]` | There is **no** contenteditable canvas editing in 1.3.5 |
| Editor undo | `button[aria-label="Undo"]` | Toolbar control |
| Text-bearing button | `xpath=//button[contains(.,"Site menu")]` | `text=` and `:has-text()` are **not** supported; `find text X click` needs an exact text node |
| Menu re-position | `xpath=//button[contains(@aria-label,"Re-position Studio Meridian")]` then `xpath=//*[@role="option"][normalize-space(.)="1"]` | Real reorder; synthetic `DragEvent`s do nothing |

Use real `ab click` / `ab keyboard type`, not `eval`-dispatched events: synthetic
events update React but render no cursor and no typing animation.

---

## Product issues found while recording (report, don’t work around silently)

| Issue | Evidence | Impact on demo |
|-------|----------|----------------|
| **“Block deleted” toast Undo does nothing** | Delete a block → click the toast’s `Undo`. Block count stays down and the block is not restored — reproduced with a direct `.click()` on the button, so it is not an automation artifact. The toolbar `aria-label="Undo"` restores correctly (19 → 20 blocks). | `06-undo` drives the **toolbar** Undo |
| Nimbus hero wraps badly at mobile breakpoint | Builder → Mobile preview: lead paragraph wraps one or two characters per line over the wordmark | Breakpoint switching left out of `05-preview` |
| `seed:demo-pages --via-api` 400s | `listApiPages()` omits `siteId` | Use the direct-DB form |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Themes segment ~1s / read-only page | Script picked a **built-in** theme (`Default`), which renders “Create your own copy” and has no palette presets | Resolve an **editable** theme: `jq -r '[.[] \| select(.name != "Default")][0].id'` |
| Segment ends before the payoff | Recorder drops the last beat | `record_stop()` holds 1.5s before cutting |
| Black transition card | Browser-recorded HTML transitions | Use `generate-demo-transitions.sh` (ffmpeg) |
| Logo missing from cards | `logo.svg` root carries `fill="none"`, and ImageMagick has **no SVG delegate** here (no `librsvg`) | The generator extracts the mark’s path data and draws it with an explicit fill |
| Progress bar renders full width instantly | `drawbox` evaluates `w`/`h`/`x`/`y` **once** in ffmpeg 6.x, not per frame | Build the fill from fixed-width steps switched on via `enable='gte(t,…)'` (timeline *is* per-frame) |
| Trim cuts into real content | Wall-clock lead-in ≠ video lead-in | Detect content from frames (see the blank-frame section) |
| Dark admin despite light flag | Theme toggle not clicked | `ensure_light` after every load; the button is labelled by its **destination** (“Switch to light mode” only exists while dark) |
| Builder shows stale content | `localStorage` key `page-builder:page:<id>` holds an unsaved draft | Record script clears `page-builder:*` during off-camera setup |
| Session 404s mid-run | Login lost after context churn | Log in again before recording; the script does this each invocation |

---

## Versioning note

Script names include `1.3.5` for the release they were built for. For the next release:

1. Copy/adjust the segment list in `record-release-demo-*.sh` and the `ORDER` array in `post-produce-release-demo.sh`.  
2. Set `DEMO_VERSION=<new-version>` (drives `release-assets/<version>/` and the card badge).  
3. Re-check the selector table above against the new UI.

---

## Related internal docs (local, may be gitignored)

- `docs/internal/release-1.3.5-announcement.md` — what shipped (for picking features)  
- `docs/internal/demo-pages.md` — demo slugs and seed commands  
- `docs/internal/COPYWRITING.md` — consumer-facing copy tone for transition titles

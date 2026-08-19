#!/usr/bin/env bash
# Record NextPress 1.3.5 demo segments (light mode) with agent-browser.
#
# Rules this script exists to enforce (see scripts/release-demo-video/WORKFLOW.md):
#   * Log in OFF camera, before the first `record start`.
#   * Exactly ONE url per segment. `record start` spins up a fresh browser
#     context, so any in-segment navigation paints a blank/black frame.
#     Navigation between features is covered by the post-produced transition
#     cards instead.
#   * Drive the UI with real clicks and real keystrokes. Synthetic events
#     dispatched through `eval` update React but render no cursor and no
#     typing animation, which reads as a frozen screenshot on video.
#   * Hold on the final state before `record stop` -- the recorder drops the
#     last beat, and post-production cuts the page-load blank by inspecting
#     frame content, so nothing here needs to time it.
#
# Usage:
#   ./scripts/record-release-demo-1.3.5.sh                 # all segments
#   ./scripts/record-release-demo-1.3.5.sh 03-themes 06-undo   # just these
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${DEMO_VERSION:-1.3.5}"
SESSION="${DEMO_SESSION:-release-demo-135-v3}"
BASE="${DEMO_BASE_URL:-http://localhost:5000}"
EMAIL="${SEED_EMAIL:-responsive-fixtures@example.com}"
PASS="${SEED_PASSWORD:-TestPass1}"
OUT_DIR="${DEMO_OUT_DIR:-$ROOT/release-assets/$VERSION}"
SEG_DIR="$OUT_DIR/segments"
COOKIES="$(mktemp -t nextpress-demo-cookies.XXXXXX)"

mkdir -p "$SEG_DIR"
trap 'rm -f "$COOKIES"' EXIT

ab() { agent-browser --session "$SESSION" "$@"; }

want() {
  # No segment filter given -> record everything.
  [[ ${#ONLY[@]} -eq 0 ]] && return 0
  local seg
  for seg in "${ONLY[@]}"; do [[ "$seg" == "$1" ]] && return 0; done
  return 1
}

# Admin chrome must be light before anything is captured. The toggle button is
# labelled by its *destination*, so it only exists while we are still dark.
ensure_light() {
  ab eval '(() => {
    localStorage.setItem("npb-theme", "light");
    document.documentElement.classList.remove("dark");
    const toggle = [...document.querySelectorAll("button")]
      .find((b) => b.getAttribute("aria-label") === "Switch to light mode");
    if (toggle) toggle.click();
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  })()' >/dev/null
}

# record_start <name> <url> <ready-selector> <settle-ms>
# Starts recording and waits for the app to actually paint before acting.
#
# The clip still opens on several seconds of blank canvas: `record start` boots
# a fresh browser context and the recorder rolls through that, and wall-clock
# timing here does not map onto the video timeline (context startup is excluded
# from the file). Post-production therefore finds the load by inspecting frame
# content rather than by anything measured here.
record_start() {
  local name="$1" url="$2" ready="$3" settle="$4"
  local file="$SEG_DIR/${name}.webm"

  echo "[record] → ${name}"
  ab record start "$file" "$url" >/dev/null
  ab wait "$ready" >/dev/null 2>&1 || ab wait 3000 >/dev/null
  ensure_light
  ab wait "$settle" >/dev/null
}

record_stop() {
  # The recorder drops roughly the last beat of the clip, so hold on the final
  # state before cutting or the payoff frame never makes it into the file.
  ab wait 1500 >/dev/null
  ab record stop >/dev/null
  echo "[record]   saved"
}

# ---------------------------------------------------------------------------
ONLY=("$@")

echo "[record] Resolving content ids from ${BASE}..."
curl -s -c "$COOKIES" -b "$COOKIES" \
  -X POST "${BASE}/api/auth/sign-in/email" \
  -H "Content-Type: application/json" -H "Origin: ${BASE}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" >/dev/null

api() { curl -s -b "$COOKIES" -H "Origin: ${BASE}" "$@"; }

SITE_ID="${DEMO_SITE_ID:-$(api "${BASE}/api/sites" | jq -r '(.sites // .)[0].id')}"
[[ -z "$SITE_ID" || "$SITE_ID" == "null" ]] && { echo "[record] No site found" >&2; exit 1; }

PAGE_NIMBUS=$(api "${BASE}/api/pages?limit=100&status=any&siteId=${SITE_ID}" \
  | jq -r '.pages[] | select(.slug=="demo-nimbus-saas") | .id' | head -1)
if [[ -z "$PAGE_NIMBUS" ]]; then
  echo "[record] Demo pages missing — run: pnpm seed:demo-pages" >&2
  exit 1
fi

# The theme *editor* only has palette presets on a user-owned theme. Built-in
# themes render read-only ("Create your own copy"), which is what made the old
# themes segment a 1.2s dead clip.
THEME_ID=$(api "${BASE}/api/themes" \
  | jq -r '[.[] | select(.name != "Default")][0].id // .[0].id')
[[ -z "$THEME_ID" || "$THEME_ID" == "null" ]] && { echo "[record] No theme found" >&2; exit 1; }

BUILDER_URL="${BASE}/admin/page-builder/page/${PAGE_NIMBUS}?mode=builder"
pub() { echo "${BASE}/page/$1"; }

echo "[record] site=${SITE_ID}"
echo "[record] page=${PAGE_NIMBUS}"
echo "[record] theme=${THEME_ID}"

# --- off-camera session setup ---------------------------------------------
ab close --all >/dev/null 2>&1 || true
ab set viewport 1280 720 >/dev/null
ab set media light >/dev/null
ab open "${BASE}/admin/login" >/dev/null
ab wait 3000 >/dev/null
ab fill 'input[name="username"]' "$EMAIL" >/dev/null
ab fill 'input[name="password"]' "$PASS" >/dev/null
ab click 'button[type="submit"]' >/dev/null
ab wait 4500 >/dev/null
ensure_light

# Start every run from pristine UI state: no leftover builder draft, pages list
# back on List view so the Cards toggle has something to show.
ab eval '(() => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("page-builder:"))
    .forEach((k) => localStorage.removeItem(k));
  localStorage.setItem("npb:admin:pages:view-mode", "list");
  return true;
})()' >/dev/null

if [[ "$(ab get url)" == *"/admin/login"* ]]; then
  echo "[record] Login failed — check SEED_EMAIL / SEED_PASSWORD" >&2
  exit 1
fi

# --- 1. Inline edit --------------------------------------------------------
# Select a heading, retype it, and let the canvas update live under the cursor.
if want 01-inline-edit; then
  record_start 01-inline-edit "$BUILDER_URL" '[data-block-id="saas-features-title"]' 2200

  ab click 'xpath=//*[@data-block-id="saas-features-title"]/ancestor::*[@role="group"][1]' >/dev/null
  ab wait 1600 >/dev/null
  ab click 'input[aria-label="Heading text"]' >/dev/null
  ab wait 700 >/dev/null
  ab press Control+a >/dev/null
  ab wait 500 >/dev/null
  ab keyboard type 'Ship faster with NextPress' >/dev/null
  ab wait 3000 >/dev/null

  record_stop
fi

# --- 2. Command palette ----------------------------------------------------
# Dashboard already advertises the shortcut, so it is the natural host.
if want 02-cmdk; then
  record_start 02-cmdk "${BASE}/admin/dashboard" 'h1' 2500

  ab press Control+k >/dev/null
  ab wait 1800 >/dev/null
  ab keyboard type 'theme' >/dev/null
  ab wait 2800 >/dev/null

  record_stop
fi

# --- 3. Theme editor -------------------------------------------------------
# Palette buttons are labelled "Apply <Name> palette"; their text content is
# just a swatch, which is why matching on textContent found nothing before.
if want 03-themes; then
  record_start 03-themes "${BASE}/admin/themes/${THEME_ID}" 'button[aria-label="Apply Forest palette"]' 2200

  for palette in Classic Slate Forest Sunset; do
    ab click "button[aria-label=\"Apply ${palette} palette\"]" >/dev/null
    ab wait 2400 >/dev/null
  done
  ab wait 1200 >/dev/null

  record_stop
fi

# --- 4. Pages: card view + menu order --------------------------------------
if want 04-pages; then
  record_start 04-pages "${BASE}/admin/pages" 'h1' 2200

  ab click 'xpath=//button[normalize-space(.)="Cards"]' >/dev/null
  ab wait 2600 >/dev/null
  ab click 'xpath=//button[contains(.,"Site menu")]' >/dev/null
  ab wait 3000 >/dev/null
  # Real reordering: pick a new position number and watch the list resequence.
  ab click 'xpath=//button[contains(@aria-label,"Re-position Studio Meridian")]' >/dev/null
  ab wait 1400 >/dev/null
  ab click 'xpath=//*[@role="option"][normalize-space(.)="1"]' >/dev/null
  ab wait 2800 >/dev/null
  ab click 'xpath=//button[normalize-space(.)="Cancel"]' >/dev/null
  ab wait 1200 >/dev/null

  record_stop
fi

# --- 5. Live preview -------------------------------------------------------
# Collapse both rails first: in the default 3-pane layout the preview iframe is
# narrow enough that the hero wraps badly.
if want 05-preview; then
  record_start 05-preview "$BUILDER_URL" '[data-block-id="saas-hero"]' 2000

  ab click 'button[aria-label="Collapse block library"]' >/dev/null
  ab wait 1300 >/dev/null
  ab click 'button[aria-label="Collapse block settings"]' >/dev/null
  ab wait 1600 >/dev/null
  ab click 'button[aria-label="Live preview"]' >/dev/null
  # The preview iframe blanks the canvas for ~3s while it loads; hold well past
  # that so the rendered page is what the viewer actually sees.
  ab wait 9000 >/dev/null
  ab scroll down 420 >/dev/null
  ab wait 3200 >/dev/null

  record_stop
fi

# --- 6. Delete + undo ------------------------------------------------------
# Undo is driven from the editor toolbar, not from the "Block deleted" toast:
# as of 1.3.5 the toast's own Undo button fires but never restores the block
# (verified by clicking it directly -- block count stays down). The toolbar
# control works, so that is what the demo shows. The toast still appears on
# screen behind the action.
if want 06-undo; then
  record_start 06-undo "$BUILDER_URL" '[data-block-id="saas-pricing-title"]' 2000

  BLOCK='xpath=//*[@data-block-id="saas-pricing-title"]/ancestor::*[@role="group"][1]'
  ab scrollintoview "$BLOCK" >/dev/null
  ab wait 1200 >/dev/null
  ab click "$BLOCK" >/dev/null
  ab wait 1800 >/dev/null
  ab click 'button[aria-label="Delete block"]' >/dev/null
  ab wait 2200 >/dev/null
  ab click 'button[aria-label="Undo"]' >/dev/null
  ab wait 3200 >/dev/null

  record_stop
fi

# --- 7. Showcase -----------------------------------------------------------
# Three pretty public pages, one recording each so no clip carries a navigation.
showcase() {
  local name="$1" slug="$2"
  want "$name" || return 0
  record_start "$name" "$(pub "$slug")" 'h1' 2600
  ab scroll down 430 >/dev/null
  ab wait 2600 >/dev/null
  ab scroll down 430 >/dev/null
  ab wait 2400 >/dev/null
  record_stop
}

showcase 07a-showcase-nimbus  demo-nimbus-saas
showcase 07b-showcase-cafe    demo-oak-ember-cafe
showcase 07c-showcase-studio  demo-studio-meridian

ab close --all >/dev/null 2>&1 || true

echo
echo "[record] Segment durations:"
for f in "$SEG_DIR"/*.webm; do
  printf "  %-24s %6.1fs\n" "$(basename "$f")" \
    "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"
done

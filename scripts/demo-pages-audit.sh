#!/usr/bin/env bash
# Practical demo page smoke test: SPA + SSR + preview @390/768 + editor login
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SESSION="${DEMO_TEST_SESSION:-demo-pages-audit}"
BASE="${DEMO_BASE_URL:-http://localhost:5000}"
EMAIL="${SEED_EMAIL:-responsive-fixtures@example.com}"
PASS="${SEED_PASSWORD:-TestPass1}"
OUT="${DEMO_REPORT:-docs/internal/demo-pages-test-report.md}"

ab() { agent-browser --session "$SESSION" "$@"; }

audit_eval='(() => {
  const doc = document.documentElement;
  const body = document.body;
  const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth;
  const stack = document.querySelector(".np-public-block-stack, #main-content");
  const stackOverflow = stack ? stack.scrollWidth - stack.clientWidth : 0;
  const isEditor = location.pathname.includes("/admin/page-builder/");
  const canvas = document.querySelector(".npb-canvas-page, .bg-npb-canvas-page");
  const canvasOverflow = canvas ? canvas.scrollWidth - canvas.clientWidth : 0;
  const pass = isEditor ? canvasOverflow <= 1 : overflowX <= 1 && stackOverflow <= 1;
  const h1 = document.querySelector("h1, .wp-block-heading");
  return {
    pass,
    overflowX,
    stackOverflow,
    textLen: (body.innerText || "").trim().length,
    title: document.title,
    hasH1: !!h1,
    h1Text: h1 ? (h1.innerText || "").slice(0, 60) : "",
  };
})()'

declare -a SLUGS=(
  demo-nimbus-saas
  demo-oak-ember-cafe
  demo-studio-meridian
  demo-async-blog-post
  demo-daily-brief-newsletter
)
declare -a WIDTHS=(390 768)

mkdir -p "$(dirname "$OUT")"
: > /tmp/demo-test-results.tsv
echo -e "slug\tsurface\twidth\tpass\toverflowX\tstack\ttextLen\thasH1" >> /tmp/demo-test-results.tsv

curl -s -c /tmp/demo-test-cookies.txt -b /tmp/demo-test-cookies.txt \
  -X POST "${BASE}/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -H "Origin: ${BASE}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" >/dev/null

declare -A PAGE_IDS=()
while IFS='|' read -r slug id title; do
  PAGE_IDS["$slug"]="$id"
done < <(curl -s -b /tmp/demo-test-cookies.txt -H "Origin: ${BASE}" \
  "${BASE}/api/pages?limit=100&status=any" \
  | jq -r '.pages[] | select(.slug|startswith("demo-")) | "\(.slug)|\(.id)|\(.title)"')

echo "[demo-test] Logging in (browser)..."
ab close --all 2>/dev/null || true
ab open "${BASE}/admin/login"
ab wait 2000
ab fill 'input[name="username"]' "$EMAIL"
ab fill 'input[name="password"]' "$PASS"
ab click 'button[type="submit"]'
ab wait 4000

run_check() {
  local slug="$1"
  local surface="$2"
  local width="$3"
  local url="$4"
  local device="${5:-}"
  ab set viewport "$width" 900 >/dev/null
  ab open "$url" >/dev/null
  ab wait 5000 >/dev/null
  if [[ -n "$device" ]]; then
    ab click "[aria-label=\"${device}\"]" >/dev/null 2>&1 || true
    ab wait 1200 >/dev/null
  fi
  local result pass overflow stack text_len has_h1
  result="$(ab --json eval "$audit_eval" 2>/dev/null || echo '{}')"
  pass="$(echo "$result" | jq -r '.data.result.pass // false')"
  overflow="$(echo "$result" | jq -r '.data.result.overflowX // "?"')"
  stack="$(echo "$result" | jq -r '.data.result.stackOverflow // "?"')"
  text_len="$(echo "$result" | jq -r '.data.result.textLen // 0')"
  has_h1="$(echo "$result" | jq -r '.data.result.hasH1 // false')"
  echo -e "${slug}\t${surface}\t${width}\t${pass}\t${overflow}\t${stack}\t${text_len}\t${has_h1}" >> /tmp/demo-test-results.tsv
  printf "  %-28s %-8s %4spx  pass=%-5s  text=%s  h1=%s\n" "$slug" "$surface" "$width" "$pass" "$text_len" "$has_h1"
}

echo "[demo-test] SSR curl checks..."
declare -a SSR_FAILS=()
for slug in "${SLUGS[@]}"; do
  id="${PAGE_IDS[$slug]:-}"
  if [[ -z "$id" ]]; then
    echo "  MISSING slug: $slug"
    SSR_FAILS+=("$slug")
    continue
  fi
  html="$(curl -s "${BASE}/pages/${id}")"
  if ! echo "$html" | rg -q '<!DOCTYPE html>'; then
    echo "  FAIL SSR $slug — no doctype"
    SSR_FAILS+=("$slug")
  elif echo "$html" | rg -q 'theme stub|Theme placeholder'; then
    echo "  FAIL SSR $slug — theme stub"
    SSR_FAILS+=("$slug")
  elif [[ $(echo "$html" | wc -c) -lt 500 ]]; then
    echo "  FAIL SSR $slug — body too small"
    SSR_FAILS+=("$slug")
  else
    echo "  OK   SSR $slug ($(echo "$html" | wc -c) bytes)"
  fi
done

echo "[demo-test] Browser matrix (5 pages × spa/ssr/preview/editor × 390/768)..."
for slug in "${SLUGS[@]}"; do
  id="${PAGE_IDS[$slug]:-}"
  [[ -z "$id" ]] && continue
  echo "=== $slug ==="
  for w in "${!WIDTHS[@]}"; do
    width="${WIDTHS[$w]}"
    device=$([[ "$width" == "390" ]] && echo "mobile" || echo "tablet")
    run_check "$slug" "spa" "$width" "${BASE}/page/${slug}"
    run_check "$slug" "ssr" "$width" "${BASE}/pages/${id}"
    run_check "$slug" "preview" "$width" "${BASE}/preview/page/${id}?live=1"
    run_check "$slug" "editor" "$width" "${BASE}/admin/page-builder/page/${id}" "$device"
  done
done

pass_count="$(awk -F'\t' 'NR>1 && $4=="true" {c++} END {print c+0}' /tmp/demo-test-results.tsv)"
total=$(( $(wc -l < /tmp/demo-test-results.tsv) - 1 ))
fail_count=$(( total - pass_count ))
ssr_fail_count=${#SSR_FAILS[@]}

{
  echo "# Demo Pages Test Report"
  echo ""
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M UTC")"
  echo ""
  echo "**Browser checks:** ${pass_count}/${total} passed"
  echo "**SSR curl:** $(( ${#SLUGS[@]} - ssr_fail_count ))/${#SLUGS[@]} passed"
  echo ""
  echo "| Slug | Surface | Width | Pass | overflowX | stack | textLen | hasH1 |"
  echo "|------|---------|-------|------|-----------|-------|---------|-------|"
  tail -n +2 /tmp/demo-test-results.tsv | while IFS=$'\t' read -r s surf w p o st tl h1; do
    icon=$([[ "$p" == "true" ]] && echo "✅" || echo "❌")
    echo "| $s | $surf | ${w}px | $icon $p | $o | $st | $tl | $h1 |"
  done
  echo ""
  if [[ "$fail_count" -eq 0 && "$ssr_fail_count" -eq 0 ]]; then
    echo "**Demo pages: PASS**"
  else
    echo "**Demo pages: FAIL** — browser: ${fail_count}, SSR: ${ssr_fail_count}"
  fi
} > "$OUT"

ab close --all 2>/dev/null || true
echo ""
echo "[demo-test] Report: $OUT"
echo "[demo-test] Browser ${pass_count}/${total}, SSR $((${#SLUGS[@]} - ssr_fail_count))/${#SLUGS[@]}"

exit "$([[ "$fail_count" -eq 0 && "$ssr_fail_count" -eq 0 ]] && echo 0 || echo 1)"

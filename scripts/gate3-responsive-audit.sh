#!/usr/bin/env bash
# Gate 3 responsive matrix: 3 fixtures × 4 surfaces × 3 viewports
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SESSION="${GATE3_SESSION:-gate3-audit}"
BASE="${GATE3_BASE_URL:-http://localhost:5000}"
EMAIL="${SEED_EMAIL:-responsive-fixtures@example.com}"
PASS="${SEED_PASSWORD:-TestPass1}"
OUT="${GATE3_REPORT:-docs/internal/gate3-responsive-report.md}"

ab() {
	agent-browser --session "$SESSION" "$@"
}

audit_eval='(() => {
  const doc = document.documentElement;
  const body = document.body;
  const overflowX = Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth;
  const canvas = document.querySelector(".bg-npb-canvas-page");
  const canvasOverflow = canvas ? canvas.scrollWidth - canvas.clientWidth : 0;
  const stack = document.querySelector(".np-public-block-stack, #main-content");
  const stackOverflow = stack ? stack.scrollWidth - stack.clientWidth : 0;
  const isEditor = location.pathname.includes("/admin/page-builder/");
  const pass = isEditor
    ? canvasOverflow <= 1
    : overflowX <= 1 && stackOverflow <= 1;
  return {
    viewport: window.innerWidth,
    overflowX,
    canvasOverflow,
    stackOverflow,
    pass,
    textLen: (body.innerText || "").trim().length,
  };
})()'

declare -a FIXTURE_NAMES=(layout content typography)
declare -a FIXTURE_SLUGS=(responsive-layout-stress responsive-content-stress responsive-typography-stress)
declare -a WIDTHS=(390 768 1280)
declare -a DEVICE_ARIA=(mobile tablet desktop)

mkdir -p "$(dirname "$OUT")"
: > /tmp/gate3-results.tsv
echo -e "fixture\tsurface\twidth\tpass\toverflowX\tcanvasOverflow\tstackOverflow\ttextLen" >> /tmp/gate3-results.tsv

# API session for slug → id lookup
curl -s -c /tmp/gate3-cookies.txt -b /tmp/gate3-cookies.txt \
	-X POST "${BASE}/api/auth/sign-in/email" \
	-H "Content-Type: application/json" \
	-H "Origin: ${BASE}" \
	-d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" >/dev/null
echo "[gate3] Resolving fixture page IDs..."
declare -a FIXTURE_IDS=()
for slug in "${FIXTURE_SLUGS[@]}"; do
	id="$(curl -s -b /tmp/gate3-cookies.txt \
		-H "Origin: ${BASE}" \
		"${BASE}/api/pages?limit=100&status=any" \
		| jq -r --arg s "$slug" '.pages[] | select(.slug==$s) | .id' | head -1)"
	if [[ -z "$id" || "$id" == "null" ]]; then
		echo "[gate3] Missing page for slug: $slug — run pnpm seed:responsive-fixtures -- --via-api"
		exit 1
	fi
	FIXTURE_IDS+=("$id")
	echo "  $slug → $id"
done

echo "[gate3] Logging in (browser)..."
ab close --all 2>/dev/null || true
ab open "${BASE}/admin/login"
ab wait 2000
ab fill 'input[name="username"]' "$EMAIL"
ab fill 'input[name="password"]' "$PASS"
ab click 'button[type="submit"]'
ab wait 4000

run_audit() {
	local fixture="$1"
	local surface="$2"
	local width="$3"
	local url="$4"
	local device_aria="${5:-}"
	local wait_ms="${6:-4000}"

	ab set viewport "$width" 900 >/dev/null
	ab open "$url" >/dev/null
	ab wait "$wait_ms" >/dev/null

	if [[ -n "$device_aria" ]]; then
		ab click "[aria-label=\"${device_aria}\"]" >/dev/null 2>&1 || true
		ab wait 1200 >/dev/null
	fi

	local result pass overflow canvas stack text_len
	result="$(ab --json eval "$audit_eval" 2>/dev/null || echo '{}')"
	pass="$(echo "$result" | jq -r '.data.result.pass // false')"
	overflow="$(echo "$result" | jq -r '.data.result.overflowX // "?"')"
	canvas="$(echo "$result" | jq -r '.data.result.canvasOverflow // "?"')"
	stack="$(echo "$result" | jq -r '.data.result.stackOverflow // "?"')"
	text_len="$(echo "$result" | jq -r '.data.result.textLen // 0')"

	echo -e "${fixture}\t${surface}\t${width}\t${pass}\t${overflow}\t${canvas}\t${stack}\t${text_len}" >> /tmp/gate3-results.tsv
	printf "  %-10s %-8s %4spx  pass=%-5s  overflow=%s  text=%s\n" "$fixture" "$surface" "$width" "$pass" "$overflow" "$text_len"
}

echo "[gate3] Running matrix (36 checks)..."
for i in "${!FIXTURE_NAMES[@]}"; do
	fixture="${FIXTURE_NAMES[$i]}"
	slug="${FIXTURE_SLUGS[$i]}"
	id="${FIXTURE_IDS[$i]}"
	echo "=== $fixture ==="
	for w in "${!WIDTHS[@]}"; do
		width="${WIDTHS[$w]}"
		device="${DEVICE_ARIA[$w]}"
		run_audit "$fixture" "spa" "$width" "${BASE}/page/${slug}" "" 5000
		run_audit "$fixture" "ssr" "$width" "${BASE}/pages/${id}" "" 2000
		run_audit "$fixture" "preview" "$width" "${BASE}/preview/page/${id}?live=1" "" 5000
		run_audit "$fixture" "editor" "$width" "${BASE}/admin/page-builder/page/${id}" "$device" 6000
	done
done

pass_count="$(awk -F'\t' 'NR>1 && $4=="true" {c++} END {print c+0}' /tmp/gate3-results.tsv)"
total=$(( $(wc -l < /tmp/gate3-results.tsv) - 1 ))
fail_count=$(( total - pass_count ))

{
	echo "# Gate 3 Responsive Matrix Report"
	echo ""
	echo "Generated: $(date -u +"%Y-%m-%d %H:%M UTC")"
	echo ""
	echo "**Summary:** ${pass_count}/${total} passed (${fail_count} failed)"
	echo ""
	echo "| Fixture | Surface | Width | Pass | overflowX | canvas | stack | textLen |"
	echo "|---------|---------|-------|------|-----------|--------|-------|---------|"
	tail -n +2 /tmp/gate3-results.tsv | while IFS=$'\t' read -r f s w p o c st tl; do
		icon=$([[ "$p" == "true" ]] && echo "✅" || echo "❌")
		echo "| $f | $s | ${w}px | $icon $p | $o | $c | $st | $tl |"
	done
	echo ""
	if [[ "$fail_count" -eq 0 ]]; then
		echo "**Gate 3: PASS** — zero horizontal overflow at 390/768/1280 on all fixture pages and surfaces."
	else
		echo "**Gate 3: FAIL** — see rows with pass=false above."
	fi
} > "$OUT"

echo ""
echo "[gate3] Report: $OUT"
echo "[gate3] ${pass_count}/${total} passed"
ab close --all 2>/dev/null || true

exit "$([[ "$fail_count" -eq 0 ]] && echo 0 || echo 1)"

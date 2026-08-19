#!/usr/bin/env bash
# Branded cards for the NextPress release demo: an intro, an outro, and one
# interstitial per feature.
#
# Frames are composited one at a time with ImageMagick rather than assembled
# from ffmpeg filters. ffmpeg cannot animate what these cards need -- drawbox
# evaluates its geometry once rather than per frame, and scale takes no time
# expression -- which is why the earlier ffmpeg-only version could only fade
# things in and step a bar sideways. Per-frame compositing gives real easing,
# a badge that scales in, and a loading ring that actually sweeps.
#
# Everything here is deterministic: frame N is a pure function of its time.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${DEMO_VERSION:-1.3.5}"
OUT_DIR="${DEMO_OUT_DIR:-$ROOT/release-assets/$VERSION}/transitions"
WORK="$OUT_DIR/_build"
FRAMES="$WORK/frames"
LOGO_SVG="$ROOT/client/public/logo.svg"
LOGO_MARK="$WORK/logo-mark.png"

FONT_BOLD="${DEMO_FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
FONT_REG="${DEMO_FONT_REG:-/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf}"
[[ -f "$FONT_BOLD" ]] || {
	FONT_BOLD="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
	FONT_REG="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
}

W=1280
H=720
FPS=30
CARD_SEC=2.8

# NextPress brand palette
BRAND="#3b82f6"
BRAND_DEEP="#2563eb"
INK="#0f172a"
MUTED="#64748b"
TRACK="#e2e8f0"

# Ring + badge geometry, both centred on (CX, CY)
CX=640
CY=332
RING_R=92
RING_W=5
BADGE=116

mkdir -p "$WORK" "$FRAMES"

# --- logo mark -------------------------------------------------------------
# logo.svg is a lockup whose root carries fill="none", and there is no SVG
# delegate here (no librsvg), so pull the mark's path and draw it explicitly.
if [[ ! -f "$LOGO_MARK" ]]; then
	MARK_D="$(node -e '
		const fs = require("fs");
		const src = fs.readFileSync(process.argv[1], "utf8");
		const first = src.match(/<path\b[\s\S]*?<\/path>/);
		if (!first) throw new Error("logo.svg: no <path> found");
		process.stdout.write(first[0].match(/\sd="([^"]+)"/)[1]);
	' "$LOGO_SVG")"
	convert -size 921x768 xc:none -fill "$INK" \
		-draw "fill-rule evenodd translate 0,-156.326 path '${MARK_D}'" \
		-resize x96 "$WORK/logo-mark-large.png"
	convert "$WORK/logo-mark-large.png" -resize x40 "$LOGO_MARK"
fi

# --- shared layers ---------------------------------------------------------
BG="$WORK/bg.png"
[[ -f "$BG" ]] || convert -size ${W}x${H} \
	gradient:'#ffffff-#eef2f7' "$BG"

WORDMARK="$WORK/wordmark.png"
[[ -f "$WORDMARK" ]] || convert -background none -fill "$BRAND" \
	-font "$FONT_REG" -pointsize 17 label:"NextPress ${VERSION}" "$WORDMARK"

# --- feature glyph badges --------------------------------------------------
ICON_SVG_DIR="$WORK/icons"
node "$ROOT/scripts/release-demo-video/lib/extract-icons.mjs" "$ICON_SVG_DIR" \
	pencil command palette layout-grid eye undo-2 layout-template >/dev/null

make_badge() {
	local icon="$1" badge="$WORK/badge-${icon}.png"
	[[ -f "$badge" ]] && return 0
	convert -size ${BADGE}x${BADGE} xc:none \
		-fill "$BRAND" -draw "roundrectangle 0,0,$((BADGE - 1)),$((BADGE - 1)),30,30" \
		"$WORK/tile.png"
	convert -background none "$ICON_SVG_DIR/${icon}.svg" -resize 56x56 "$WORK/glyph.png"
	convert "$WORK/tile.png" "$WORK/glyph.png" -gravity center -composite "$badge"
}

text_layer() {
	local out="$1" font="$2" size="$3" color="$4" text="$5"
	[[ -f "$out" ]] || convert -background none -fill "$color" \
		-font "$font" -pointsize "$size" label:"$text" "$out"
}

# --- easing ----------------------------------------------------------------
# Emits: alpha_logo alpha_word alpha_ring sweep scale alpha_badge
#        alpha_title dy_title alpha_sub dy_sub
card_state() {
	awk -v t="$1" -v dur="$2" '
		function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x) }
		function seg(t, a, b) { return clamp((t - a) / (b - a)) }
		function outCubic(x) { return 1 - (1 - x) ^ 3 }
		function outBack(x,   c1, c3) {
			c1 = 1.70158; c3 = c1 + 1
			return 1 + c3 * (x - 1) ^ 3 + c1 * (x - 1) ^ 2
		}
		function inOutCubic(x) {
			return x < 0.5 ? 4 * x ^ 3 : 1 - ((-2 * x + 2) ^ 3) / 2
		}
		BEGIN {
			aLogo  = seg(t, 0.05, 0.45)
			aWord  = seg(t, 0.15, 0.55)
			aBadge = seg(t, 0.05, 0.40)
			aRing  = seg(t, 0.30, 0.62)
			sweep  = 359.9 * inOutCubic(seg(t, 0.35, dur - 0.35))
			scale  = 0.72 + 0.28 * outBack(seg(t, 0.05, 0.55))
			aTitle = seg(t, 0.45, 0.92)
			dTitle = 16 * (1 - outCubic(seg(t, 0.45, 0.92)))
			aSub   = seg(t, 0.68, 1.14)
			dSub   = 12 * (1 - outCubic(seg(t, 0.68, 1.14)))
			printf "%.4f %.4f %.4f %.3f %.4f %.4f %.4f %.2f %.4f %.2f\n",
				aLogo, aWord, aRing, sweep, scale, aBadge, aTitle, dTitle, aSub, dSub
		}'
}

# Composite one frame. Layers are skipped entirely while still transparent.
compose_frame() {
	local out="$1" badge="$2" title_png="$3" sub_png="$4"
	local aLogo="$5" aWord="$6" aRing="$7" sweep="$8" scale="$9" aBadge="${10}"
	local aTitle="${11}" dTitle="${12}" aSub="${13}" dSub="${14}"

	local x1=$((CX - RING_R)) y1=$((CY - RING_R))
	local x2=$((CX + RING_R)) y2=$((CY + RING_R))
	local -a cmd=(convert "$BG")

	if awk -v a="$aRing" 'BEGIN { exit !(a > 0.01) }'; then
		cmd+=(-fill none -stroke "$TRACK" -strokewidth "$RING_W"
			-draw "stroke-linecap round arc $x1,$y1 $x2,$y2 0,359.9")
	fi
	if awk -v s="$sweep" 'BEGIN { exit !(s > 0.5) }'; then
		local end
		end=$(awk -v s="$sweep" 'BEGIN { printf "%.2f", -90 + s }')
		cmd+=(-fill none -stroke "$BRAND_DEEP" -strokewidth "$RING_W"
			-draw "stroke-linecap round arc $x1,$y1 $x2,$y2 -90,$end")
	fi

	# badge: scaled about the ring centre
	if awk -v a="$aBadge" 'BEGIN { exit !(a > 0.01) }'; then
		local pct bx by
		pct=$(awk -v s="$scale" 'BEGIN { printf "%.2f", s * 100 }')
		bx=$(awk -v c="$CX" -v b="$BADGE" -v s="$scale" 'BEGIN { printf "%d", c - b * s / 2 }')
		by=$(awk -v c="$CY" -v b="$BADGE" -v s="$scale" 'BEGIN { printf "%d", c - b * s / 2 }')
		cmd+=("(" "$badge" -resize "${pct}%" -alpha set -channel A -evaluate multiply "$aBadge" +channel ")"
			-geometry "+${bx}+${by}" -composite)
	fi

	place() { # layer alpha centre-x top-y
		local layer="$1" alpha="$2" cx="$3" top="$4" lw lx
		awk -v a="$alpha" 'BEGIN { exit !(a > 0.01) }' || return 0
		lw=$(identify -format "%w" "$layer")
		lx=$((cx - lw / 2))
		cmd+=("(" "$layer" -alpha set -channel A -evaluate multiply "$alpha" +channel ")"
			-geometry "+${lx}+${top}" -composite)
	}

	place "$LOGO_MARK" "$aLogo" "$CX" \
		"$(awk -v a="$aLogo" 'BEGIN { printf "%d", 128 + 10 * (1 - a) }')"
	place "$WORDMARK" "$aWord" "$CX" \
		"$(awk -v a="$aWord" 'BEGIN { printf "%d", 184 + 8 * (1 - a) }')"
	place "$title_png" "$aTitle" "$CX" \
		"$(awk -v d="$dTitle" 'BEGIN { printf "%d", 492 + d }')"
	place "$sub_png" "$aSub" "$CX" \
		"$(awk -v d="$dSub" 'BEGIN { printf "%d", 550 + d }')"

	cmd+=("$out")
	"${cmd[@]}"
}

encode() { # frame-dir out.mp4
	ffmpeg -y -hide_banner -loglevel error -framerate "$FPS" -i "$1/f-%04d.png" \
		-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "$2"
}

# $1=id $2=icon $3=title $4=subtitle
make_transition() {
	local id="$1" icon="$2" title="$3" subtitle="$4"
	local out="$OUT_DIR/t-${id}.mp4"
	local dir="$FRAMES/$id"
	local title_png="$WORK/title-${id}.png" sub_png="$WORK/sub-${id}.png"

	make_badge "$icon"
	text_layer "$title_png" "$FONT_BOLD" 44 "$INK" "$title"
	text_layer "$sub_png" "$FONT_REG" 23 "$MUTED" "$subtitle"

	rm -rf "$dir"; mkdir -p "$dir"
	local total n t
	total=$(awk -v d="$CARD_SEC" -v f="$FPS" 'BEGIN { printf "%d", d * f }')
	for ((n = 0; n < total; n++)); do
		t=$(awk -v n="$n" -v f="$FPS" 'BEGIN { printf "%.4f", n / f }')
		# shellcheck disable=SC2046
		compose_frame "$(printf '%s/f-%04d.png' "$dir" "$n")" \
			"$WORK/badge-${icon}.png" "$title_png" "$sub_png" \
			$(card_state "$t" "$CARD_SEC")
	done
	encode "$dir" "$out"
	rm -rf "$dir"
	echo "[cards] $(basename "$out")"
}

# Intro / outro share the language but lead with the mark.
# $1=out-name $2=line1 $3=line2 $4=duration
make_bookend() {
	local name="$1" line1="$2" line2="$3" dur="$4"
	local out="$OUT_DIR/${name}.mp4"
	local dir="$FRAMES/$name"
	local l1="$WORK/${name}-1.png" l2="$WORK/${name}-2.png"

	text_layer "$l1" "$FONT_BOLD" 62 "$INK" "$line1"
	text_layer "$l2" "$FONT_REG" 34 "$BRAND" "$line2"

	rm -rf "$dir"; mkdir -p "$dir"
	local total n t
	total=$(awk -v d="$dur" -v f="$FPS" 'BEGIN { printf "%d", d * f }')
	for ((n = 0; n < total; n++)); do
		t=$(awk -v n="$n" -v f="$FPS" 'BEGIN { printf "%.4f", n / f }')
		read -r aMark scale aL1 dL1 aL2 dL2 <<<"$(awk -v t="$t" -v dur="$dur" '
			function clamp(x) { return x < 0 ? 0 : (x > 1 ? 1 : x) }
			function seg(t, a, b) { return clamp((t - a) / (b - a)) }
			function outCubic(x) { return 1 - (1 - x) ^ 3 }
			function outBack(x,   c1, c3) {
				c1 = 1.70158; c3 = c1 + 1
				return 1 + c3 * (x - 1) ^ 3 + c1 * (x - 1) ^ 2
			}
			BEGIN {
				fade = 1 - seg(t, dur - 0.35, dur)
				printf "%.4f %.4f %.4f %.2f %.4f %.2f\n",
					seg(t, 0.05, 0.55) * fade,
					0.80 + 0.20 * outBack(seg(t, 0.05, 0.65)),
					seg(t, 0.35, 0.85) * fade,
					18 * (1 - outCubic(seg(t, 0.35, 0.85))),
					seg(t, 0.60, 1.10) * fade,
					12 * (1 - outCubic(seg(t, 0.60, 1.10)))
			}')"

		local pct mw mx
		pct=$(awk -v s="$scale" 'BEGIN { printf "%.2f", s * 100 }')
		mw=$(awk -v s="$scale" 'BEGIN { printf "%d", 96 * s }')
		mx=$(awk -v c="$CX" -v w="$mw" 'BEGIN { printf "%d", c - w / 2 }')

		local -a cmd=(convert "$BG")
		cmd+=("(" "$WORK/logo-mark-large.png" -resize "${pct}%"
			-alpha set -channel A -evaluate multiply "$aMark" +channel ")"
			-geometry "+${mx}+268" -composite)
		for pair in "$l1:$aL1:398:$dL1" "$l2:$aL2:478:$dL2"; do
			IFS=: read -r layer alpha top delta <<<"$pair"
			awk -v a="$alpha" 'BEGIN { exit !(a > 0.01) }' || continue
			local lw lx ly
			lw=$(identify -format "%w" "$layer")
			lx=$((CX - lw / 2))
			ly=$(awk -v top="$top" -v d="$delta" 'BEGIN { printf "%d", top + d }')
			cmd+=("(" "$layer" -alpha set -channel A -evaluate multiply "$alpha" +channel ")"
				-geometry "+${lx}+${ly}" -composite)
		done
		cmd+=("$(printf '%s/f-%04d.png' "$dir" "$n")")
		"${cmd[@]}"
	done
	encode "$dir" "$out"
	rm -rf "$dir"
	echo "[cards] $(basename "$out")"
}

make_bookend intro "NextPress" "${VERSION}" 3.4
make_transition edit     pencil          "Edit content, see it live"     "Opening the page builder..."
make_transition cmdk     command         "Jump anywhere with Ctrl+K"     "Opening the dashboard..."
make_transition themes   palette         "Design your whole site"        "Opening the theme editor..."
make_transition pages    layout-grid     "Organize pages and menus"      "Opening Pages..."
make_transition preview  eye             "Preview exactly what ships"    "Opening live preview..."
make_transition undo     undo-2          "Delete safely, undo instantly" "Back to the builder..."
make_transition showcase layout-template "See what you can build"        "Browsing example sites..."
make_bookend outro "Available now" "${VERSION}" 3.6

rm -rf "$FRAMES"
echo "[cards] Done -> $OUT_DIR"

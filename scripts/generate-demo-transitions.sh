#!/usr/bin/env bash
# Light-mode transition cards for the NextPress release demo.
#
# Each card is a 2.6s branded interstitial: the NextPress mark, an animated
# feature glyph (lucide icon on a brand-blue badge), the feature title, a
# loading subtitle, and a progress bar that fills for the card's duration.
# Explain text lives here and nowhere else -- feature footage stays clean.
#
# Rendered with ffmpeg rather than a headless browser: browser-recorded HTML
# transitions routinely export as black frames.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${DEMO_VERSION:-1.3.5}"
OUT_DIR="${DEMO_OUT_DIR:-$ROOT/release-assets/$VERSION}/transitions"
WORK="$OUT_DIR/_build"
LOGO_SVG="$ROOT/client/public/logo.svg"
LOGO_MARK="$WORK/logo-mark.png"

FONT_BOLD="${DEMO_FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
FONT_REG="${DEMO_FONT_REG:-/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf}"

W=1280
H=720
FPS=30
DUR=2.6

# NextPress brand palette
BRAND="3b82f6"   # primary blue
INK="0f172a"     # heading / logo mark
MUTED="64748b"   # subtitle
TRACK="e2e8f0"   # progress track
BG="f8fafc"      # card background

# Progress bar geometry / timing
BAR_X=480
BAR_Y=566
BAR_W=320
BAR_H=4
BAR_STEPS=32
BAR_START=0.5
BAR_END=2.45

mkdir -p "$WORK"

if [[ ! -f "$FONT_BOLD" ]]; then
  FONT_BOLD="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
  FONT_REG="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
fi

# --- logo mark -------------------------------------------------------------
# logo.svg is a full lockup whose root carries fill="none", and ImageMagick has
# no SVG delegate here (no librsvg). So pull the mark's path data out and draw
# it directly with an explicit fill.
if [[ ! -f "$LOGO_MARK" ]]; then
  MARK_D="$(node -e '
    const fs = require("fs");
    const src = fs.readFileSync(process.argv[1], "utf8");
    const first = src.match(/<path\b[\s\S]*?<\/path>/);
    if (!first) throw new Error("logo.svg: no <path> found");
    process.stdout.write(first[0].match(/\sd="([^"]+)"/)[1]);
  ' "$LOGO_SVG")"
  # Path sits at y>=156 in the lockup viewBox; shift it flush to the top.
  convert -size 921x768 xc:none -fill "#${INK}" \
    -draw "fill-rule evenodd translate 0,-156.326 path '${MARK_D}'" \
    -resize x44 "$LOGO_MARK"
fi

# --- feature glyph badges --------------------------------------------------
ICON_SVG_DIR="$WORK/icons"
node "$ROOT/scripts/release-demo-video/lib/extract-icons.mjs" "$ICON_SVG_DIR" \
  pencil command palette layout-grid eye undo-2 sparkles >/dev/null

# Brand-blue rounded tile with a white lucide glyph centred on it.
make_badge() {
  local icon="$1"
  local badge="$WORK/badge-${icon}.png"
  [[ -f "$badge" ]] && return 0

  convert -size 132x132 xc:none \
    -fill "#${BRAND}" -draw "roundrectangle 0,0,131,131,32,32" \
    "$WORK/tile.png"
  convert -background none "$ICON_SVG_DIR/${icon}.svg" -resize 62x62 "$WORK/glyph.png"
  convert "$WORK/tile.png" "$WORK/glyph.png" -gravity center -composite "$badge"
}

# --- progress bar ----------------------------------------------------------
# drawbox in ffmpeg 6.x evaluates w/h/x/y once, not per frame, so an animated
# width expression silently renders at full width. `enable` IS timeline-aware,
# so build the fill from fixed-width steps that switch on in sequence.
build_bar_filter() {
  local seg_w step_t i x on
  seg_w=$(awk -v w="$BAR_W" -v n="$BAR_STEPS" 'BEGIN { print w / n }')
  step_t=$(awk -v a="$BAR_START" -v b="$BAR_END" -v n="$BAR_STEPS" 'BEGIN { print (b - a) / n }')

  printf "drawbox=x=%s:y=%s:w=%s:h=%s:color=0x%s:t=fill:enable='gte(t,%s)'" \
    "$BAR_X" "$BAR_Y" "$BAR_W" "$BAR_H" "$TRACK" "$BAR_START"

  for ((i = 0; i < BAR_STEPS; i++)); do
    x=$(awk -v bx="$BAR_X" -v sw="$seg_w" -v i="$i" 'BEGIN { printf "%.0f", bx + sw * i }')
    on=$(awk -v a="$BAR_START" -v st="$step_t" -v i="$i" 'BEGIN { printf "%.3f", a + st * i }')
    printf ",drawbox=x=%s:y=%s:w=%.0f:h=%s:color=0x%s:t=fill:enable='gte(t,%s)'" \
      "$x" "$BAR_Y" "$(awk -v sw="$seg_w" 'BEGIN { printf "%.0f", sw + 1 }')" \
      "$BAR_H" "$BRAND" "$on"
  done
}

BAR_FILTER="$(build_bar_filter)"

# --- card ------------------------------------------------------------------
# $1=id  $2=icon  $3=title  $4=subtitle
make_transition() {
  local id="$1" icon="$2" title="$3" subtitle="$4"
  local out="$OUT_DIR/t-${id}.mp4"
  local badge="$WORK/badge-${icon}.png"

  make_badge "$icon"

  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=0x${BG}:s=${W}x${H}:d=${DUR}:r=${FPS}" \
    -loop 1 -t "$DUR" -i "$LOGO_MARK" \
    -loop 1 -t "$DUR" -i "$badge" \
    -filter_complex "
      [0:v]
        drawtext=fontfile=${FONT_REG}:text='NextPress ${VERSION}':fontsize=17:fontcolor=0x${BRAND}:
          x=(w-text_w)/2:y=156:
          alpha='if(lt(t,0.15),0,if(lt(t,0.55),(t-0.15)/0.4,1))',
        drawtext=fontfile=${FONT_BOLD}:text='${title}':fontsize=44:fontcolor=0x${INK}:
          x=(w-text_w)/2:y=428:
          alpha='if(lt(t,0.35),0,if(lt(t,0.85),(t-0.35)/0.5,1))',
        drawtext=fontfile=${FONT_REG}:text='${subtitle}':fontsize=24:fontcolor=0x${MUTED}:
          x=(w-text_w)/2:y=492:
          alpha='if(lt(t,0.6),0,if(lt(t,1.1),(t-0.6)/0.5,1))',
        ${BAR_FILTER}
      [bg];
      [1:v] format=rgba, fade=t=in:st=0:d=0.4:alpha=1 [logo];
      [2:v] format=rgba, fade=t=in:st=0.05:d=0.45:alpha=1 [badge];
      [bg][logo]  overlay=(W-w)/2:96 [withlogo];
      [withlogo][badge] overlay=(W-w)/2:'250+18*max(0\,1-((t-0.05)/0.45))'
    " \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "$out"

  echo "[transitions] $(basename "$out")"
}

make_transition edit     pencil      "Edit content, see it live"     "Opening the page builder..."
make_transition cmdk     command     "Jump anywhere with Ctrl+K"     "Opening the dashboard..."
make_transition themes   palette     "Design your whole site"        "Opening the theme editor..."
make_transition pages    layout-grid "Organize pages and menus"      "Opening Pages..."
make_transition preview  eye         "Preview exactly what ships"    "Opening live preview..."
make_transition undo     undo-2      "Delete safely, undo instantly" "Back to the builder..."
make_transition showcase sparkles    "See what you can build"        "Browsing example sites..."

echo "[transitions] Done -> $OUT_DIR"

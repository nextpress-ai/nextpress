#!/usr/bin/env bash
# Assemble the NextPress release demo: de-blank the raw segments, splice in the
# branded transition cards, bookend with title cards, and lay one continuous
# music bed under the whole thing.
#
# The de-blank pass is the important part. agent-browser's recorder keeps
# rolling while a fresh browser context boots and while the app paints, so every
# raw segment opens on a uniform dark canvas, and any in-app loading state
# (the live-preview iframe, for one) shows up as a blank stretch mid-clip.
# Those are recording artifacts, not product defects, and they are what the
# "black frame when switching screens" complaint was about.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${DEMO_VERSION:-1.3.5}"
OUT_DIR="${DEMO_OUT_DIR:-$ROOT/release-assets/$VERSION}"
SEG_DIR="$OUT_DIR/segments"
TRANS_DIR="$OUT_DIR/transitions"
FINAL_MP4="$OUT_DIR/nextpress-${VERSION}-demo.mp4"
MUSIC_MP3="$OUT_DIR/background-music.mp3"
ATTRIBUTION="$OUT_DIR/MUSIC-ATTRIBUTION.txt"
LOGO_MARK="$TRANS_DIR/_build/logo-mark.png"
WORK="$OUT_DIR/_work"

FONT_BOLD="${DEMO_FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
FONT_REG="${DEMO_FONT_REG:-/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf}"

W=1280
H=720
FPS=30
INTRO_SEC=3.2
OUTRO_SEC=3.4

BRAND="3b82f6"
INK="0f172a"
BG="f8fafc"

# A frame counts as blank when its 10th/90th luma percentiles are this close.
# Uniform dark canvas and "white page + spinner" both collapse to ~0 spread;
# any real UI frame reads 150+.
BLANK_SPREAD=25
MIN_BLANK_RUN=0.35   # shorter flickers are not worth a cut
MIN_KEEP_RUN=0.40    # drop slivers left between two blank runs

mkdir -p "$WORK"

if [[ ! -f "$FONT_BOLD" ]]; then
  FONT_BOLD="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
  FONT_REG="/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
fi

if [[ ! -d "$SEG_DIR" ]] || ! compgen -G "$SEG_DIR/*.webm" >/dev/null; then
  echo "[post] No segments in $SEG_DIR — run ./scripts/record-release-demo-${VERSION}.sh" >&2
  exit 1
fi

chmod +x "$ROOT/scripts/generate-demo-transitions.sh"
"$ROOT/scripts/generate-demo-transitions.sh"

if [[ ! -f "$MUSIC_MP3" ]]; then
  echo "[post] Downloading music bed..."
  curl -fsSL -o "$MUSIC_MP3" "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" \
    || curl -fsSL -o "$MUSIC_MP3" "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
fi
cat > "$ATTRIBUTION" <<'EOF'
Background music: SoundHelix Song 8 (instrumental)
Source: SoundHelix - https://www.soundhelix.com/examples/mp3/
License: Creative Commons Attribution 4.0 (CC BY 4.0)
Attribution: SoundHelix - https://www.soundhelix.com

One continuous bed across the full video: constant tempo, constant level,
no slow/fast variants.
EOF

clip_dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }

# Emit "start end" keep-intervals for a clip, with blank runs removed.
keep_intervals() {
  local file="$1"
  local dur
  dur=$(clip_dur "$file")

  ffmpeg -hide_banner -loglevel verbose -i "$file" \
    -vf "signalstats,metadata=print" -f null - 2>&1 \
  | awk -v dur="$dur" -v spread="$BLANK_SPREAD" \
        -v minblank="$MIN_BLANK_RUN" -v minkeep="$MIN_KEEP_RUN" '
      # n must start as a number: awk subscripts are strings, and an
      # uninitialised n indexes bs[""] rather than bs[0].
      BEGIN { n = 0 }
      /pts_time:/       { split($0, a, "pts_time:"); t = a[2] + 0 }
      /signalstats.YLOW=/  { split($0, b, "="); ylow  = b[2] + 0 }
      /signalstats.YHIGH=/ {
        split($0, b, "="); yhigh = b[2] + 0
        blank = (yhigh - ylow <= spread)
        if (blank && !inrun) { inrun = 1; rs = t }
        if (!blank && inrun) {
          inrun = 0
          if (t - rs >= minblank) { bs[n] = rs; be[n] = t; n++ }
        }
      }
      END {
        if (inrun) { bs[n] = rs; be[n] = dur; n++ }
        cur = 0
        for (i = 0; i < n; i++) {
          if (bs[i] - cur >= minkeep) printf "%.2f %.2f\n", cur, bs[i]
          cur = be[i]
        }
        if (dur - cur >= minkeep) printf "%.2f %.2f\n", cur, dur
      }'
}

# Normalise a raw segment to the delivery format, cutting every blank run out.
normalize_segment() {
  local in="$1" out="$2"
  local -a starts=() ends=()
  local s e n i filter

  while read -r s e; do
    [[ -z "$s" ]] && continue
    starts+=("$s"); ends+=("$e")
  done < <(keep_intervals "$in")

  n=${#starts[@]}
  if [[ $n -eq 0 ]]; then
    echo "[post] !! $(basename "$in") is blank end to end" >&2
    return 1
  fi

  local scale="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x${BG},setsar=1,fps=${FPS}"

  if [[ $n -eq 1 ]]; then
    filter="[0:v]trim=start=${starts[0]}:end=${ends[0]},setpts=PTS-STARTPTS,${scale}[out]"
  else
    filter="[0:v]split=${n}"
    for ((i = 0; i < n; i++)); do filter+="[s$i]"; done
    filter+=";"
    for ((i = 0; i < n; i++)); do
      filter+="[s$i]trim=start=${starts[$i]}:end=${ends[$i]},setpts=PTS-STARTPTS[c$i];"
    done
    for ((i = 0; i < n; i++)); do filter+="[c$i]"; done
    filter+="concat=n=${n}:v=1:a=0,${scale}[out]"
  fi

  ffmpeg -y -hide_banner -loglevel error -i "$in" \
    -filter_complex "$filter" -map "[out]" \
    -an -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p "$out"

  printf "[post] %-28s %5.1fs -> %5.1fs (%d cut%s)\n" \
    "$(basename "$in")" "$(clip_dur "$in")" "$(clip_dur "$out")" \
    "$((n - 1))" "$([[ $n -eq 2 ]] && echo '' || echo 's')"
}

# Branded bookend card, same visual language as the transitions.
make_title_card() {
  local out="$1" line1="$2" line2="$3" dur="$4"

  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=0x${BG}:s=${W}x${H}:d=${dur}:r=${FPS}" \
    -loop 1 -t "$dur" -i "$LOGO_MARK" \
    -filter_complex "
      [0:v]
        drawtext=fontfile=${FONT_BOLD}:text='${line1}':fontsize=62:fontcolor=0x${INK}:
          x=(w-text_w)/2:y=372:
          alpha='if(lt(t,0.3),0,if(lt(t,0.9),(t-0.3)/0.6,1))',
        drawtext=fontfile=${FONT_REG}:text='${line2}':fontsize=34:fontcolor=0x${BRAND}:
          x=(w-text_w)/2:y=452:
          alpha='if(lt(t,0.6),0,if(lt(t,1.2),(t-0.6)/0.6,1))'
      [bg];
      [1:v] format=rgba, scale=-1:76, fade=t=in:st=0:d=0.5:alpha=1 [logo];
      [bg][logo] overlay=(W-w)/2:246
    " \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -an "$out"
}

# --- build -----------------------------------------------------------------
# Feature segments first, pretty public examples only at the end.
declare -a ORDER=(
  "t:edit"
  "s:01-inline-edit"
  "t:cmdk"
  "s:02-cmdk"
  "t:themes"
  "s:03-themes"
  "t:pages"
  "s:04-pages"
  "t:preview"
  "s:05-preview"
  "t:undo"
  "s:06-undo"
  "t:showcase"
  "s:07a-showcase-nimbus"
  "s:07b-showcase-cafe"
  "s:07c-showcase-studio"
)

echo "[post] De-blanking segments..."
CONCAT_LIST="$WORK/concat.txt"
: > "$CONCAT_LIST"

INTRO="$WORK/intro.mp4"
OUTRO="$WORK/outro.mp4"
make_title_card "$INTRO" "NextPress" "${VERSION}" "$INTRO_SEC"
make_title_card "$OUTRO" "Available now" "${VERSION}" "$OUTRO_SEC"

printf "file '%s'\n" "$INTRO" >> "$CONCAT_LIST"

for entry in "${ORDER[@]}"; do
  kind="${entry%%:*}"
  name="${entry#*:}"

  if [[ "$kind" == "t" ]]; then
    card="$TRANS_DIR/t-${name}.mp4"
    [[ -f "$card" ]] || { echo "[post] Missing transition $card" >&2; exit 1; }
    printf "file '%s'\n" "$card" >> "$CONCAT_LIST"
  else
    raw="$SEG_DIR/${name}.webm"
    [[ -f "$raw" ]] || { echo "[post] Missing segment $raw" >&2; exit 1; }
    norm="$WORK/${name}.mp4"
    normalize_segment "$raw" "$norm"
    printf "file '%s'\n" "$norm" >> "$CONCAT_LIST"
  fi
done

printf "file '%s'\n" "$OUTRO" >> "$CONCAT_LIST"

VIDEO_ONLY="$WORK/video_only.mp4"
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$VIDEO_ONLY"

TOTAL=$(clip_dur "$VIDEO_ONLY")
FADE_OUT=$(awk -v d="$TOTAL" 'BEGIN { printf "%.2f", d - 2.5 }')

echo "[post] Muxing final (${TOTAL}s, one continuous music bed)..."
ffmpeg -y -hide_banner -loglevel error -i "$VIDEO_ONLY" -i "$MUSIC_MP3" \
  -filter:a "volume=0.20,afade=t=in:st=0:d=1.5,afade=t=out:st=${FADE_OUT}:d=2.5" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest \
  "$FINAL_MP4"

rm -rf "$WORK"

echo "[post] Done: $FINAL_MP4 ($(clip_dur "$FINAL_MP4")s, $(du -h "$FINAL_MP4" | cut -f1))"

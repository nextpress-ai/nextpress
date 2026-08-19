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
WORK="$OUT_DIR/_work"

W=1280
H=720
FPS=30

BRAND="3b82f6"
INK="0f172a"
BG="f8fafc"

# A frame counts as blank when the greyscale standard deviation of its CONTENT
# AREA is this low. Two earlier attempts were both wrong:
#
#   * Luma percentiles (10th/90th spread): a legitimately near-white page --
#     the search showcase -- has almost no spread and got flagged blank end to
#     end.
#   * Whole-frame stddev: misses the worst artifact of the lot. When the editor
#     swaps preview viewports the canvas goes empty for ~1.5s but the toolbars
#     and side panels stay put, so the frame as a whole still looks busy.
#
# Cropping to the middle of the frame drops the app chrome and leaves only what
# the viewer is actually looking at. Measured over the raw segments:
#
#   boot canvas (uniform dark)       0.002
#   white page + spinner             0.012
#   preview viewport swap (empty)    0.005 - 0.012
#   search showcase (real page)      0.101
#   theme editor (quietest real UI)  0.089
#   editor / admin                   0.27 - 0.44
#
# 0.04 sits ~3x above the loading states and ~2x below the quietest real frame.
BLANK_STDDEV=0.04
BLANK_CROP="crop=iw*0.6:ih*0.72:iw*0.2:ih*0.16"
SAMPLE_FPS=10        # blank-run detection resolution, in frames per second
MIN_BLANK_RUN=0.35   # shorter flickers are not worth a cut
MIN_KEEP_RUN=0.40    # drop slivers left between two blank runs

mkdir -p "$WORK"

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
  local dur frames
  dur=$(clip_dur "$file")
  frames="$WORK/frames"

  rm -rf "$frames"; mkdir -p "$frames"
  ffmpeg -y -hide_banner -loglevel error -i "$file" \
    -vf "fps=${SAMPLE_FPS},${BLANK_CROP},scale=160:-1,format=gray" "$frames/%05d.png"

  # One identify process for the whole clip; per-file convert calls are ~50x slower.
  identify -format "%[fx:standard_deviation]\n" "$frames"/*.png \
  | awk -v dur="$dur" -v thresh="$BLANK_STDDEV" -v fps="$SAMPLE_FPS" \
        -v minblank="$MIN_BLANK_RUN" -v minkeep="$MIN_KEEP_RUN" '
      # n must start as a number: awk subscripts are strings, and an
      # uninitialised n indexes bs[""] rather than bs[0].
      BEGIN { n = 0; i = 0 }
      {
        t = i / fps; i++
        blank = ($1 + 0 <= thresh)
        if (blank && !inrun) { inrun = 1; rs = t }
        if (!blank && inrun) {
          inrun = 0
          if (t - rs >= minblank) { bs[n] = rs; be[n] = t; n++ }
        }
      }
      END {
        if (inrun) { bs[n] = rs; be[n] = dur; n++ }
        cur = 0
        for (j = 0; j < n; j++) {
          if (bs[j] - cur >= minkeep) printf "%.2f %.2f\n", cur, bs[j]
          cur = be[j]
        }
        if (dur - cur >= minkeep) printf "%.2f %.2f\n", cur, dur
      }'

  rm -rf "$frames"
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
  "s:07a-showcase-search"
  "s:07b-showcase-ngo"
  "s:07c-showcase-blog"
)

echo "[post] De-blanking segments..."
CONCAT_LIST="$WORK/concat.txt"
: > "$CONCAT_LIST"

INTRO="$TRANS_DIR/intro.mp4"
OUTRO="$TRANS_DIR/outro.mp4"
for card in "$INTRO" "$OUTRO"; do
	[[ -f "$card" ]] || { echo "[post] Missing bookend $card" >&2; exit 1; }
done

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

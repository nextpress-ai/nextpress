import { useState, useCallback, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { SettingsDisclosure } from "./shared/settings-disclosure"
import { Eye } from 'lucide-react'
import type { BlockAnimation, EntryAnimation, HoverAnimation, LoopAnimation } from "@shared/schema-types"
import { entryPresets, hoverPresets, loopPresets, isNextpressMotion, type AnimationPreset } from "@/lib/animation-presets"
import { Switch } from "@/components/ui/switch"
import { SettingsLabel } from "./shared"
import { DimensionPresetField } from "./dimension-preset-field"
import { useCanvasMotionPaused } from "@/lib/canvas-motion-pause"

const ORBIT_RADIUS_PRESETS = [
  { value: "80px", label: "S" },
  { value: "140px", label: "M" },
  { value: "200px", label: "L" },
  { value: "280px", label: "XL" },
]

/** Seconds for one round: Nextpress moves are slow, Animate.css presets are quick. */
const loopSecondsRange = (name: string) =>
  isNextpressMotion(name) ? { min: 1, max: 60, step: 1, fallback: name === "np-float" ? 4 : name === "np-spin" ? 12 : 24 } : { min: 0.3, max: 5, step: 0.1, fallback: 1 }
import {
  triggerEntryAnimationPreview,
  clearEntryAnimationPreview,
} from "@/lib/entry-animation-preview-store"
import {
  scheduleAnimateCssPreview,
  clearAnimateCssPreview,
} from "@/lib/play-animate-css-preview"

interface AnimationPickerProps {
  animation: BlockAnimation | null | undefined
  blockId: string
  onChange: (animation: BlockAnimation | undefined) => void
}

/**
 * Sidebar animation selection UI — entry, hover, and loop categories.
 * Users select from curated Animate.css presets.
 */
export default function AnimationPicker({ animation, blockId, onChange }: AnimationPickerProps) {
  const [motionPaused, setMotionPaused] = useCanvasMotionPaused()

  const updateAnimation = useCallback((updates: Partial<BlockAnimation>) => {
    // Use null instead of undefined for cleared categories so deepMerge properly removes them
    const sanitized = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [k, v === undefined ? null : v])
    )
    const next = { ...animation, ...sanitized }
    // If all categories are cleared, remove animation entirely
    if (!next.entry && !next.hover && !next.loop) {
      onChange(undefined)
    } else {
      onChange(next as BlockAnimation)
    }
  }, [animation, onChange])

  /** Preview entry animation on the canvas block via React-controlled classes. */
  const previewEntryAnimation = useCallback((
    animName: string,
    durationMs?: number,
    delayMs?: number,
  ) => {
    triggerEntryAnimationPreview({
      blockId,
      animName,
      durationMs: durationMs ?? 1000,
      delayMs: delayMs ?? 0,
    });
  }, [blockId])

  const stopPreview = useCallback(() => {
    clearAnimateCssPreview(blockId);
    clearEntryAnimationPreview();
  }, [blockId])

  /** Preview hover/loop animations imperatively (not entry — those use the preview store). */
  const previewHoverOrLoopAnimation = useCallback((
    animName: string,
    infinite = false,
  ) => {
    scheduleAnimateCssPreview({ blockId, animName, infinite });
  }, [blockId])

  const renderPresetGrid = (
    presets: AnimationPreset[],
    selected: string | undefined,
    onSelect: (name: string | undefined) => void,
    onHover?: (name: string) => void
  ) => (
    <div className="space-y-2">
      {/* None option */}
      <button
        onClick={() => onSelect(undefined)}
        className={`w-full text-left px-2 py-1.5 text-xs border rounded-none transition-colors ${
          !selected
            ? "bg-npb-interactive-bg-active text-npb-interactive-text-active border-npb-border-strong"
            : "bg-npb-interactive-bg text-npb-interactive-text border-npb-border-default hover:bg-npb-interactive-bg-hover"
        }`}
      >
        None
      </button>

      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onSelect(preset.name)}
            onMouseEnter={() => onHover?.(preset.name)}
            className={`px-2 py-1.5 text-xs border rounded-none transition-colors text-left truncate ${
              selected === preset.name
                ? "bg-npb-interactive-bg-active text-npb-interactive-text-active border-npb-border-strong"
                : "bg-npb-interactive-bg text-npb-text-secondary border-npb-border-default hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong"
            }`}
            title={preset.label}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Entry Animations */}
      <SettingsDisclosure title="Entry Animation" defaultOpen={!!animation?.entry}>
        {renderPresetGrid(
          entryPresets,
          animation?.entry?.name,
          (name) => {
            if (!name) {
              updateAnimation({ entry: undefined })
            } else {
              updateAnimation({
                entry: {
                  name,
                  duration: animation?.entry?.duration ?? 1000,
                  delay: animation?.entry?.delay ?? 0,
                  once: animation?.entry?.once ?? true,
                },
              })
              previewEntryAnimation(
                name,
                animation?.entry?.duration ?? 1000,
                animation?.entry?.delay ?? 0,
              )
            }
          }
        )}

        {/* Entry options (only if entry is selected) */}
        {animation?.entry && (
          <div className="space-y-3 mt-3 pt-3 border-t border-npb-border-default">
            {/* Duration */}
            <div>
              <Label className="text-xs text-npb-text-secondary">Duration: {animation.entry.duration ?? 1000}ms</Label>
              <Slider
                value={[animation.entry.duration ?? 1000]}
                onValueChange={([v]) => {
                  updateAnimation({ entry: { ...animation.entry!, duration: v } })
                  previewEntryAnimation(
                    animation.entry!.name,
                    v,
                    animation.entry!.delay ?? 0,
                  )
                }}
                min={200}
                max={3000}
                step={50}
                className="mt-1"
              />
            </div>

            {/* Delay */}
            <div>
              <Label className="text-xs text-npb-text-secondary">Delay</Label>
              <Input
                type="number"
                value={animation.entry.delay ?? 0}
                onChange={(e) => {
                  const delay = Number(e.target.value)
                  updateAnimation({
                    entry: { ...animation.entry!, delay },
                  })
                  previewEntryAnimation(
                    animation.entry!.name,
                    animation.entry!.duration ?? 1000,
                    delay,
                  )
                }}
                min={0}
                max={3000}
                step={50}
                className="h-8 text-xs border-npb-border-default rounded-none mt-1"
                placeholder="0ms"
              />
            </div>

            {/* Play once toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={animation.entry.once ?? true}
                onChange={(e) =>
                  updateAnimation({
                    entry: { ...animation.entry!, once: e.target.checked },
                  })
                }
                className="rounded-none border-npb-border-strong"
              />
              <span className="text-xs text-npb-text-secondary">Play once only</span>
            </label>

            {/* Preview button */}
            <button
              onClick={() =>
                previewEntryAnimation(
                  animation.entry!.name,
                  animation.entry!.duration ?? 1000,
                  animation.entry!.delay ?? 0,
                )
              }
              className="w-full px-2 py-1.5 text-xs border border-npb-border-default rounded-none bg-npb-interactive-bg text-npb-text-secondary hover:bg-npb-interactive-bg-hover transition-colors flex items-center justify-center gap-1"
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
          </div>
        )}
      </SettingsDisclosure>

      {/* Hover Animations */}
      <SettingsDisclosure title="Hover Animation" defaultOpen={!!animation?.hover}>
        {renderPresetGrid(
          hoverPresets,
          animation?.hover?.name,
          (name) => {
            if (!name) {
              updateAnimation({ hover: undefined })
              stopPreview()
            } else {
              updateAnimation({ hover: { name } })
            }
          },
          (name) => {
            // Lift / Grow show on the canvas by hovering the block itself.
            if (!isNextpressMotion(name)) previewHoverOrLoopAnimation(name)
          }
        )}
      </SettingsDisclosure>

      {/* Loop Animations */}
      <SettingsDisclosure title="Loop Animation" defaultOpen={!!animation?.loop}>
        {renderPresetGrid(
          loopPresets,
          animation?.loop?.name,
          (name) => {
            if (!name) {
              updateAnimation({ loop: undefined })
              stopPreview()
            } else {
              // Keep the speed only while staying in the same family (seconds mean different things).
              const keep = animation?.loop && isNextpressMotion(animation.loop.name) === isNextpressMotion(name)
              updateAnimation({
                loop: {
                  name,
                  ...(keep && animation?.loop?.durationMs ? { durationMs: animation.loop.durationMs } : {}),
                  ...(animation?.loop?.reverse ? { reverse: true } : {}),
                  ...(name === "np-orbit"
                    ? { orbitRadius: animation?.loop?.orbitRadius ?? "140px", orbitStart: animation?.loop?.orbitStart ?? 0 }
                    : {}),
                },
              })
              if (!isNextpressMotion(name)) previewHoverOrLoopAnimation(name, true)
            }
          }
        )}

        {animation?.loop ? (() => {
          const loop = animation.loop
          const range = loopSecondsRange(loop.name)
          const seconds = loop.durationMs ? loop.durationMs / 1000 : range.fallback
          return (
            <div className="space-y-3 mt-3 pt-3 border-t border-npb-border-default">
              <div>
                <Label className="text-xs text-npb-text-secondary">One round: {seconds.toFixed(isNextpressMotion(loop.name) ? 0 : 1)}s</Label>
                <Slider
                  value={[seconds]}
                  onValueChange={([v]) => updateAnimation({ loop: { ...loop, durationMs: Math.round((v ?? range.fallback) * 1000) } })}
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  className="mt-1"
                  aria-label="Seconds for one round"
                />
              </div>

              {loop.name === "np-orbit" ? (
                <>
                  <DimensionPresetField
                    label="Distance from centre"
                    presets={ORBIT_RADIUS_PRESETS}
                    value={loop.orbitRadius ?? "140px"}
                    onChange={(next) => updateAnimation({ loop: { ...loop, orbitRadius: next || "140px" } })}
                    customPlaceholder="e.g. 160px, 30%"
                  />
                  <div>
                    <Label className="text-xs text-npb-text-secondary">Start on the circle: {loop.orbitStart ?? 0}°</Label>
                    <Slider
                      value={[loop.orbitStart ?? 0]}
                      onValueChange={([v]) => updateAnimation({ loop: { ...loop, orbitStart: v ?? 0 } })}
                      min={0}
                      max={359}
                      step={15}
                      className="mt-1"
                      aria-label="Start angle on the circle"
                    />
                  </div>
                  <p className="npb-settings-hint-muted text-xs">
                    Circles the centre of its parent. For a ring of icons, put them in an overlay
                    stack, pin each to the middle, give them the same speed and spread their start
                    (for 6 icons: 0°, 60°, 120°…).
                  </p>
                </>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <SettingsLabel htmlFor={`loop-reverse-${blockId}`}>
                  {loop.name === "np-orbit" || loop.name === "np-spin" ? "Turn the other way" : "Play backwards"}
                </SettingsLabel>
                <Switch
                  id={`loop-reverse-${blockId}`}
                  checked={loop.reverse === true}
                  onCheckedChange={(checked) => updateAnimation({ loop: { ...loop, reverse: checked } })}
                />
              </div>
            </div>
          )
        })() : null}

        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-npb-border-default">
          <div className="min-w-0">
            <SettingsLabel htmlFor="canvas-motion-pause">Pause motion on the canvas</SettingsLabel>
            <p className="npb-settings-hint-muted text-xs">Only while editing. Preview and the live page still move.</p>
          </div>
          <Switch id="canvas-motion-pause" checked={motionPaused} onCheckedChange={setMotionPaused} />
        </div>
      </SettingsDisclosure>
    </div>
  )
}

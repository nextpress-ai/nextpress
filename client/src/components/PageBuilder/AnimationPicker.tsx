import { useState, useCallback, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { CollapsibleCard } from "@/components/ui/collapsible-card"
import { Zap, MousePointer, Repeat, Eye, X } from "lucide-react"
import type { BlockAnimation, EntryAnimation, HoverAnimation, LoopAnimation } from "@shared/schema-types"
import { entryPresets, hoverPresets, loopPresets, type AnimationPreset } from "@/lib/animation-presets"
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
      <CollapsibleCard title="Entry Animation" icon={Eye} defaultOpen={!!animation?.entry}>
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
      </CollapsibleCard>

      {/* Hover Animations */}
      <CollapsibleCard title="Hover Animation" icon={MousePointer} defaultOpen={!!animation?.hover}>
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
          (name) => previewHoverOrLoopAnimation(name)
        )}
      </CollapsibleCard>

      {/* Loop Animations */}
      <CollapsibleCard title="Loop Animation" icon={Repeat} defaultOpen={!!animation?.loop}>
        {renderPresetGrid(
          loopPresets,
          animation?.loop?.name,
          (name) => {
            if (!name) {
              updateAnimation({ loop: undefined })
              stopPreview()
            } else {
              updateAnimation({ loop: { name } })
              previewHoverOrLoopAnimation(name, true)
            }
          }
        )}
      </CollapsibleCard>
    </div>
  )
}

import type { BlockAnimation, EntryAnimation, HoverAnimation, LoopAnimation } from '@shared/schema-types'

/** Animation preset definition for sidebar UI */
export interface AnimationPreset {
  name: string;       // Animate.css class name (without animate__ prefix)
  label: string;      // Human-readable label for sidebar UI
}

/** Entry presets — scroll-triggered entrance animations */
export const entryPresets: AnimationPreset[] = [
  { name: "fadeIn", label: "Fade In" },
  { name: "fadeInUp", label: "Fade In Up" },
  { name: "fadeInDown", label: "Fade In Down" },
  { name: "fadeInLeft", label: "Fade In Left" },
  { name: "fadeInRight", label: "Fade In Right" },
  { name: "bounceIn", label: "Bounce In" },
  { name: "bounceInUp", label: "Bounce In Up" },
  { name: "bounceInDown", label: "Bounce In Down" },
  { name: "bounceInLeft", label: "Bounce In Left" },
  { name: "bounceInRight", label: "Bounce In Right" },
  { name: "zoomIn", label: "Zoom In" },
  { name: "zoomInUp", label: "Zoom In Up" },
  { name: "zoomInDown", label: "Zoom In Down" },
  { name: "slideInUp", label: "Slide In Up" },
  { name: "slideInDown", label: "Slide In Down" },
  { name: "slideInLeft", label: "Slide In Left" },
  { name: "slideInRight", label: "Slide In Right" },
  { name: "flipInX", label: "Flip In X" },
  { name: "flipInY", label: "Flip In Y" },
  { name: "rotateIn", label: "Rotate In" },
  { name: "jackInTheBox", label: "Jack In The Box" },
  { name: "rollIn", label: "Roll In" },
  { name: "lightSpeedInRight", label: "Light Speed Right" },
  { name: "lightSpeedInLeft", label: "Light Speed Left" },
  { name: "backInUp", label: "Back In Up" },
  { name: "backInDown", label: "Back In Down" },
  { name: "backInLeft", label: "Back In Left" },
  { name: "backInRight", label: "Back In Right" },
]

/** Hover presets — attention seekers that play on mouse hover */
export const hoverPresets: AnimationPreset[] = [
  // Nextpress looks: a short ease in and out, only on devices with a mouse.
  { name: "np-lift", label: "Lift" },
  { name: "np-grow", label: "Grow" },
  { name: "pulse", label: "Pulse" },
  { name: "rubberBand", label: "Rubber Band" },
  { name: "tada", label: "Tada" },
  { name: "wobble", label: "Wobble" },
  { name: "jello", label: "Jello" },
  { name: "headShake", label: "Head Shake" },
  { name: "swing", label: "Swing" },
  { name: "bounce", label: "Bounce" },
  { name: "flash", label: "Flash" },
  { name: "shakeX", label: "Shake X" },
  { name: "shakeY", label: "Shake Y" },
  { name: "heartBeat", label: "Heart Beat" },
  { name: "flip", label: "Flip" },
]

/** Loop presets — continuous/repeating attention animations */
export const loopPresets: AnimationPreset[] = [
  // Nextpress moves: slow and smooth, with speed (and radius for Orbit) in the panel.
  { name: "np-orbit", label: "Orbit" },
  { name: "np-float", label: "Float" },
  { name: "np-spin", label: "Spin" },
  { name: "pulse", label: "Pulse" },
  { name: "bounce", label: "Bounce" },
  { name: "flash", label: "Flash" },
  { name: "heartBeat", label: "Heart Beat" },
  { name: "swing", label: "Swing" },
  { name: "tada", label: "Tada" },
  { name: "wobble", label: "Wobble" },
  { name: "jello", label: "Jello" },
  { name: "rubberBand", label: "Rubber Band" },
  { name: "shakeX", label: "Shake X" },
  { name: "shakeY", label: "Shake Y" },
]

export { getEntryAnimationAttributes, generateBlockAnimationCSS, generateHoverAnimationCSS, generateLoopAnimationCSS } from "@shared/animation-utils";

/** True for Nextpress's own moves and looks (their preview comes from the block's CSS, not Animate.css). */
export const isNextpressMotion = (name: string): boolean => name.startsWith("np-");








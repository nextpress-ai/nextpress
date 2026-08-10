import type { Transition, Variants } from 'framer-motion';

/** Shared easing aligned with `--npb-ease-out`. */
export const MOTION_EASE_OUT: Transition['ease'] = [0.23, 1, 0.32, 1];

export const MOTION_PAGE: Transition = {
  duration: 0.28,
  ease: MOTION_EASE_OUT,
};

export const MOTION_MICRO: Transition = {
  duration: 0.18,
  ease: MOTION_EASE_OUT,
};

export const MOTION_STAGGER: Transition = {
  duration: 0.22,
  ease: MOTION_EASE_OUT,
};

export const pageEnterVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: MOTION_STAGGER },
};

export const bulkBarVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    marginBottom: 12,
    transition: MOTION_MICRO,
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { ...MOTION_MICRO, duration: 0.14 },
  },
};

export const sidebarVariants: Variants = {
  hidden: { x: -24, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.24, ease: MOTION_EASE_OUT } },
  exit: { x: -24, opacity: 0, transition: { duration: 0.18, ease: MOTION_EASE_OUT } },
};

export const pressableWhileTap = { scale: 0.985 };

import type { ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import {
  bulkBarVariants,
  MOTION_PAGE,
  pageEnterVariants,
  pressableWhileTap,
  sidebarVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/motion-presets';
import { useMotionEnabled } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

type MotionPageProps = {
  children: ReactNode;
  className?: string;
};

/** Soft page enter for admin routes and panels. */
export function MotionPage({ children, className }: MotionPageProps): JSX.Element {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={pageEnterVariants}
      initial="hidden"
      animate="visible"
      transition={MOTION_PAGE}>
      {children}
    </motion.div>
  );
}

type MotionStaggerProps = {
  children: ReactNode;
  className?: string;
};

/** Stagger children for stat grids and quick-action rows. */
export function MotionStagger({ children, className }: MotionStaggerProps): JSX.Element {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible">
      {children}
    </motion.div>
  );
}

type MotionStaggerItemProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

export function MotionStaggerItem({
  children,
  className,
  ...rest
}: MotionStaggerItemProps): JSX.Element {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItemVariants} {...rest}>
      {children}
    </motion.div>
  );
}

type MotionPressableProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
};

/** Subtle tap feedback for cards and list tiles. */
export function MotionPressable({
  children,
  className,
  ...rest
}: MotionPressableProps): JSX.Element {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: -1 }}
      whileTap={pressableWhileTap}
      transition={{ duration: 0.16 }}
      {...rest}>
      {children}
    </motion.div>
  );
}

type MotionBulkBarProps = {
  visible: boolean;
  children: ReactNode;
  className?: string;
};

/** Collapsing bulk-action strip above admin tables. */
export function MotionBulkBar({
  visible,
  children,
  className,
}: MotionBulkBarProps): JSX.Element | null {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return visible ? <div className={cn('mb-3', className)}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="bulk-bar"
          className={cn('overflow-hidden', className)}
          variants={bulkBarVariants}
          initial="hidden"
          animate="visible"
          exit="exit">
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type MotionSidebarPanelProps = {
  visible: boolean;
  children: ReactNode;
  className?: string;
};

/** Editor library rail enter/exit. */
export function MotionSidebarPanel({
  visible,
  children,
  className,
}: MotionSidebarPanelProps): JSX.Element | null {
  const motionEnabled = useMotionEnabled();

  if (!motionEnabled) {
    return visible ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="builder-sidebar"
          className={className}
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          exit="exit">
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

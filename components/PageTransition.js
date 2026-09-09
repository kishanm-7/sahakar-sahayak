'use client';

import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Route-level transition. Keying on the pathname is what makes AnimatePresence
// treat each route as a separate element, so the outgoing page finishes
// animating before the incoming one mounts. mode="wait" stops the two pages
// briefly stacking and doubling the page height.
//
// This deliberately animates OPACITY ONLY -- no y/translate, no scale.
// A transformed element becomes the containing block for any `position: fixed`
// descendant, so a slide here would re-anchor the chat composer to this div
// instead of the viewport and drop it into the middle of the screen. Keeping
// this transform-free is what lets the composer stay pinned above the mobile
// tab bar. Individual sections still slide; they just do it inside a wrapper
// that never transforms.
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    // Honours the OS "reduce motion" setting for every Framer animation below.
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

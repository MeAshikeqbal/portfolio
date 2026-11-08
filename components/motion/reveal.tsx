'use client'

import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

const spring = { type: 'spring', bounce: 0.4, duration: 0.8 } as const

const presets = {
  /** Slide up and fade in. */
  rise: {
    offscreen: { y: 50, opacity: 0 },
    onscreen: { y: 0, opacity: 1, transition: spring },
  },
  /** Scale up and fade in. */
  pop: {
    offscreen: { scale: 0.8, opacity: 0 },
    onscreen: { scale: 1, opacity: 1, transition: spring },
  },
  /** Drop down and fade in. */
  drop: {
    offscreen: { y: -20, opacity: 0 },
    onscreen: { y: 0, opacity: 1, transition: { duration: 0.8 } },
  },
} satisfies Record<string, Variants>

interface RevealProps {
  preset?: keyof typeof presets
  className?: string
  children: ReactNode
}

/**
 * Animates its children into view once, the first time they scroll on screen.
 * A thin client island so the surrounding markup can stay a server component.
 */
export function Reveal({ preset = 'rise', className, children }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.1 }}
      variants={presets[preset]}
    >
      {children}
    </motion.div>
  )
}

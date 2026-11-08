"use client"

import * as HoverCardPrimitive from "@radix-ui/react-hover-card"
import Image from "next/image"
import { encode } from "qss"
import React, { useState } from "react"
import { useHydrated } from "@/hooks/use-hydrated"
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type LinkPreviewProps = {
  children: React.ReactNode
  url: string
  className?: string
  width?: number
  height?: number
  quality?: number
  style?: React.CSSProperties
} & ({ isStatic: true; imageSrc: string } | { isStatic?: false; imageSrc?: never })

export const LinkPreview: React.FC<LinkPreviewProps> = ({
  children,
  url,
  className,
  width = 200,
  height = 125,
  quality = 50,
  style = {},
  isStatic = false,
  imageSrc = "",
}) => {
  const [isOpen, setOpen] = useState(false)
  const isMounted = useHydrated()

  const src = isStatic
    ? imageSrc
    : `https://api.microlink.io/?${encode({
        url,
        // qss can't encode nested objects; a nested value was sent as "[object Object]".
        screenshot: true,
        meta: false,
        embed: "screenshot.url",
        colorScheme: "dark",
        "viewport.deviceScaleFactor": 0.5,
        "viewport.width": width * 3,
        "viewport.height": height * 3,
      })}`

  const springConfig = { stiffness: 100, damping: 15 }
  const x = useMotionValue(0)
  const translateX = useSpring(x, springConfig)

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const targetRect = event.currentTarget.getBoundingClientRect()
    const eventOffsetX = event.clientX - targetRect.left
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2
    x.set(offsetFromCenter)
  }

  return (
    <>
      {isMounted && (
        <div className="hidden">
          <Image
            src={src}
            width={width}
            height={height}
            quality={quality}
            style={style}
            priority={true}
            alt="Link preview"
          />
        </div>
      )}

      <HoverCardPrimitive.Root openDelay={50} closeDelay={100} onOpenChange={setOpen}>
        <HoverCardPrimitive.Trigger asChild>
          <Link
            href={url}
            className={cn("text-black dark:text-white", className)}
            onMouseMove={handleMouseMove}
          >
            {children}
          </Link>
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Content
          className="z-50 origin-(--radix-hover-card-content-transform-origin)"
          side="top"
          align="center"
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="rounded-xl shadow-xl"
                style={{ x: translateX }}
              >
                <Link
                  href={url}
                  className="block rounded-xl border-2 border-transparent bg-white p-1 shadow-sm hover:border-neutral-200 dark:bg-neutral-900 dark:hover:border-neutral-800"
                >
                  <Image
                    src={src}
                    width={width}
                    height={height}
                    quality={quality}
                    style={style}
                    priority={true}
                    className="rounded-lg"
                    alt="Link preview"
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Root>
    </>
  )
}

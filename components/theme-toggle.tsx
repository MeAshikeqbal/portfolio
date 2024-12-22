'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

export function AnimatedThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <motion.button
      className="relative inline-flex h-10 w-20 items-center justify-between rounded-full bg-gray-200 p-1 dark:bg-gray-800"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-700"
        initial={{ x: theme === 'dark' ? 40 : 0 }}
        animate={{ x: theme === 'dark' ? 40 : 0 }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30
        }}
      >
        <Sun className={`h-4 w-4 text-yellow-500 absolute ${theme === 'dark' ? 'opacity-0' : 'opacity-100'} transition-opacity`} />
        <Moon className={`h-4 w-4 text-blue-500 absolute ${theme === 'light' ? 'opacity-0' : 'opacity-100'} transition-opacity`} />
      </motion.div>
      <span className="sr-only">
        {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      </span>
    </motion.button>
  )
}
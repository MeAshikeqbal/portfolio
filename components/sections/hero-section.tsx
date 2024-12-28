'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { FileDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { client } from '@/sanity/lib/client'

const useCvUrl = () => {
  const [cvUrl, setCvUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchCvUrl = async () => {
      const result = await client.fetch(`*[_type == "cv"][0].cvFile.asset->url`)
      setCvUrl(result)
    }
    fetchCvUrl()
  }, [])

  return cvUrl
}

export default function Hero() {
  const cvUrl = useCvUrl()

  return (
    <section id='Home' className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 py-16 lg:py-0">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 text-center lg:text-left"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-800 dark:text-white">
            Hello, I&apos;m <span className="text-indigo-600 dark:text-indigo-400">Ashik Eqbal</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 text-gray-600 dark:text-gray-300">
            A passionate software engineer who loves to build web applications.
          </p>
          {cvUrl && (
            <motion.a
              href={cvUrl}
              download="Ashik Eqbal CV.pdf"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300 text-sm sm:text-base"
            >
              <FileDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Download CV
            </motion.a>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 flex justify-center"
        >
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80">
            <Image
              src="/me.jpeg"
              alt="Ashik Eqbal"
              style={{objectFit: 'cover'}}
              fill
              className="rounded-full shadow-2xl"
            />
          </div>
        </motion.div>
      </div>
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden sm:flex"
      >
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
          <motion.div
            animate={{
              y: [0, 12, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
            }}
            className="w-1 h-3 bg-gray-400 rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  )
}


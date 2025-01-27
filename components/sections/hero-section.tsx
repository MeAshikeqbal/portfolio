'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { FileDown, Github, Linkedin, RssIcon, Twitter } from 'lucide-react'
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

const socialLinks = [
  { icon: Github, href: 'https://github.com/MeAshikEqbal' },
  { icon: Linkedin, href: 'https://linkedin.com/in/itsashik' },
  { icon: Twitter, href: 'https://x.com/me_ashikeqbal' },
  { icon: RssIcon, href: 'https://www.itsashik.info/rss.xml' },
]

export default function Hero() {
  const cvUrl = useCvUrl()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <section id='Home' className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="container mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 py-16 lg:py-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="lg:w-1/2 text-center lg:text-left">
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-800 dark:text-white"
            variants={itemVariants}
          >
            Hello, I&apos;m <span className="text-indigo-600 dark:text-indigo-400">Ashik Eqbal</span>
          </motion.h1>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl mb-8 text-gray-600 dark:text-gray-300"
            variants={itemVariants}
          >
            A passionate software engineer who loves to build web applications.
          </motion.p>
          <motion.div className="flex justify-center lg:justify-start space-x-4 mb-8" variants={itemVariants}>
            {socialLinks.map((link, index) => (
              <motion.a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-300"
                aria-label={link.icon.displayName}
              >
                <link.icon className="h-6 w-6" />
              </motion.a>
            ))}
          </motion.div>
          {cvUrl && (
            <motion.a
              href={cvUrl}
              download="Ashik Eqbal CV.pdf"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300 text-sm sm:text-base"
              variants={itemVariants}
            >
              <FileDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Download CV
            </motion.a>
          )}
        </div>
        <motion.div
          className="lg:w-1/2 flex justify-center"
          variants={itemVariants}
        >
          <motion.div 
            className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <Image
              src="/me.jpeg"
              alt="Ashik Eqbal"
              style={{objectFit: 'cover'}}
              className="rounded-full shadow-2xl"
              priority={true}
              width={320}
              height={320}
            />
          </motion.div>
        </motion.div>
      </motion.div>
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
        <motion.div 
          className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center"
          whileHover={{ scale: 1.1 }}
        >
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
        </motion.div>
      </motion.div>
    </section>
  )
}
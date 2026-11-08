"use client"

import Image from "next/image"
import { motion } from "motion/react"
import { FileDown, RssIcon } from "lucide-react"
import { FaGithub as Github, FaLinkedin as Linkedin, FaXTwitter as Twitter } from "react-icons/fa6"
import { siteConfig } from "@/lib/site"

const socialLinks = [
  { icon: Github, href: siteConfig.socials.github, label: "GitHub" },
  { icon: Linkedin, href: siteConfig.socials.linkedin, label: "LinkedIn" },
  { icon: Twitter, href: siteConfig.socials.twitter, label: "X (Twitter)" },
  { icon: RssIcon, href: "/rss.xml", label: "RSS feed" },
]

export function HeroContent({ cvUrl }: { cvUrl: string | null }) {
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
    <section
      id="Home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-100 to-indigo-100 px-4 sm:px-6 lg:px-8 dark:from-gray-900 dark:to-indigo-900"
    >
      <motion.div
        className="container mx-auto flex flex-col items-center justify-between gap-12 py-16 lg:flex-row lg:py-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center lg:w-1/2 lg:text-left">
          <motion.h1
            className="mb-4 text-3xl font-bold text-gray-800 sm:text-4xl md:text-5xl lg:text-6xl dark:text-white"
            variants={itemVariants}
          >
            Hello, I&apos;m{" "}
            <span className="text-indigo-600 dark:text-indigo-400">Ashik Eqbal</span>
          </motion.h1>
          <motion.p
            className="mb-8 text-lg text-gray-600 sm:text-xl md:text-2xl dark:text-gray-300"
            variants={itemVariants}
          >
            A passionate software engineer who loves to build web applications.
          </motion.p>
          <motion.div
            className="mb-8 flex justify-center space-x-4 lg:justify-start"
            variants={itemVariants}
          >
            {socialLinks.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-gray-600 transition-colors duration-300 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                aria-label={link.label}
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
              className="inline-flex items-center rounded-full bg-indigo-600 px-6 py-3 text-sm text-white transition duration-300 hover:bg-indigo-700 sm:text-base"
              variants={itemVariants}
            >
              <FileDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Download CV
            </motion.a>
          )}
        </div>
        <motion.div className="flex justify-center lg:w-1/2" variants={itemVariants}>
          <motion.div
            className="relative h-48 w-48 sm:h-64 sm:w-64 md:h-72 md:w-72 lg:h-80 lg:w-80"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            <Image
              src="/me.jpeg"
              alt="Ashik Eqbal"
              style={{ objectFit: "cover" }}
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
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 transform sm:flex"
      >
        <motion.div
          className="flex h-10 w-6 justify-center rounded-full border-2 border-gray-400"
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
            className="mt-2 h-3 w-1 rounded-full bg-gray-400"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}

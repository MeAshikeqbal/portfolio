'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { motion, useInView } from 'framer-motion'
import { urlFor } from '@/sanity/lib/image'

interface Skill {
  name: string
  icon: {
    asset: {
      _ref: string
    }
  }
}

interface TechStackProps {
  skills: Skill[]
}

export default function TechStack({ skills }: TechStackProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  if (!skills || skills.length === 0) {
    return <div className="text-center text-muted-foreground">No skills found.</div>
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  return (
    <section id='Tech-Stack' ref={ref} className="min-h-screen flex items-center bg-muted py-16">
      <div className="container mx-auto px-4">
        <motion.h2 
          className="text-4xl font-bold text-center mb-12 text-foreground"
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Tech Stack
        </motion.h2>
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {skills.map((skill) => (
            <motion.div key={skill.name} variants={itemVariants}>
              <Card className="flex flex-col items-center justify-center p-4 h-full hover:shadow-lg transition-all duration-300 group">
                <CardContent className="flex flex-col items-center p-0">
                  {skill.icon && (
                    <motion.div 
                      className="w-20 h-20 relative mb-4 rounded-full bg-background/40 overflow-hidden group-hover:bg-primary/10 transition-colors duration-300"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Image
                        src={urlFor(skill.icon).url()}
                        alt={skill.name}
                        className="object-contain p-3"
                        fill
                        sizes="(max-width: 80px) 100vw, 80px"
                      />
                    </motion.div>
                  )}
                  <h3 className="text-lg font-semibold text-center text-foreground group-hover:text-primary transition-colors duration-300">{skill.name}</h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
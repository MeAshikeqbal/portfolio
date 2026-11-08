"use client"

import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, useInView } from "motion/react"
import { SkillIcon } from "@/components/skill-icon"
import type { Skill } from "@/lib/api"

interface TechStackProps {
  skills: Skill[]
}

export default function TechStack({ skills }: TechStackProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,
    // Trigger on the section's top edge: with ~130 skills the section is several viewports
    // tall, so an `amount` threshold (e.g. 20% visible) would never be reached.
    margin: "0px 0px -15% 0px",
  })

  if (!skills || skills.length === 0) {
    return <div className="text-center text-muted-foreground">No skills found.</div>
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        // Cap the whole cascade at ~1.2s regardless of how many skills there are.
        staggerChildren: Math.min(0.1, 1.2 / skills.length),
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <section id="Tech-Stack" ref={ref} className="flex min-h-screen items-center bg-muted py-16">
      <div className="container mx-auto px-4">
        <motion.h2
          className="mb-12 text-center text-4xl font-bold text-foreground"
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Tech Stack
        </motion.h2>
        <motion.div
          className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {skills.map((skill) => (
            <motion.div key={skill._id} variants={itemVariants}>
              <Card className="group flex h-full flex-col items-center justify-center p-4 transition-all duration-300 hover:shadow-lg">
                <CardContent className="flex flex-col items-center p-0">
                  {skill.icon && skill.name && (
                    <motion.div
                      className="relative mb-4 h-20 w-20 overflow-hidden rounded-full bg-background/40 transition-colors duration-300 group-hover:bg-primary/10"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <SkillIcon
                        name={skill.icon}
                        label={skill.name}
                        className="absolute inset-0 m-auto size-14 text-foreground"
                      />
                    </motion.div>
                  )}
                  <h3 className="text-center text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {skill.name}
                  </h3>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

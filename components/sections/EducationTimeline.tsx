'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'
import { motion, useAnimation, Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

interface Education {
    year: string
    degree: string
    school: string
    schoolLogo: {
        asset: {
            _ref: string
        }
    }
    desc: string
}

const getEducation = async (): Promise<Education[]> => {
    return client.fetch(`
    *[_type == "education"] | order(year desc) {
      year,
      degree,
      school,
      schoolLogo,
      desc
    }
  `)
}

const cardVariants: Variants = {
    offscreen: {
        y: 50,
        opacity: 0
    },
    onscreen: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            bounce: 0.4,
            duration: 0.8
        }
    }
}

const yearVariants: Variants = {
    offscreen: {
        scale: 0.8,
        opacity: 0
    },
    onscreen: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring",
            bounce: 0.4,
            duration: 0.8
        }
    }
}

function EducationCard({ education, index }: { education: Education, index: number }) {
    const controls = useAnimation()
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    })

    useEffect(() => {
        if (inView) {
            controls.start("onscreen")
        }
    }, [controls, inView])

    return (
        <div className="mb-12 md:mb-8 md:flex items-start">
            <motion.div
                className={`hidden md:block md:w-1/2 ${index % 2 === 0 ? 'md:pr-8 text-right' : 'md:pl-8 md:order-last'}`}
                initial="offscreen"
                animate={controls}
                variants={yearVariants}
            >
                <h3 className="text-3xl font-bold text-primary mb-4">{education.year}</h3>
            </motion.div>
            <div className="w-8 h-8 absolute left-1/2 transform -translate-x-1/2 -translate-y-3 rounded-full bg-primary border-4 border-background hidden md:block"></div>
            <motion.div
                ref={ref}
                className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:ml-8' : 'md:mr-8'}`}
                initial="offscreen"
                animate={controls}
                variants={cardVariants}
            >
                <Card className="hover:drop-shadow-md transition-shadow duration-300">
                    <CardContent className="p-6">
                        <h3 className="text-2xl font-bold text-primary mb-4 md:hidden">{education.year}</h3>
                        <div className="mb-8">
                            <div className="flex items-center mb-4">
                                {education.schoolLogo && (
                                    <div className="w-16 h-16 mr-4 relative flex-shrink-0">
                                        <Image
                                            src={urlFor(education.schoolLogo).width(64).height(64).url()}
                                            alt={education.school}
                                            width={64}
                                            height={64}
                                            className="rounded-full object-contain bg-background p-1 border border-border"
                                            sizes="(max-width: 640px) 64px, 128px"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold text-xl text-foreground my-2">{education.degree}</h4>
                                    <Badge variant="secondary" className="text-sm">{education.school}</Badge>
                                </div>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">{education.desc}</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}

export default function EducationTimeline() {
    const [education, setEducation] = useState<Education[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEducation = async () => {
            try {
                const data = await getEducation()
                setEducation(data)
            } catch (error) {
                console.error("Failed to fetch education:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchEducation()
    }, [])

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-center text-muted-foreground">Loading...</div>
    }

    if (!education || education.length === 0) {
        return <div className="min-h-screen flex items-center justify-center text-center text-muted-foreground">No education history found.</div>
    }

    return (
        <section id='Education-Journey' className="min-h-screen flex items-center bg-muted py-8">
            <div className="container mx-auto px-4">
                <motion.h2 
                    className="text-4xl font-bold text-center mb-16 text-foreground"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    Education Journey
                </motion.h2>
                <div className="relative">
                    {/* Vertical line - hidden on mobile */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-primary/20 hidden md:block"></div>

                    {education.map((edu, index) => (
                        <EducationCard key={edu.year} education={edu} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}
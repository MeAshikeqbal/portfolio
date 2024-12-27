'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LinkPreview } from "@/components/ui/link-preview"
import { Button } from "@/components/ui/button"
import { GitCommit, Github, Globe, Scale, Star } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'
import { motion } from 'framer-motion'

export interface Project {
  _id: string
  title: string
  slug: {
    current: string
  }
  description: string
  mainImage: MainImage
  publishedAt: string
  github: string
  url: string
  githubData?: {
    stars: number
    commits: number
    license: string
  }
}

interface MainImage {
  asset: {
    _ref: string
  }
  alt?: string
}

export function ProjectCard({ project }: { project: Project }) {
  const imageSrc = project.mainImage?.asset?._ref
    ? urlFor(project.mainImage).width(600).height(400).url()
    : '/placeholder.svg?height=400&width=600'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="flex flex-col h-full overflow-hidden group">
        <CardHeader>
          <CardTitle>
            <LinkPreview
              url={project.url || '#'}
              imageSrc={imageSrc}
              isStatic
              className="font-bold text-xl hover:underline transition-colors duration-200"
            >
              {project.title || 'Untitled Project'}
            </LinkPreview>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-muted-foreground mb-4 line-clamp-3">{project.description || 'No description available.'}</p>
          {project.githubData && (
            <motion.div 
              className="flex space-x-4 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {project.githubData.stars !== undefined && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  {project.githubData.stars} stars
                </div>
              )}
              {project.githubData.commits !== undefined && (
                <div className="flex items-center">
                  <GitCommit className="w-4 h-4 mr-1" />
                  {project.githubData.commits} commits
                </div>
              )}
              {project.githubData.license && (
                <div className="flex items-center">
                  <Scale className="w-4 h-4 mr-1" />
                  {project.githubData.license}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {project.github && (
            <Button variant="outline" size="sm" asChild>
              <motion.a 
                href={project.github} 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </motion.a>
            </Button>
          )}
          {project.url && (
            <Button variant="outline" size="sm" asChild>
              <motion.a 
                href={project.url} 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="w-4 h-4 mr-2" />
                Live Demo
              </motion.a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}
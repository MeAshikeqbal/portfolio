"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LinkPreview } from "@/components/ui/link-preview"
import { Button } from "@/components/ui/button"
import { GitCommit, Globe, Scale, Star } from "lucide-react"
import { FaGithub as Github } from "react-icons/fa6"
import { motion } from "motion/react"
import type { Project } from "@/lib/api"

export function ProjectCard({ project }: { project: Project }) {
  if (!project) {
    return null
  }

  const previewUrl = project.url || project.github

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle>
            {previewUrl ? (
              <LinkPreview
                url={previewUrl}
                className="text-xl font-bold transition-colors duration-200 hover:underline"
              >
                {project.title || "Untitled Project"}
              </LinkPreview>
            ) : (
              <span className="text-xl font-bold">{project.title || "Untitled Project"}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grow">
          <p className="mb-4 line-clamp-3 text-muted-foreground">
            {project.description || "No description available."}
          </p>
          {project.githubData && (
            <motion.div
              className="flex flex-wrap gap-4 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {project.githubData.stars != null && (
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4" />
                  {project.githubData.stars} stars
                </div>
              )}
              {project.githubData.commits != null && (
                <div className="flex items-center">
                  <GitCommit className="mr-1 h-4 w-4" />
                  {project.githubData.commits} commits
                </div>
              )}
              {project.githubData.license && (
                <div className="flex items-center">
                  <Scale className="mr-1 h-4 w-4" />
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
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </motion.a>
            </Button>
          )}
          {project.url ? (
            <Button variant="outline" size="sm" asChild>
              <motion.a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="mr-2 h-4 w-4" />
                Live Demo
              </motion.a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Globe className="mr-2 h-4 w-4" />
              No Demo
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

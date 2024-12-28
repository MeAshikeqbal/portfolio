'use client'

import { ProjectCard, Project } from './project-card'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectCardWrapperProps {
  project: Project | null
  isLoading: boolean
  error: string | null
}

export function ProjectCardWrapper({ project, isLoading, error }: ProjectCardWrapperProps) {
  if (isLoading) {
    return <ProjectCardSkeleton />
  }

  if (error) {
    return <ProjectCardError message={error} />
  }

  if (!project) {
    return <ProjectCardError message="Project data is missing." />
  }

  return <ProjectCard project={project} />
}

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4 border rounded-lg">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-24" />
      <div className="flex space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

function ProjectCardError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full p-4 space-y-4 border rounded-lg bg-red-50 dark:bg-red-900"
    >
      <p className="text-red-600 dark:text-red-300 font-semibold">Error loading project:</p>
      <p className="text-red-500 dark:text-red-400">{message}</p>
    </motion.div>
  )
}


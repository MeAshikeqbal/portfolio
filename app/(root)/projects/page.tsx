import type { Metadata } from "next"
import { getProjects } from "@/lib/api"
import { ProjectCard } from "@/components/project-card"

export const metadata: Metadata = {
  title: "Projects",
  description: "Open-source and personal projects by Ashik Eqbal.",
  alternates: { canonical: "/projects" },
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-foreground">All Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}


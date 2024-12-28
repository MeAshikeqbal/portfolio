import { fetchProjects } from "@/lib/api"
import { ProjectCard } from "@/components/project-card"

export const revalidate = 60

export default async function ProjectsPage() {
  const projects = await fetchProjects()

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


import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/project-card"
import { getProjects } from "@/lib/api"

export async function ProjectsSection() {
  const projects = await getProjects()
  // Featured projects first, then the rest in their configured order.
  const selected = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 3)

  return (
    <section id="Project" className="min-h-screen flex items-center justify-center bg-background py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Featured Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {selected.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Button asChild>
            <Link href="/projects">View All Projects</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

import { Button } from "../ui/button"
import { ProjectCardWrapper } from "../project-card-wrapper"
import { fetchProjects } from "@/lib/api"


export async function ProjectsSection() {
    const projects = await fetchProjects()

    return (
      <section id="Project" className="min-h-screen flex items-center justify-center bg-background py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Featured Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.slice(0, 3).map((project) => (
            <ProjectCardWrapper 
              key={project._id} 
              project={project} 
              isLoading={false} 
              error={null} 
            />
          ))}
        </div>
        <div className="text-center mt-12">
          <Button asChild>
            <a href="/projects">View All Projects</a>
          </Button>
        </div>
      </div>
    </section>
    )
}


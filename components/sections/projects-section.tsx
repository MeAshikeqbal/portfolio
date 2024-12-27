import { client } from "@/sanity/lib/client"
import { Button } from "../ui/button"
import { fetchGitHubData } from "@/lib/fetch-github-data"
import { ProjectCardWrapper } from "../project-card-wrapper"

// Interfaces
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
  
  
// Sanity Query
const fetchProjects = async (): Promise<Project[]> => {
    const projects: Project[] = await client.fetch(`
    *[_type == "project"] | order(_createdAt desc) [0...3] {
    _id,
    title,
    slug,
    description,
    mainImage,
    publishedAt,
    github,
    url,
    githubData
  }`)

  //Fetching GitHub Data
  const updatedProjects = await Promise.all(
    projects.map(async (project: Project) => {
      if (!project.githubData && project.github) {
        const githubData = await fetchGitHubData(project.github)
        if (githubData) {
          // Update the project in Sanity
          await client.patch(project._id).set({ githubData }).commit()
          return { ...project, githubData }
        }
      }
      return project
    })
  )

  return updatedProjects
}


export async function ProjectsSection() {
    const projects = await fetchProjects()

    return (
      <section id="Project" className="min-h-screen flex items-center justify-center bg-background">
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


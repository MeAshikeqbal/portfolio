import { client } from "@/sanity/lib/client"
import { ProjectCard } from "../project-card"
import { Button } from "../ui/button"
import Link from "next/link"

// Interfaces
interface Project {
    _id: string
    title: string
    description: string
    github: string
    url: string
    mainImage: {
        asset: {
            _ref: string
        }
    }
}

// Sanity Query
const fetchProjects = async (): Promise<Project[]> => {
    return await client.fetch(`
    *[_type == "project"] | order(_createdAt desc) {
        _id,
      title,
      description,
      github,
      url,
      mainImage
    }
  `)
}

export async function ProjectsSection() {
    const projects = await fetchProjects()

    return (
        <section className="min-h-screen flex items-center bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Featured Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.slice(0, 3).map((project) => (
                        <ProjectCard key={project._id} project={project} />
                    ))}
                </div>
                <div className="flex justify-center">
                    <Button asChild variant="outline" className="mt-8">
                        <Link href="/post">
                            View All Posts
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}


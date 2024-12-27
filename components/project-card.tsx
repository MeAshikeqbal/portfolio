import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LinkPreview } from "@/components/ui/link-preview"
import { Button } from "@/components/ui/button"
import { Github, Globe } from 'lucide-react'
import { urlFor } from '@/sanity/lib/image'

//interface
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

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>
          <LinkPreview
            url={project.url}
            imageSrc={urlFor(project.mainImage).width(600).height(400).url()}
            isStatic
            className="font-bold text-xl hover:underline"
          >
            {project.title}
          </LinkPreview>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground">{project.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <a href={project.github} target="_blank" rel="noopener noreferrer">
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={project.url} target="_blank" rel="noopener noreferrer">
            <Globe className="w-4 h-4 mr-2" />
            Live Demo
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}


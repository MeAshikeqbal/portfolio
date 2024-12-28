import { client } from '@/sanity/lib/client'
import { fetchGitHubData } from './fetch-github-data'

export interface Post {
  _id: string
  title: string
  slug: { current: string }
  mainImage?: {
    asset: {
      _ref: string
    }
    alt?: string
  }
  publishedAt?: string
  categories?: { title: string }[]
  author?: {
    name: string
  }
}

export interface Category {
  _id: string
  title: string
}

export async function getPosts(): Promise<Post[]> {
  return client.fetch(`
    *[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      mainImage,
      publishedAt,
      categories[]->{title},
      author->{name}
    }
  `)
}

export async function getCategories(): Promise<Category[]> {
  return client.fetch(`
    *[_type == "category"] {
      _id,
      title
    }
  `)
}

//get projects

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

export const fetchProjects = async (): Promise<Project[]> => {
    const projects: Project[] = await client.fetch(`
    *[_type == "project"] | order(_createdAt desc) {
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

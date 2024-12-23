import { client } from '@/sanity/lib/client'

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


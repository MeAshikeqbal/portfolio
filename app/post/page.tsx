import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon } from 'lucide-react'

interface Post {
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
}

interface Category {
  _id: string
  title: string
  posts: Post[]
}

async function getPostsWithCategories(): Promise<Category[]> {
  return client.fetch(`
    *[_type == "category"] {
      _id,
      title,
      "posts": *[_type == "post" && references(^._id)] | order(publishedAt desc) {
        _id,
        title,
        slug,
        mainImage,
        publishedAt,
        categories[]->{title}
      }
    }
  `)
}

export default async function AllPostsPage() {
  const categories = await getPostsWithCategories()

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-12 text-center">All Posts</h1>
        
        {categories.map((category) => (
          <section key={category._id} className="mb-16">
            <h2 className="text-3xl font-semibold mb-6 text-primary">{category.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.posts.map((post) => (
                <Card key={post._id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="p-0">
                    {post.mainImage?.asset?._ref ? (
                      <div className="relative h-48 w-full">
                        <Image
                          src={urlFor(post.mainImage.asset).width(400).height(300).url()}
                          alt={post.mainImage.alt || post.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">No Image Available</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow p-6">
                    <CardTitle className="text-xl font-semibold mb-2 line-clamp-2">
                      <Link href={`/post/${post.slug.current}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </CardTitle>
                    {post.publishedAt && (
                      <p className="text-sm text-muted-foreground mb-4">
                        <CalendarIcon className="w-4 h-4 inline mr-2" />
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {post.categories?.map((cat, index) => (
                        <Badge key={index} variant="secondary">
                          {cat.title}
                        </Badge>
                      ))}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

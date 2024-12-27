import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/sanity/lib/image'
import { PortableText } from '@portabletext/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { client } from '@/sanity/lib/client'
import { TypedObject } from '@portabletext/types'
import { CalendarIcon, UserIcon } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

// Interfaces
interface Author {
  name: string
}

interface Category {
  title: string
}

interface MainImage {
  asset: {
    _ref: string
  }
  alt?: string
}

interface Post {
  _id: string
  title: string
  slug: {
    current: string
  }
  author?: Author
  mainImage?: MainImage
  categories?: Category[]
  body?: TypedObject[]
  publishedAt?: string
}

// Sanity Query
const fetchPosts = async (): Promise<Post[]> => {
  return await client.fetch(`
    *[_type == "post"] | order(publishedAt desc) [0...3] {
      _id,
      title,
      slug,
      author->{name},
      mainImage,
      categories[]->{title},
      body,
      publishedAt
    }
  `)
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Component
export default async function PostSection() {
  const posts = await fetchPosts()

  if (!posts || posts.length === 0) {
    return (
      <section id="blog" className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-6">Latest Posts</h2>
          <p className="text-muted-foreground">No posts available at the moment. Check back soon!</p>
        </div>
      </section>
    )
  }

  return (
    <section id="blog" className="min-h-screen flex items-center bg-background">
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">Latest from Our Blog</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post._id} className="flex flex-col">
              <CardHeader className="p-0">
                {post.mainImage?.asset?._ref ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={urlFor(post.mainImage.asset._ref).width(400).height(300).url()}
                      alt={post.mainImage.alt || post.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-t-lg"
                      sizes='(min-width: 640px) 400px, (min-width: 768px) 300px, 100vw'
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <span className="text-muted-foreground">No Image Available</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-grow p-6">
                <CardTitle className="text-xl font-semibold mb-2 line-clamp-2">
                  {post.title || 'Untitled Post'}
                </CardTitle>
                <CardDescription className="flex items-center text-sm mb-4">
                  {post.author?.name && (
                    <span className="flex items-center mr-4">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {post.author.name}
                    </span>
                  )}
                  {post.publishedAt && (
                    <span className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {formatDate(post.publishedAt)}
                    </span>
                  )}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.categories?.map((category, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                    >
                      {category.title}
                    </Badge>
                  ))}
                </div>
                <div className="text-muted-foreground line-clamp-3">
                  {post.body ? (
                    <PortableText value={post.body} />
                  ) : (
                    <p>No content available</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 mt-auto">
                <Button asChild variant="outline" className="w-full">
                  <Link href={post.slug?.current ? `/post/${post.slug.current}` : '#'}>
                    Read More
                  </Link>
                </Button>
              </CardFooter>
            </Card>
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
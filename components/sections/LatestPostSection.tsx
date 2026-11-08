import Image from "next/image"
import Link from "next/link"
import { urlFor } from "@/sanity/lib/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getLatestPosts } from "@/lib/api"

// Helper function to format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Component
export default async function PostSection() {
  const posts = await getLatestPosts()

  if (!posts || posts.length === 0) {
    return (
      <section
        id="Blog"
        className="flex min-h-screen items-center justify-center bg-background px-4"
      >
        <div className="text-center">
          <h2 className="mb-6 text-3xl font-bold">Latest Posts</h2>
          <p className="text-muted-foreground">
            No posts available at the moment. Check back soon!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section id="Blog" className="flex min-h-screen items-center bg-background">
      <div className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-4xl font-bold">Latest Blog Posts</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post._id} className="flex flex-col hover:drop-shadow-md">
              <CardHeader className="p-0">
                {post.mainImage?.asset ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={urlFor(post.mainImage).width(400).height(300).url()}
                      alt={post.mainImage.alt || post.title || ""}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-t-lg"
                      sizes="(min-width: 640px) 400px, (min-width: 768px) 300px, 100vw"
                      priority={false}
                      placeholder="blur"
                      blurDataURL={urlFor(post.mainImage).width(100).height(100).blur(20).url()}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-t-lg bg-muted">
                    <span className="text-muted-foreground">No Image Available</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="grow p-6">
                <CardTitle className="mb-2 line-clamp-2 text-xl font-semibold">
                  {post.title || "Untitled Post"}
                </CardTitle>
                <CardDescription className="mb-4 flex items-center text-sm">
                  {post.author?.name && (
                    <span className="mr-4 flex items-center">
                      <UserIcon className="mr-1 h-4 w-4" />
                      {post.author.name}
                    </span>
                  )}
                  {post.publishedAt && (
                    <span className="flex items-center">
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      {formatDate(post.publishedAt)}
                    </span>
                  )}
                </CardDescription>
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.categories?.map((category) => (
                    <Badge key={category._id} variant="secondary">
                      {category.title}
                    </Badge>
                  ))}
                </div>
                <p className="line-clamp-3 text-muted-foreground">
                  {post.excerpt || "No content available"}
                </p>
              </CardContent>
              <CardFooter className="mt-auto p-6 pt-0">
                <Button asChild variant="outline" className="w-full">
                  <Link aria-label={`Read ${post.title ?? "post"}`} href={`/post/${post.slug}`}>
                    Read More
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="flex justify-center">
          <Button asChild variant="outline" className="mt-8">
            <Link href="/post">View All Posts</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

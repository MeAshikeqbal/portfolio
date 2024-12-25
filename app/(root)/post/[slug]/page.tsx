import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'
import { PortableText } from '@portabletext/react'
import Image from 'next/image'
import { PortableTextBlock } from '@portabletext/types'
import { CalendarIcon, TagIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

//export const revalidate = 60

interface Author {
  name: string
  image?: {
    asset: {
      _ref: string
    }
  }
}

interface Post {
  title: string
  slug: {
    current: string
  }
  author?: Author
  mainImage?: {
    asset: {
      _ref: string
    }
    alt?: string
  }
  categories?: {
    title: string
  }[]
  publishedAt?: string
  body?: PortableTextBlock[]
  excerpt?: string
}

async function getPost(slug: string): Promise<Post | null> {
  return await client.fetch(`
    *[_type == "post" && slug.current == $slug][0]{
      title,
      slug,
      author->{
        name,
        image
      },
      mainImage,
      categories[]->{title},
      publishedAt,
      body,
      excerpt
    }
  `, { slug })
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string }> }): Promise<Metadata | undefined> {
  const { slug } = await params;

  if (!slug) {
    return {
      title: 'Post Not Found',
    };
  }

  try {
    const post = await getPost(slug);

    if (!post) {
      return {
        title: 'Post Not Found',
      };
    }

    return {
      title: post.title,
      description: post.excerpt || `Read ${post.title} on my blog`,
      openGraph: {
        title: post.title,
        description: post.excerpt || `Read ${post.title} on my blog`,
        type: 'article',
        url: `https://itsashik.info/post/${post.slug.current}`,
        images: post.mainImage
          ? [
            {
              url: urlFor(post.mainImage.asset._ref).width(1200).height(630).url(),
              width: 1200,
              height: 630,
              alt: post.mainImage.alt || post.title,
            },
          ]
          : [],
      },
    };
  } catch (error) {
    console.error('Failed to fetch post metadata:', error);
    return {
      title: 'Error Loading Post',
    };
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug?: string }> }): Promise<JSX.Element | void> {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  let post: Post | null = null;
  try {
    post = await getPost(slug);
  } catch (error) {
    console.error('Failed to fetch post:', error);
  }

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-full mx-auto">
      <div className="relative w-full h-[30vh] md:h-[40vh] lg:h-[70vh] mb-12">
        {post.mainImage?.asset?._ref && (
          <Image
            src={urlFor(post.mainImage.asset._ref).width(1920).height(1080).url()}
            alt={post.mainImage.alt || post.title}
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-300"
            fill
            quality={50}
            //placeholder='blur'
            //blurDataURL={urlFor(post.mainIm).width(20).height(12).url() || undefined}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center px-4 md:px-8 lg:px-16 max-w-4xl">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <Card className="mb-12 overflow-hidden shadow-lg">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={post.author?.image ? urlFor(post.author.image).width(100).height(100).url() : undefined} alt={post.author?.name} />
                  <AvatarFallback>{post.author?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">{post.author?.name || 'Unknown Author'}</p>
                  {post.publishedAt && (
                    <p className="text-sm text-muted-foreground flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
              {post.categories && post.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  {post.categories.map((category, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {category.title}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="prose prose-lg max-w-none dark:prose-invert mx-auto">
          <PortableText
            value={post.body || []}
            components={{
              block: {
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-primary">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-primary">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-medium mt-4 mb-2 text-primary">{children}</h3>,
                normal: ({ children }) => <p className="mb-4 leading-relaxed text-foreground text-justify">{children}</p>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic my-6 text-lg text-muted-foreground">
                    {children}
                  </blockquote>
                ),
              },
              list: {
                bullet: ({ children }) => <ul className="list-disc pl-6 mb-4 text-foreground">{children}</ul>,
                number: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-foreground">{children}</ol>,
              },
              listItem: {
                bullet: ({ children }) => <li className="mb-2 text-justify">{children}</li>,
                number: ({ children }) => <li className="mb-2 text-justify">{children}</li>,
              },
              marks: {
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-muted text-primary px-1 py-0.5 rounded">{children}</code>,
                link: ({ value, children }) => {
                  const target = (value?.href || '').startsWith('http') ? '_blank' : undefined
                  return (
                    <a
                      href={value?.href}
                      target={target}
                      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                      className="text-blue-600 hover:underline"
                    >
                      {children}
                    </a>
                  )
                },
              },
            }}
          />
        </div>
      </div>
    </article>
  );
}
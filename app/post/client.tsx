'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, UserIcon } from 'lucide-react'
import { Post, Category } from '@/lib/api'

interface AllPostsClientProps {
  initialPosts: Post[]
  categories: Category[]
}

export default function AllPostsClient({ initialPosts, categories }: AllPostsClientProps) {
  const [posts] = useState(initialPosts)
  const [sortBy, setSortBy] = useState('date')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const sortedAndFilteredPosts = useMemo(() => {
    const filteredPosts = selectedCategory
      ? posts.filter(post => post.categories?.some(cat => cat.title === selectedCategory))
      : posts

    return filteredPosts.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime()
      } else if (sortBy === 'author') {
        return (a.author?.name || '').localeCompare(b.author?.name || '')
      } else if (sortBy === 'category') {
        return (a.categories?.[0]?.title || '').localeCompare(b.categories?.[0]?.title || '')
      }
      return 0
    })
  }, [posts, sortBy, selectedCategory])

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-center">All Posts</h1>
        
        <div className="flex flex-wrap items-center justify-between mb-8">
          <div className="flex flex-wrap gap-2 mb-4 md:mb-0">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category._id}
                variant={selectedCategory === category.title ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.title)}
              >
                {category.title}
              </Button>
            ))}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredPosts.map((post) => (
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
                  <p className="text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-2" />
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
                {post.author && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <UserIcon className="w-4 h-4 inline mr-2" />
                    {post.author.name}
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
      </div>
    </div>
  )
}
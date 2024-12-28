'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { urlFor } from '@/sanity/lib/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, UserIcon, FilterIcon } from 'lucide-react'
import { Post, Category } from '@/lib/api'
import { BreadcrumbPost } from '@/components/post-breadcrumb'

interface AllPostsClientProps {
  initialPosts: Post[]
  categories: Category[]
}

export default function AllPostsClient({ initialPosts, categories }: AllPostsClientProps) {
  const [posts] = useState(initialPosts)
  const [sortBy, setSortBy] = useState('date')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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
    <div className="min-h-screen bg-background py-24">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-center">All Posts</h1>
        <div className="mb-8">
          <BreadcrumbPost />
        </div>
        <div className="flex flex-wrap items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="mb-4 md:mb-0"
          >
            <FilterIcon className="mr-2 h-4 w-4" />
            Filter & Sort
          </Button>
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full flex flex-wrap items-center gap-4"
              >
                <div className="flex flex-wrap gap-2">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence>
            {sortedAndFilteredPosts.map((post) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
                          priority={false}
                          placeholder="blur"
                          blurDataURL={urlFor(post.mainImage.asset._ref).width(100).height(100).blur(20).url()}
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
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
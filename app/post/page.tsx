import { getPosts, getCategories } from '@/lib/api'
import AllPostsClient from './client'

export const revalidate = 60

export default async function AllPostsPage() {
  const posts = await getPosts()
  const categories = await getCategories()

  return <AllPostsClient initialPosts={posts} categories={categories} />
}
import { getPosts, getCategories } from '@/lib/api'
import AllPostsClient from './client'

export const revalidate = 60

export const metadata = {
  title: 'Ashik Eqbal - All Blog Posts',
  description: 'All posts from Ashik Eqbal\'s blog.',
};


export default async function AllPostsPage() {
  const posts = await getPosts()
  const categories = await getCategories()

  return <AllPostsClient initialPosts={posts} categories={categories} />
}
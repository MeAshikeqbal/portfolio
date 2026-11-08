import type { Metadata } from "next"
import { getPosts, getCategories } from "@/lib/api"
import AllPostsClient from "./client"

export const metadata: Metadata = {
  title: "All Blog Posts",
  description: "All posts from Ashik Eqbal's blog.",
  alternates: { canonical: "/post" },
}

export default async function AllPostsPage() {
  const [posts, categories] = await Promise.all([getPosts(), getCategories()])

  return <AllPostsClient initialPosts={posts} categories={categories} />
}

import { Skeleton } from "@/components/ui/skeleton"

export default function AllPostsLoading() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <Skeleton className="h-12 w-64 mx-auto mb-8" />        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3 mb-4" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
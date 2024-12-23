import { Skeleton } from "@/components/ui/skeleton"

export default function SinglePostLoading() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        <div className="flex justify-center items-center mb-8">
          <Skeleton className="h-6 w-32 mr-4" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <Skeleton className="h-96 w-full mb-8" />
        
        <div className="max-w-3xl mx-auto">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full mb-4" />
          ))}
          
          <Skeleton className="h-40 w-full my-8" />
          
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full mb-4" />
          ))}
        </div>
        
        <div className="mt-12">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="flex flex-wrap gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1">
                <Skeleton className="h-48 w-full mb-2" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
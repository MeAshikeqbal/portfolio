import { Skeleton } from "@/components/ui/skeleton"

export default function SinglePostLoading() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <Skeleton className="mx-auto mb-4 h-12 w-3/4" />
        <div className="mb-8 flex items-center justify-center">
          <Skeleton className="mr-4 h-6 w-32" />
          <Skeleton className="h-6 w-32" />
        </div>

        <Skeleton className="mb-8 h-96 w-full" />

        <div className="mx-auto max-w-3xl">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="mb-4 h-6 w-full" />
          ))}

          <Skeleton className="my-8 h-40 w-full" />

          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="mb-4 h-6 w-full" />
          ))}
        </div>

        <div className="mt-12">
          <Skeleton className="mb-4 h-8 w-48" />
          <div className="flex flex-wrap gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1">
                <Skeleton className="mb-2 h-48 w-full" />
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

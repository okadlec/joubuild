import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-44" />
      </div>

      {/* Organization settings card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="p-6 space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-9 w-24" />
          </div>
          {/* Name */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Slug */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Plan */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          {/* Save button */}
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Members card */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-6 pb-0">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="p-6 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

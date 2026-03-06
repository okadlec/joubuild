import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* General settings card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="p-6 space-y-4">
          {/* Cover image */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-40 rounded-lg" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          {/* Name */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-20 w-full" />
          </div>
          {/* Address */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Status */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Save button */}
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Members card */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-6 pb-0">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="p-6">
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Personal info card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-9 w-32" />
          </div>
          {/* Email */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Name */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Organization */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          {/* Save button */}
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Change password card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Language card */}
      <div className="rounded-lg border">
        <div className="p-6 pb-0">
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="p-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

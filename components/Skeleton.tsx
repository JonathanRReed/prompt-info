'use client';

type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
};

export default function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-rose-highlightMed';

  const variantClasses = {
    text: 'h-4',
    rectangular: '',
    circular: '',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function ModelSelectSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border border-rose-highlightMed bg-rose-base px-5 py-6">
      <Skeleton className="mb-4 h-3 w-20" variant="text" />
      <Skeleton className="mb-2 h-10 w-24" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function CostCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 border border-rose-highlightMed bg-rose-base px-4 py-3.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" variant="text" />
        <Skeleton className="h-5 w-10" />
      </div>
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

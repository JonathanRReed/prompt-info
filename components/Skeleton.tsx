'use client';

type SkeletonProps = {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
};

export default function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-rose-highlightMed/50';
  
  const variantClasses = {
    text: 'rounded h-4',
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading..."
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
    <div className="rounded-2xl border border-rose-highlightMed/50 bg-black/40 backdrop-blur-xl px-5 py-6">
      <Skeleton className="h-3 w-20 mb-4" variant="text" />
      <Skeleton className="h-10 w-24 mb-2" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function CostCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-rose-highlightMed bg-black/40 backdrop-blur-lg px-4 py-3.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" variant="text" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

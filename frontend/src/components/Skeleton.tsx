interface Props {
  className?: string
  rows?: number
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-xl ${className}`} />
}

export default function Skeleton({ rows = 3 }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          <SkeletonBlock className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  const gridClass = gridColsClass[cols] || 'grid-cols-6'
  
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-6">
          <div className="space-y-3">
            {/* Table header */}
            <div className={`grid ${gridClass} gap-4 pb-3 border-b`}>
              {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            {/* Table rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className={`grid ${gridClass} gap-4 py-3 border-b last:border-0`}>
                {Array.from({ length: cols }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


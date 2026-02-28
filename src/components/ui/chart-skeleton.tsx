import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  height?: string;
  isMobile?: boolean;
  showLegend?: boolean;
}

export function ChartSkeleton({ height = "h-80", isMobile = false, showLegend = false }: ChartSkeletonProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md bg-secondary" />
            <Skeleton className={`h-5 ${isMobile ? 'w-32' : 'w-48'} bg-secondary`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
        <div className={`w-full ${height} flex flex-col justify-end gap-2 p-4`}>
          {/* Имитация осей графика */}
          <div className="flex items-end gap-1 h-full">
            {Array.from({ length: isMobile ? 7 : 14 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <Skeleton
                  className="w-full bg-secondary"
                  style={{ height: `${Math.random() * 60 + 40}%` }}
                />
              </div>
            ))}
          </div>
          {/* Имитация оси X */}
          <div className="flex gap-1">
            {Array.from({ length: isMobile ? 7 : 14 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 h-3 bg-secondary" />
            ))}
          </div>
          {showLegend && (
            <div className="flex gap-4 justify-center mt-2">
              <Skeleton className="h-4 w-20 bg-secondary" />
              <Skeleton className="h-4 w-20 bg-secondary" />
              <Skeleton className="h-4 w-20 bg-secondary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function HeatmapSkeleton({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md bg-secondary" />
            <Skeleton className={`h-5 ${isMobile ? 'w-32' : 'w-48'} bg-secondary`} />
          </div>
          <Skeleton className={`h-4 ${isMobile ? 'w-12' : 'w-24'} bg-secondary`} />
        </div>
      </CardHeader>
      <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
        <div className="space-y-3">
          {/* Заголовок с часами */}
          <div className="flex items-center">
            <div className={`${isMobile ? 'w-8' : 'w-12'} shrink-0`}></div>
            <div className="flex-1 flex gap-0.5">
              {Array.from({ length: 24 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-3 bg-secondary" />
              ))}
            </div>
          </div>
          {/* Строки тепловой карты */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className={`${isMobile ? 'w-8 h-4' : 'w-12 h-5'} shrink-0 bg-secondary mr-2`} />
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 24 }).map((_, j) => (
                  <Skeleton key={j} className="flex-1 h-6 bg-secondary" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

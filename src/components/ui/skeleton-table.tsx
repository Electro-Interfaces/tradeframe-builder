import { Skeleton } from "./skeleton";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = ({ rows = 4, columns = 5 }: SkeletonTableProps) => {
  return (
    <div className="panel table-condensed overflow-auto scroll-thin">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="h-11 px-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-slate-800 h-[44px]">
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="px-3">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
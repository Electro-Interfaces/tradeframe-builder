/**
 * Компонент вертикального индикатора уровня топлива в резервуаре
 */

interface TankProgressIndicatorProps {
  percentage: number;
  minLevel: number;
  criticalLevel: number;
  isMobile: boolean;
}

export function TankProgressIndicator({
  percentage,
  minLevel,
  criticalLevel,
  isMobile
}: TankProgressIndicatorProps) {
  const height = isMobile ? 120 : 160;
  const width = 80;

  const getColor = () => {
    if (percentage <= 10) return '#ef4444'; // red-500 - критический уровень (10% или менее)
    if (percentage <= 30) return '#d97706'; // amber-600 - предупреждение (30% или менее)
    return '#22c55e'; // green-500 - нормальный уровень (более 30%)
  };

  const fillHeight = (percentage / 100) * height;

  return (
    <div
      style={{ height: `${height}px`, width: `${width}px` }}
      className="relative bg-secondary rounded-lg border border-border overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className="absolute bottom-0 w-full transition-all duration-500 ease-in-out"
        style={{
          height: `${fillHeight}px`,
          background: `linear-gradient(to top, ${getColor()}, ${getColor()}88)`
        }}
      />

      {/* Critical level indicator */}
      <div
        className="absolute w-full h-0.5 bg-red-500/50"
        style={{ bottom: `${(criticalLevel / 100) * height}px` }}
      />

      {/* Min level indicator */}
      <div
        className="absolute w-full h-0.5 bg-amber-500/50"
        style={{ bottom: `${(minLevel / 100) * height}px` }}
      />

      {/* Percentage text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-foreground text-xs font-bold drop-shadow-lg">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

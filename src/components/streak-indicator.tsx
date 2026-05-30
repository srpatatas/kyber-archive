export function StreakIndicator({ streak, compact }: { streak: number; compact?: boolean }) {
  if (Math.abs(streak) <= 1) {
    return <span className="text-xs text-muted">{compact ? "No streak" : "No active streak"}</span>;
  }

  if (streak > 0) {
    return (
      <span className="text-xs font-medium text-emerald-400">
        {streak} wins in a row
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-red-400">
      {Math.abs(streak)} losses in a row
    </span>
  );
}

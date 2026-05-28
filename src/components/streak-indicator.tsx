export function StreakIndicator({ streak }: { streak: number }) {
  if (streak === 0) {
    return <span className="text-muted text-sm">-</span>;
  }

  if (streak > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-medium text-emerald-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
        </svg>
        W{streak}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-crimson-light">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
      </svg>
      L{Math.abs(streak)}
    </span>
  );
}

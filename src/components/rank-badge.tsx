export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold font-bold text-sm ring-2 ring-gold/40">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand/15 text-sand-light font-bold text-sm ring-2 ring-sand/30">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-800/20 text-amber-600 font-bold text-sm ring-2 ring-amber-700/30">
        3
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center text-muted font-medium text-sm">
      {rank}
    </div>
  );
}

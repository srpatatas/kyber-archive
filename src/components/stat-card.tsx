export function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gold">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-muted">{subtext}</p>}
    </div>
  );
}

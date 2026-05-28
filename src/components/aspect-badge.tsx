import { Aspect } from "@/lib/types";
import { aspectColors } from "@/lib/data";

export function AspectBadge({ aspect }: { aspect: Aspect }) {
  const color = aspectColors[aspect];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {aspect}
    </span>
  );
}

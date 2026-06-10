import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-xs text-muted">
            <p>Created and maintained by <Link href="/player/NT_srpatatas" className="text-sand-light hover:underline">NT_srpatatas</Link></p>
            <p className="mt-1">A fan project. Not affiliated with Fantasy Flight Games or Lucasfilm Ltd.</p>
          </div>
          <p className="text-xs text-muted">
            Star Wars: Unlimited is a trademark of Lucasfilm Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
}

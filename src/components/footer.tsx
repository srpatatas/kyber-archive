import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2 text-xs text-muted">
          <p>Created and maintained by <Link href="/player/NT_srpatatas" className="text-sand-light hover:underline">NT_srpatatas</Link></p>
          <p>
            The Kyber Archive is in no way affiliated with Disney or Fantasy Flight Games.
            Star Wars characters, cards, logos, and art are property of Disney and/or Fantasy Flight Games.
          </p>
        </div>
      </div>
    </footer>
  );
}

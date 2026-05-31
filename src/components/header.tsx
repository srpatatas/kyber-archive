import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gold/20 glow-pulse" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="relative h-6 w-6 text-gold"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground group-hover:text-gold transition-colors">
              The Midichlorian Index
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
              Star Wars Unlimited Rankings
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="/" className="text-sm font-medium text-muted hover:text-gold transition-colors">
            Leaderboard
          </Link>
          <Link href="/tournaments" className="text-sm font-medium text-muted hover:text-gold transition-colors">
            Tournaments
          </Link>
          <Link href="/about" className="text-sm font-medium text-muted hover:text-gold transition-colors">
            About
          </Link>
          {process.env.NODE_ENV === "development" && (
            <Link href="/admin" className="text-sm font-medium text-muted hover:text-gold transition-colors">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gold/20 glow-pulse" />
            <svg viewBox="0 0 32 44" className="relative h-8 w-6">
              <line x1="16" y1="2" x2="16" y2="0" stroke="#d4a017" strokeWidth="1" opacity="0.5" className="glow-pulse" />
              <line x1="24" y1="8" x2="27" y2="5" stroke="#d4a017" strokeWidth="0.8" opacity="0.4" className="glow-pulse" />
              <line x1="8" y1="8" x2="5" y2="5" stroke="#d4a017" strokeWidth="0.8" opacity="0.4" className="glow-pulse" />
              <line x1="26" y1="16" x2="29" y2="16" stroke="#d4a017" strokeWidth="0.8" opacity="0.3" className="glow-pulse" />
              <line x1="6" y1="16" x2="3" y2="16" stroke="#d4a017" strokeWidth="0.8" opacity="0.3" className="glow-pulse" />
              <g transform="translate(6, 6)">
                <path d="M10 0L17 8V20L10 32L3 20V8L10 0Z" fill="#d4a017" opacity="0.9" />
                <path d="M10 0L17 8V20L10 32V16L14 10V9L10 3V0Z" fill="white" opacity="0.15" />
                <path d="M10 0L17 8V20L10 32L3 20V8L10 0Z" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
              </g>
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

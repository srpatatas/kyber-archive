export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted">
            The Kyber Archive is a fan project. Not affiliated with Fantasy Flight Games or Lucasfilm Ltd.
          </p>
          <p className="text-xs text-muted">
            Star Wars: Unlimited is a trademark of Lucasfilm Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
}

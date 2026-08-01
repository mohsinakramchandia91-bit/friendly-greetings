import { Link } from "@tanstack/react-router";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-card/60 px-5 py-4 backdrop-blur-xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/dashboard" className="truncate text-sm font-semibold tracking-tight">
          ProposaLite
        </Link>
        <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          No login
        </span>
      </div>
    </header>
  );
}

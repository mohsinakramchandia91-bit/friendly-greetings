import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-card/60 px-5 py-3 backdrop-blur-xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          <span className="truncate text-sm font-semibold tracking-tight">ProposaLite</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground xs:inline">
            no-login
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

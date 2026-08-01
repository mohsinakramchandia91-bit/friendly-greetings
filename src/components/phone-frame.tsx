import type { ReactNode } from "react";

/**
 * Locks the whole interface into a strict 9:16 vertical canvas, centered on
 * any viewport. Content scrolls inside the frame, never the page.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-secondary">
      <div
        className="relative h-full max-h-[100dvh] w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-background shadow-lifted sm:h-auto sm:rounded-[2rem] sm:border sm:border-border/70"
        style={{ aspectRatio: "9 / 16" }}
      >
        <div className="h-full w-full overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

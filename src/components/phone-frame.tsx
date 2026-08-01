import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Locks the whole interface into a strict 9:16 vertical canvas, centered on
 * any viewport. Content scrolls inside the frame, never the page.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mesh-backdrop flex h-[100dvh] w-full items-center justify-center overflow-hidden p-0 sm:p-6">
      <div
        className="glass-frame relative h-full max-h-[100dvh] w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden sm:h-auto sm:rounded-[2.25rem]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-card/60 to-transparent"
        />
        <div className="h-full w-full overflow-y-auto overscroll-contain">
          <div key={pathname} className="route-enter min-h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

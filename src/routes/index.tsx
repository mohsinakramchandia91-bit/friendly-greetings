import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProposaLite — Proposals signed in minutes, no login" },
      {
        name: "description",
        content:
          "A minimalist proposal builder and e-signature tool for freelancers. No account: draft instantly, share a private link, get signed.",
      },
      { property: "og:title", content: "ProposaLite — No-login proposals & e-signatures" },
      {
        property: "og:description",
        content: "Draft instantly on this device, share a private link, collect a signature.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  { title: "Draft", body: "Write scope and a pricing table that totals itself. Stays on device." },
  { title: "Share", body: "One private link publishes it. No sign-up on either side." },
  { title: "Sign", body: "Your client signs on any device and you get the signed PDF." },
];

function Index() {
  return (
    <div className="flex min-h-full flex-col bg-background px-5 pb-8 pt-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <span className="truncate text-sm font-semibold tracking-tight">ProposaLite</span>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link to="/dashboard">My proposals</Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          No account. No friction.
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.05]">
          Proposals that look expensive and get signed fast.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Start drafting the second you open the app. Everything stays on this device until you
          share the link.
        </p>
        <div className="mt-7 space-y-3">
          <Button size="xl" className="w-full" asChild>
            <Link to="/editor/$id" params={{ id: "new" }}>
              Start a proposal
            </Link>
          </Button>
          <Button size="xl" variant="outline" className="w-full" asChild>
            <Link to="/dashboard">View my proposals</Link>
          </Button>
        </div>

        <section className="mt-10 space-y-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="surface-card rounded-2xl border-border/70">
              <CardContent className="py-5">
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

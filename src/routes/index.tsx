import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { newLocalDraft, saveLocalDraft } from "@/lib/local-drafts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProposaLite — Proposals signed in minutes, no login" },
      {
        name: "description",
        content:
          "A minimalist proposal builder and e-signature tool for freelancers. No account: draft instantly, share a private link, get signed.",
      },
      { property: "og:title", content: "ProposaLite — Proposals signed in minutes, no login" },
      {
        property: "og:description",
        content: "A minimalist proposal builder and e-signature tool for freelancers. No account: draft instantly, share a private link, get signed.",
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
  const navigate = useNavigate();

  function startProposal() {
    const fresh = newLocalDraft(crypto.randomUUID());
    saveLocalDraft(fresh);
    navigate({ to: "/editor/$id", params: { id: fresh.id } });
  }

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          <span className="truncate text-sm font-semibold tracking-tight">ProposaLite</span>
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">My proposals</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <p className="inline-flex w-fit items-center rounded-full border border-border/70 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          no account · no friction
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.05]">
          Proposals that look expensive and get signed fast.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Start drafting the second you open the app. Everything stays on this device until you
          share the link.
        </p>
        <div className="mt-7 space-y-3">
          <Button size="xl" className="w-full" onClick={startProposal}>
            Start a proposal
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

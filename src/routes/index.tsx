import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProposaLite — Proposals signed in minutes" },
      {
        name: "description",
        content:
          "A minimalist proposal builder and e-signature tool for freelancers. Draft, share a private link, get signed.",
      },
      { property: "og:title", content: "ProposaLite — Proposals signed in minutes" },
      {
        property: "og:description",
        content: "Draft a proposal, share a private link, collect a signature. Free to run.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  { title: "Draft", body: "Write the overview, scope and a pricing table that totals itself." },
  { title: "Share", body: "Send a private link. No client account, no login, no friction." },
  { title: "Sign", body: "Your client signs on any device and you get the signed PDF." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5">
        <span className="text-sm font-semibold tracking-tight">ProposaLite</span>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5">
        <section className="py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            For freelancers
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Proposals that look expensive and get signed fast.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Write it, send one private link, and collect a real signature — without invoicing
            software, PDFs by email, or a monthly bill.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="xl" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link to="/auth">I have an account</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="surface-card rounded-2xl border-border/70">
              <CardContent className="py-7">
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

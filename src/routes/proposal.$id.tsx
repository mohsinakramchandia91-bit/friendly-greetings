import { createFileRoute, notFound } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getPublicProposal, signPublicProposal } from "@/lib/public-proposal.functions";
import { buildProposalPdf } from "@/lib/pdf";
import { formatCurrency, totalOf } from "@/lib/proposal-types";

const SignaturePad = lazy(() => import("@/components/signature-pad"));

export const Route = createFileRoute("/proposal/$id")({
  loader: async ({ params }) => {
    const proposal = await getPublicProposal({ data: { id: params.id } }).catch(() => null);
    if (!proposal) throw notFound();
    return { proposal };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Proposal unavailable" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.proposal.project_title || "Proposal"} — ProposaLite`;
    const description = `A proposal prepared for ${loaderData.proposal.client_name || "you"}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: ProposalMissing,
  errorComponent: ProposalMissing,
  component: PublicProposalPage,
});

function ProposalMissing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">This proposal isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may have expired or been withdrawn. Ask the sender for a fresh link.
        </p>
      </div>
    </main>
  );
}

function PublicProposalPage() {
  const { proposal } = Route.useLoaderData();
  const router = Route.useRouter();
  const [signature, setSignature] = useState<string | null>(proposal.signature_data);
  const signed = proposal.status === "signed" || !!signature;
  const content = proposal.content_json;
  const total = content.items.length ? totalOf(content.items) : proposal.amount;

  async function handleSign(dataUrl: string) {
    try {
      await signPublicProposal({ data: { id: proposal.id, signature: dataUrl } });
      setSignature(dataUrl);
      toast.success("Signed — thank you!");
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your signature");
    }
  }

  async function downloadPdf() {
    const doc = await buildProposalPdf({
      clientName: proposal.client_name,
      projectTitle: proposal.project_title,
      content,
      from: proposal.freelancer_email,
      signature,
    });
    doc.save(`${proposal.project_title || "proposal"}.pdf`);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Proposal
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          {proposal.project_title || "Untitled proposal"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Prepared for {proposal.client_name || "you"}
          {proposal.freelancer_email ? ` · from ${proposal.freelancer_email}` : ""}
        </p>

        <Card className="surface-card mt-8 rounded-2xl border-border/70">
          <CardContent className="space-y-7 py-7">
            {content.intro ? <Section title="Overview" body={content.intro} /> : null}
            {content.scope ? <Section title="Scope of work" body={content.scope} /> : null}

            {content.items.length ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Investment
                </h2>
                <ul className="mt-3 space-y-3">
                  {content.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{item.item || "Item"}</p>
                        {item.description ? (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        ) : null}
                      </div>
                      <span className="tabular-nums font-medium">{formatCurrency(item.cost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>

            {content.terms ? <Section title="Terms" body={content.terms} /> : null}
          </CardContent>
        </Card>

        <Card className="surface-card mt-6 rounded-2xl border-border/70">
          <CardContent className="py-7">
            {signed ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="size-5" />
                  <p className="font-medium">Signed and accepted</p>
                </div>
                {signature ? (
                  <img
                    src={signature}
                    alt="Client signature"
                    className="h-24 rounded-xl border border-border bg-card p-2"
                  />
                ) : null}
                <Separator />
                <Button variant="outline" onClick={downloadPdf}>
                  <Download /> Download signed PDF
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Sign to accept</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Draw your signature below. Signing accepts the scope and total above.
                  </p>
                </div>
                <ClientOnly fallback={<Skeleton className="h-44 w-full rounded-xl" />}>
                  <Suspense fallback={<Skeleton className="h-44 w-full rounded-xl" />}>
                    <SignaturePad onSign={handleSign} />
                  </Suspense>
                </ClientOnly>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">Powered by ProposaLite</p>
      </div>
    </main>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  );
}
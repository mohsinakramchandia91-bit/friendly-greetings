import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Link2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buildProposalPdf } from "@/lib/pdf";
import {
  emptyContent,
  formatCurrency,
  normalizeContent,
  totalOf,
  type LineItem,
  type ProposalContent,
  type ProposalStatus,
} from "@/lib/proposal-types";

type Draft = {
  clientName: string;
  projectTitle: string;
  content: ProposalContent;
};

const newDraft = (): Draft => ({ clientName: "", projectTitle: "", content: emptyContent() });
const storageKey = (id: string) => `proposalite:draft:${id}`;

export const Route = createFileRoute("/_authenticated/editor/$id")({
  head: () => ({
    meta: [
      { title: "Proposal editor — ProposaLite" },
      { name: "description", content: "Draft your proposal content, pricing table and terms." },
      { property: "og:title", content: "Proposal editor — ProposaLite" },
      { property: "og:description", content: "Compose and finalize a client proposal." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";

  const [draft, setDraft] = useState<Draft>(newDraft);
  const [status, setStatus] = useState<ProposalStatus>("draft");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  const { data: existing, isLoading } = useQuery({
    enabled: !isNew,
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, client_name, project_title, content_json, amount, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Hydrate from the database (or a local unsaved draft) exactly once.
  useEffect(() => {
    if (hydrated.current) return;
    if (!isNew && isLoading) return;
    const base: Draft = existing
      ? {
          clientName: existing.client_name,
          projectTitle: existing.project_title,
          content: normalizeContent(existing.content_json),
        }
      : newDraft();
    if (existing) setStatus(existing.status as ProposalStatus);

    if (typeof window !== "undefined") {
      const cached = window.localStorage.getItem(storageKey(id));
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Draft;
          setDraft({
            clientName: parsed.clientName ?? base.clientName,
            projectTitle: parsed.projectTitle ?? base.projectTitle,
            content: normalizeContent(parsed.content),
          });
          hydrated.current = true;
          return;
        } catch {
          /* fall through to db copy */
        }
      }
    }
    setDraft(base);
    hydrated.current = true;
  }, [existing, id, isLoading, isNew]);

  // Debounced local autosave — zero database writes while typing.
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey(id), JSON.stringify(draft));
      setSavedAt(new Date().toLocaleTimeString());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, id]);

  const total = useMemo(() => totalOf(draft.content.items), [draft.content.items]);

  const patchContent = useCallback(
    (patch: Partial<ProposalContent>) =>
      setDraft((prev) => ({ ...prev, content: { ...prev.content, ...patch } })),
    [],
  );

  function updateItem(itemId: string, patch: Partial<LineItem>) {
    patchContent({
      items: draft.content.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    });
  }

  function addItem() {
    patchContent({
      items: [
        ...draft.content.items,
        { id: crypto.randomUUID(), item: "", description: "", cost: 0 },
      ],
    });
  }

  async function persist(nextStatus?: ProposalStatus) {
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        client_name: draft.clientName,
        project_title: draft.projectTitle,
        content_json: draft.content,
        amount: total,
        ...(nextStatus ? { status: nextStatus } : {}),
      };

      let savedId = id;
      if (isNew) {
        const { data, error } = await supabase
          .from("proposals")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        savedId = data.id;
      } else {
        const { error } = await supabase.from("proposals").update(payload).eq("id", id);
        if (error) throw error;
      }

      window.localStorage.removeItem(storageKey(id));
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      if (nextStatus) setStatus(nextStatus);

      if (nextStatus === "sent") {
        await navigator.clipboard
          .writeText(`${window.location.origin}/proposal/${savedId}`)
          .catch(() => undefined);
        toast.success("Proposal sent — client link copied to your clipboard");
      } else {
        toast.success("Saved to your account");
      }

      if (isNew) navigate({ to: "/editor/$id", params: { id: savedId }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function previewPdf() {
    const doc = await buildProposalPdf({
      clientName: draft.clientName,
      projectTitle: draft.projectTitle,
      content: draft.content,
      from: user.email,
    });
    doc.save(`${draft.projectTitle || "proposal"}.pdf`);
  }

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader email={user.email} />
        <main className="mx-auto w-full max-w-3xl space-y-4 px-5 py-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft /> Dashboard
          </Button>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={status}>
              {status === "draft" ? "Draft" : status === "sent" ? "Sent" : "Signed"}
            </Badge>
            {savedAt ? <span>Autosaved locally at {savedAt}</span> : null}
          </div>
        </div>

        <Card className="surface-card mt-6 rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Proposal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client">Client name</Label>
                <Input
                  id="client"
                  value={draft.clientName}
                  onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                  placeholder="Northwind Studio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Project title</Label>
                <Input
                  id="title"
                  value={draft.projectTitle}
                  onChange={(e) => setDraft({ ...draft, projectTitle: e.target.value })}
                  placeholder="Brand identity system"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intro">Overview</Label>
              <Textarea
                id="intro"
                rows={3}
                value={draft.content.intro}
                onChange={(e) => patchContent({ intro: e.target.value })}
                placeholder="A short note on why you're the right fit."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Scope of work</Label>
              <Textarea
                id="scope"
                rows={5}
                value={draft.content.scope}
                onChange={(e) => patchContent({ scope: e.target.value })}
                placeholder="Deliverables, milestones and timeline."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card mt-6 rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pricing</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus /> Add line item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.content.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No line items yet. Add one to build your pricing table.
              </p>
            ) : (
              draft.content.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-[1fr_1.4fr_auto_auto]"
                >
                  <Input
                    aria-label="Item"
                    value={item.item}
                    onChange={(e) => updateItem(item.id, { item: e.target.value })}
                    placeholder="Item"
                  />
                  <Input
                    aria-label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Description"
                  />
                  <Input
                    aria-label="Cost"
                    type="number"
                    min={0}
                    step="0.01"
                    className="sm:w-32"
                    value={item.cost}
                    onChange={(e) => updateItem(item.id, { cost: Number(e.target.value) || 0 })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove line item"
                    onClick={() =>
                      patchContent({
                        items: draft.content.items.filter((entry) => entry.id !== item.id),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card mt-6 rounded-2xl border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              aria-label="Terms"
              value={draft.content.terms}
              onChange={(e) => patchContent({ terms: e.target.value })}
            />
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={previewPdf}>
            <Download /> Preview proposal
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => persist()}>
            Save &amp; finalize
          </Button>
          <Button disabled={saving} onClick={() => persist("sent")}>
            <Link2 /> {status === "draft" ? "Send & copy link" : "Update & copy link"}
          </Button>
        </div>
      </main>
    </div>
  );
}
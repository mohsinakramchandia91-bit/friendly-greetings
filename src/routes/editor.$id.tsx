import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Link2, Plus, Trash2 } from "lucide-react";
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
import { getDeviceToken } from "@/lib/device";
import {
  getLocalDraft,
  newLocalDraft,
  removeLocalDraft,
  saveLocalDraft,
  type LocalDraft,
} from "@/lib/local-drafts";
import { getMyProposal, publishProposal } from "@/lib/proposals.functions";
import {
  formatCurrency,
  totalOf,
  type LineItem,
  type ProposalContent,
  type ProposalStatus,
} from "@/lib/proposal-types";

export const Route = createFileRoute("/editor/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Proposal editor — ProposaLite" },
      { name: "description", content: "Draft your proposal content, pricing table and terms." },
      { property: "og:title", content: "Proposal editor — ProposaLite" },
      { property: "og:description", content: "Compose and publish a client proposal." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRemote = useServerFn(getMyProposal);
  const publish = useServerFn(publishProposal);

  const [token, setToken] = useState("");
  const [docId, setDocId] = useState(() => (id === "new" ? "" : id));
  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [status, setStatus] = useState<ProposalStatus>("draft");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    setToken(getDeviceToken());
    if (id === "new") {
      const fresh = newLocalDraft(crypto.randomUUID());
      // Persist immediately so the editor can rehydrate after the redirect.
      saveLocalDraft(fresh);
      setDocId(fresh.id);
      setDraft(fresh);
      hydrated.current = true;
      navigate({ to: "/editor/$id", params: { id: fresh.id }, replace: true });
      return;
    }
    const local = getLocalDraft(id);
    if (local) {
      setDraft(local);
      setDocId(local.id);
      hydrated.current = true;
    }
  }, [id, navigate]);

  const needsRemote = id !== "new" && !hydrated.current;

  const { data: remote, isLoading } = useQuery({
    enabled: !!token && needsRemote,
    queryKey: ["proposal", id, token],
    queryFn: () => fetchRemote({ data: { token, id } }),
  });

  useEffect(() => {
    if (hydrated.current || !remote) return;
    setDraft({
      id: remote.id,
      clientName: remote.client_name,
      projectTitle: remote.project_title,
      content: remote.content_json,
      updatedAt: remote.created_at,
    });
    setStatus(remote.status);
    hydrated.current = true;
  }, [remote]);

  // Debounced local autosave — zero database writes while typing.
  useEffect(() => {
    if (!draft || !hydrated.current || status !== "draft") return;
    const timer = window.setTimeout(() => {
      saveLocalDraft(draft);
      setSavedAt(new Date().toLocaleTimeString());
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, status]);

  const total = useMemo(() => (draft ? totalOf(draft.content.items) : 0), [draft]);

  const patchContent = useCallback(
    (patch: Partial<ProposalContent>) =>
      setDraft((prev) => (prev ? { ...prev, content: { ...prev.content, ...patch } } : prev)),
    [],
  );

  function updateItem(itemId: string, patch: Partial<LineItem>) {
    if (!draft) return;
    patchContent({
      items: draft.content.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  }

  function addItem() {
    if (!draft) return;
    patchContent({
      items: [
        ...draft.content.items,
        { id: crypto.randomUUID(), item: "", description: "", cost: 0 },
      ],
    });
  }

  async function sendAndCopy() {
    if (!draft) return;
    setSaving(true);
    try {
      const target = docId || draft.id;
      await publish({
        data: {
          token,
          id: target,
          clientName: draft.clientName,
          projectTitle: draft.projectTitle,
          content: draft.content,
          amount: total,
        },
      });
      removeLocalDraft(target);
      setStatus("sent");
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      await navigator.clipboard
        .writeText(`${window.location.origin}/proposal/${target}`)
        .catch(() => undefined);
      toast.success("Sent — client link copied to your clipboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send");
    } finally {
      setSaving(false);
    }
  }

  async function previewPdf() {
    if (!draft) return;
    const doc = await buildProposalPdf({
      clientName: draft.clientName,
      projectTitle: draft.projectTitle,
      content: draft.content,
    });
    doc.save(`${draft.projectTitle || "proposal"}.pdf`);
  }

  if (!draft) {
    return (
      <div className="min-h-full">
        <AppHeader />
        <main className="space-y-4 px-5 py-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          {!isLoading && needsRemote ? (
            <p className="text-sm text-muted-foreground">
              This proposal isn't stored on this device.
            </p>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-6">
      <AppHeader />
      <main className="px-5 py-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex min-w-0 items-center justify-end gap-2 text-xs text-muted-foreground">
            <Badge variant={status}>
              {status === "draft" ? "Draft" : status === "sent" ? "Sent" : "Signed"}
            </Badge>
            {savedAt ? <span className="truncate">Saved locally {savedAt}</span> : null}
          </div>
        </div>

        <Card className="surface-card mt-5 rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Proposal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <Card className="surface-card mt-5 rounded-2xl border-border/70">
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 space-y-0 pb-3">
            <CardTitle className="truncate text-base">Pricing</CardTitle>
            <Button variant="outline" size="sm" className="shrink-0" onClick={addItem}>
              <Plus /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft.content.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No line items yet.
              </p>
            ) : (
              draft.content.items.map((item) => (
                <div key={item.id} className="space-y-2 rounded-xl border border-border/70 p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Input
                      aria-label="Item"
                      value={item.item}
                      onChange={(e) => updateItem(item.id, { item: e.target.value })}
                      placeholder="Item"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
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
                    value={item.cost}
                    onChange={(e) => updateItem(item.id, { cost: Number(e.target.value) || 0 })}
                  />
                </div>
              ))
            )}
            <Separator />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="shrink-0 numeric text-2xl font-semibold">
                {formatCurrency(total)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card mt-5 rounded-2xl border-border/70">
          <CardHeader className="pb-3">
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

        <div className="mt-6 space-y-3">
          <Button variant="outline" className="w-full" onClick={previewPdf}>
            <Download /> Preview proposal
          </Button>
          <Button className="w-full" disabled={saving || status === "signed"} onClick={sendAndCopy}>
            <Link2 /> {status === "draft" ? "Send & copy link" : "Update & copy link"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Nothing is stored online until you send.
          </p>
        </div>
      </main>
    </div>
  );
}

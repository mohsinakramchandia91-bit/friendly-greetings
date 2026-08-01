import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, totalOf, type ProposalStatus } from "@/lib/proposal-types";
import { getDeviceToken } from "@/lib/device";
import { listLocalDrafts, removeLocalDraft } from "@/lib/local-drafts";
import { deleteMyProposal, listMyProposals } from "@/lib/proposals.functions";

type Row = {
  id: string;
  client: string;
  title: string;
  amount: number;
  status: ProposalStatus;
  date: string;
  local: boolean;
};

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your proposals — ProposaLite" },
      {
        name: "description",
        content: "Drafts stay on this device; sent proposals are tracked by their private link.",
      },
      { property: "og:title", content: "Your proposals — ProposaLite" },
      { property: "og:description", content: "Drafts, pipeline and signed revenue at a glance." },
    ],
  }),
  component: Dashboard,
});

const statusLabel: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
};

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listMyProposals);
  const deleteFn = useServerFn(deleteMyProposal);
  const [token, setToken] = useState("");
  const [drafts, setDrafts] = useState(() => listLocalDrafts());
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  useEffect(() => {
    setToken(getDeviceToken());
    setDrafts(listLocalDrafts());
  }, []);

  const { data, isLoading } = useQuery({
    enabled: !!token,
    queryKey: ["proposals", token],
    queryFn: () => listFn({ data: { token } }),
  });

  const remote: Row[] = (data ?? []).map((row) => ({
    id: row.id,
    client: row.client_name,
    title: row.project_title,
    amount: row.amount,
    status: row.status,
    date: row.created_at,
    local: false,
  }));

  const localRows: Row[] = drafts.map((draft) => ({
    id: draft.id,
    client: draft.clientName,
    title: draft.projectTitle,
    amount: totalOf(draft.content.items),
    status: "draft",
    date: draft.updatedAt,
    local: true,
  }));

  const rows = [...localRows, ...remote];
  const sent = remote.length;
  const pending = remote.filter((r) => r.status === "sent").reduce((s, r) => s + r.amount, 0);
  const closed = remote.filter((r) => r.status === "signed").reduce((s, r) => s + r.amount, 0);

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.local) {
      removeLocalDraft(target.id);
      setDrafts(listLocalDrafts());
      toast.success("Draft removed from this device");
      return;
    }
    try {
      await deleteFn({ data: { token, id: target.id } });
      toast.success("Proposal deleted");
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${id}`);
    toast.success("Client link copied");
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="flex-1 px-5 py-6">
        <h1 className="text-2xl font-semibold">Proposals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drafts live only on this device. Sending publishes the private client link.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="Sent" value={String(sent)} loading={isLoading} />
          <Metric label="Pending" value={formatCurrency(pending)} loading={isLoading} />
          <Metric
            label="Closed"
            value={formatCurrency(closed)}
            loading={isLoading}
            accent
            className="col-span-2"
          />
        </div>

        <div className="mt-6 space-y-3">
          {isLoading && rows.length === 0 ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          ) : rows.length === 0 ? (
            <Card className="surface-card rounded-2xl border-border/70">
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No proposals yet</p>
                <p className="max-w-[16rem] text-sm text-muted-foreground">
                  Start drafting instantly — no account needed.
                </p>
              </CardContent>
            </Card>
          ) : (
            rows.map((row) => (
              <Card key={row.id} className="surface-card rounded-2xl border-border/70">
                <CardContent className="py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/editor/$id"
                        params={{ id: row.id }}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {row.title || "Untitled proposal"}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {row.client || "No client yet"}
                      </p>
                    </div>
                    <Badge variant={row.status} className="shrink-0">
                      {statusLabel[row.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="numeric text-lg font-semibold">
                        {formatCurrency(row.amount)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(row.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!row.local ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Copy client link"
                          onClick={() => copyLink(row.id)}
                        >
                          <Copy />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete proposal"
                        onClick={() => setPendingDelete(row)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <div className="pointer-events-none sticky bottom-0 z-10 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-8">
        <Button
          size="lg"
          className="pointer-events-auto w-full"
          onClick={() => navigate({ to: "/editor/$id", params: { id: "new" } })}
        >
          <Plus /> Create new proposal
        </Button>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title || "Untitled proposal"}” will be permanently removed, along
              with any signature already collected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({
  label,
  value,
  loading,
  accent,
  className,
}: {
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card className={`surface-card rounded-2xl border-border/70 ${className ?? ""}`}>
      <CardContent className="py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <p
            className={`mt-1 numeric text-2xl font-semibold ${accent ? "text-success" : "text-foreground"}`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, FileText, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatCurrency, type ProposalStatus } from "@/lib/proposal-types";

type Row = {
  id: string;
  client_name: string;
  project_title: string;
  amount: number;
  status: ProposalStatus;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProposaLite" },
      { name: "description", content: "Track proposals sent, pending value and closed revenue." },
      { property: "og:title", content: "Dashboard — ProposaLite" },
      { property: "og:description", content: "Your proposals, pipeline and signed revenue." },
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
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, client_name, project_title, amount, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
    },
  });

  const rows = data ?? [];
  const sent = rows.filter((r) => r.status !== "draft").length;
  const pending = rows.filter((r) => r.status === "sent").reduce((s, r) => s + r.amount, 0);
  const closed = rows.filter((r) => r.status === "signed").reduce((s, r) => s + r.amount, 0);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { error } = await supabase.from("proposals").delete().eq("id", pendingDelete.id);
    setPendingDelete(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Proposal deleted");
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${id}`);
    toast.success("Client link copied");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={user.email} />
      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Proposals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you've drafted, sent and closed.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate({ to: "/editor/$id", params: { id: "new" } })}>
            <Plus /> Create new proposal
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Proposals sent" value={String(sent)} loading={isLoading} />
          <Metric label="Value pending" value={formatCurrency(pending)} loading={isLoading} />
          <Metric
            label="Value closed"
            value={formatCurrency(closed)}
            loading={isLoading}
            accent
          />
        </div>

        <Card className="surface-card mt-8 overflow-hidden rounded-2xl border-border/70 p-0">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No proposals yet</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Draft your first proposal, share the private link, and get it signed.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => navigate({ to: "/editor/$id", params: { id: "new" } })}
                >
                  Create proposal
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.client_name || "—"}</TableCell>
                      <TableCell>
                        <Link
                          to="/editor/$id"
                          params={{ id: row.id }}
                          className="hover:text-primary hover:underline"
                        >
                          {row.project_title || "Untitled proposal"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status}>{statusLabel[row.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {row.status !== "draft" ? (
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.project_title || "Untitled proposal"}” will be permanently removed,
              along with any signature already collected.
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
}: {
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <Card className="surface-card rounded-2xl border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p
            className={`text-3xl font-semibold tabular-nums ${accent ? "text-success" : "text-foreground"}`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
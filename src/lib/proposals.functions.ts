import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeContent, type ProposalContent, type ProposalStatus } from "./proposal-types";

const token = z.string().uuid();

const listSchema = z.object({ token });
const idSchema = z.object({ token, id: z.string().uuid() });
const saveSchema = z.object({
  token,
  id: z.string().uuid(),
  clientName: z.string().max(200),
  projectTitle: z.string().max(200),
  content: z.unknown(),
  amount: z.number().nonnegative().max(100_000_000),
});

export type OwnedProposal = {
  id: string;
  client_name: string;
  project_title: string;
  content_json: ProposalContent;
  amount: number;
  status: ProposalStatus;
  signature_data: string | null;
  created_at: string;
};

/** Proposals this device has published, scoped strictly by its local token. */
export const listMyProposals = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data }): Promise<OwnedProposal[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("proposals")
      .select(
        "id, client_name, project_title, content_json, amount, status, signature_data, created_at",
      )
      .eq("owner_token", data.token)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      ...row,
      amount: Number(row.amount),
      content_json: normalizeContent(row.content_json),
    }));
  });

export const getMyProposal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }): Promise<OwnedProposal | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("proposals")
      .select(
        "id, client_name, project_title, content_json, amount, status, signature_data, created_at",
      )
      .eq("id", data.id)
      .eq("owner_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return { ...row, amount: Number(row.amount), content_json: normalizeContent(row.content_json) };
  });

/** The single write path: publishing (or re-publishing) a proposal link. */
export const publishProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: readError } = await supabaseAdmin
      .from("proposals")
      .select("id, owner_token, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (existing && existing.owner_token !== data.token) {
      throw new Error("This proposal belongs to another device");
    }
    if (existing?.status === "signed") {
      throw new Error("A signed proposal can no longer be edited");
    }

    const payload = {
      id: data.id,
      owner_token: data.token,
      client_name: data.clientName,
      project_title: data.projectTitle,
      content_json: normalizeContent(data.content),
      amount: data.amount,
      status: "sent" as const,
    };

    const { error } = await supabaseAdmin.from("proposals").upsert(payload, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const deleteMyProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("proposals")
      .delete()
      .eq("id", data.id)
      .eq("owner_token", data.token);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

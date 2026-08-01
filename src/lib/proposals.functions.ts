import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeContent, type ProposalContent, type ProposalStatus } from "./proposal-types";

const token = z.string().uuid();

const listSchema = z.object({ token });
const idSchema = z.object({ token, id: z.string().uuid() });

const contentSchema = z.object({
  intro: z.string().max(5_000).default(""),
  scope: z.string().max(10_000).default(""),
  terms: z.string().max(5_000).default(""),
  items: z
    .array(
      z.object({
        id: z.string().max(64),
        item: z.string().max(200),
        description: z.string().max(1_000),
        cost: z.number().nonnegative().max(100_000_000),
      }),
    )
    .max(100)
    .default([]),
});

const saveSchema = z.object({
  token,
  id: z.string().uuid(),
  clientName: z.string().max(200),
  projectTitle: z.string().max(200),
  content: contentSchema,
  amount: z.number().nonnegative().max(100_000_000),
});

/** Never leak driver/database text to the browser. */
function fail(context: string, error: unknown): never {
  console.error(`[proposals] ${context}`, error);
  throw new Error("Something went wrong, please try again.");
}

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
    if (error) fail("listMyProposals", error);
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
    if (error) fail("getMyProposal", error);
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
    if (readError) fail("publishProposal.read", readError);
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
    if (error) fail("publishProposal.upsert", error);
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
    if (error) fail("deleteMyProposal", error);
    return { ok: true };
  });

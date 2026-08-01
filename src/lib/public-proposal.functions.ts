import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeContent, type PublicProposal } from "./proposal-types";

const idSchema = z.object({ id: z.string().uuid() });

const signSchema = z.object({
  id: z.string().uuid(),
  signature: z
    .string()
    .startsWith("data:image/png;base64,")
    .max(400_000, "Signature image is too large"),
});

/** Never leak driver/database text to the browser. */
function fail(context: string, error: unknown): never {
  console.error(`[public-proposal] ${context}`, error);
  throw new Error("Something went wrong, please try again.");
}

/**
 * Public read of a single proposal via its obfuscated UUID link.
 * Only non-sensitive columns are projected; anon has no direct table grants.
 */
export const getPublicProposal = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }): Promise<PublicProposal | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("proposals")
      .select(
        "id, client_name, project_title, content_json, amount, status, signature_data, created_at",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) fail("getPublicProposal", error);
    if (!row || row.status === "draft") return null;


    return {
      id: row.id,
      client_name: row.client_name,
      project_title: row.project_title,
      content_json: normalizeContent(row.content_json),
      amount: Number(row.amount),
      status: row.status,
      signature_data: row.signature_data,
      created_at: row.created_at,
    };
  });

/**
 * Unauthenticated signing. Writes ONLY signature_data / status / signed_at.
 * content_json and amount can never be modified through this path.
 */
export const signPublicProposal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: readError } = await supabaseAdmin
      .from("proposals")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();

    if (readError) fail("signPublicProposal.read", readError);
    if (!existing || existing.status === "draft") throw new Error("Proposal not found");
    if (existing.status === "signed") throw new Error("This proposal has already been signed");

    const { error } = await supabaseAdmin
      .from("proposals")
      .update({
        signature_data: data.signature,
        status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "sent");

    if (error) fail("signPublicProposal.update", error);
    return { ok: true };
  });
export type LineItem = {
  id: string;
  item: string;
  description: string;
  cost: number;
};

export type ProposalContent = {
  intro: string;
  scope: string;
  terms: string;
  items: LineItem[];
};

export type ProposalStatus = "draft" | "sent" | "signed";

export type PublicProposal = {
  id: string;
  client_name: string;
  project_title: string;
  content_json: ProposalContent;
  amount: number;
  status: ProposalStatus;
  signature_data: string | null;
  created_at: string;
};

export const emptyContent = (): ProposalContent => ({
  intro: "",
  scope: "",
  terms: "50% deposit due on acceptance. Balance due on delivery.",
  items: [],
});

export function normalizeContent(value: unknown): ProposalContent {
  const base = emptyContent();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<ProposalContent>;
  return {
    intro: typeof raw.intro === "string" ? raw.intro : base.intro,
    scope: typeof raw.scope === "string" ? raw.scope : base.scope,
    terms: typeof raw.terms === "string" ? raw.terms : base.terms,
    items: Array.isArray(raw.items)
      ? raw.items.map((entry, index) => ({
          id: String(entry?.id ?? `item-${index}`),
          item: String(entry?.item ?? ""),
          description: String(entry?.description ?? ""),
          cost: Number(entry?.cost ?? 0) || 0,
        }))
      : [],
  };
}

export const totalOf = (items: LineItem[]) =>
  items.reduce((sum, entry) => sum + (Number(entry.cost) || 0), 0);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
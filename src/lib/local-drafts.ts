import { emptyContent, normalizeContent, type ProposalContent } from "./proposal-types";

export type LocalDraft = {
  id: string;
  clientName: string;
  projectTitle: string;
  content: ProposalContent;
  updatedAt: string;
};

const KEY = "proposalite:drafts";

export const newLocalDraft = (id: string): LocalDraft => ({
  id,
  clientName: "",
  projectTitle: "",
  content: emptyContent(),
  updatedAt: new Date().toISOString(),
});

export function listLocalDrafts(): LocalDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as LocalDraft[];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => ({
        id: String(entry.id),
        clientName: String(entry.clientName ?? ""),
        projectTitle: String(entry.projectTitle ?? ""),
        content: normalizeContent(entry.content),
        updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function getLocalDraft(id: string): LocalDraft | null {
  return listLocalDrafts().find((entry) => entry.id === id) ?? null;
}

export function saveLocalDraft(draft: LocalDraft) {
  if (typeof window === "undefined") return;
  const next = [
    { ...draft, updatedAt: new Date().toISOString() },
    ...listLocalDrafts().filter((entry) => entry.id !== draft.id),
  ];
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeLocalDraft(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(listLocalDrafts().filter((e) => e.id !== id)));
}

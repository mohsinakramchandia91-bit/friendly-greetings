import type { ProposalContent } from "./proposal-types";
import { formatCurrency, totalOf } from "./proposal-types";

type PdfInput = {
  clientName: string;
  projectTitle: string;
  content: ProposalContent;
  from?: string | null;
  signature?: string | null;
};

export async function buildProposalPdf(input: PdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth();
  let y = margin;

  const line = (text: string, size: number, style: "normal" | "bold", gap = 16) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const chunks = doc.splitTextToSize(text, width - margin * 2) as string[];
    for (const chunk of chunks) {
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text(chunk, margin, y);
      y += gap;
    }
  };

  line("PROPOSAL", 9, "bold", 20);
  line(input.projectTitle || "Untitled proposal", 22, "bold", 28);
  line(`Prepared for ${input.clientName || "your client"}`, 11, "normal", 16);
  if (input.from) line(`From ${input.from}`, 11, "normal", 24);
  y += 8;

  if (input.content.intro) {
    line("Overview", 12, "bold", 18);
    line(input.content.intro, 11, "normal", 15);
    y += 10;
  }
  if (input.content.scope) {
    line("Scope of work", 12, "bold", 18);
    line(input.content.scope, 11, "normal", 15);
    y += 10;
  }

  if (input.content.items.length) {
    line("Investment", 12, "bold", 18);
    for (const item of input.content.items) {
      line(
        `${item.item || "Item"} — ${formatCurrency(item.cost)}${
          item.description ? `\n${item.description}` : ""
        }`,
        11,
        "normal",
        15,
      );
    }
    y += 6;
    line(`Total: ${formatCurrency(totalOf(input.content.items))}`, 13, "bold", 22);
  }

  if (input.content.terms) {
    line("Terms", 12, "bold", 18);
    line(input.content.terms, 11, "normal", 15);
  }

  if (input.signature) {
    y += 18;
    line("Signed by client", 11, "bold", 16);
    try {
      doc.addImage(input.signature, "PNG", margin, y, 180, 70);
      y += 84;
    } catch {
      /* ignore malformed signature */
    }
  }

  return doc;
}
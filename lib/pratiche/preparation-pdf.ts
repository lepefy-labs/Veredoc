import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";

export const PREPARATION_PDF_VERSION = "1";

type Summary = {
  title: string;
  status: string;
  version: number;
  updatedAt: Date;
  requiredDone: number;
  requiredTotal: number;
  steps: { title: string; done: boolean }[];
  authorities: string[];
};

const formatDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" });
const width = 595.28;
const height = 841.89;
const margin = 52;
const headingColor = rgb(0.07, 0.17, 0.33);
const ink = rgb(0.12, 0.16, 0.22);
const muted = rgb(0.30, 0.35, 0.43);

function wrap(text: string, font: PDFFont, size: number) {
  const supported = new Set(font.getCharacterSet());
  const normalized = [...text.replace(/\s+/g, " ").trim()].map((character) =>
    supported.has(character.codePointAt(0)!) ? character : "?").join("");
  const lines: string[] = [];
  let line = "";
  for (const word of normalized.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width - 2 * margin) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > width - 2 * margin) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function preparationPdf(summary: Summary) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Veredoc - Riepilogo preparazione");
  pdf.setAuthor("Veredoc");
  pdf.setLanguage("it-IT");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  function addPage() {
    const next = pdf.addPage([width, height]);
    next.drawText("VEREDOC", { x: margin, y: height - 55, size: 12, font: bold, color: headingColor });
    next.drawLine({ start: { x: margin, y: height - 68 }, end: { x: width - margin, y: height - 68 }, color: headingColor });
    return next;
  }

  let page: PDFPage = addPage();
  let y = height - 104;
  function draw(text: string, font = regular, size = 11, color = ink, gap = 8) {
    for (const line of wrap(text, font, size)) {
      if (y < 82) {
        page = addPage();
        y = height - 104;
      }
      page.drawText(line, { x: margin, y, size, font, color });
      y -= size + 5;
    }
    y -= gap;
  }

  draw("Riepilogo preparazione", bold, 22, headingColor);
  draw(summary.title, bold, 17);
  draw(`${summary.status}  |  ${summary.requiredDone} di ${summary.requiredTotal} requisiti completati`);
  draw(`Ultimo aggiornamento ${formatDate.format(summary.updatedAt)}  |  Procedura v${summary.version}`, regular, 10, muted, 22);
  draw("Checklist applicabile", bold, 15, headingColor, 12);
  if (summary.steps.length === 0) draw("Completa le domande per individuare i passaggi da preparare.");
  for (const step of summary.steps) draw(`[${step.done ? "Fatto" : "Da fare"}] ${step.title}`);
  if (summary.authorities.length) draw(`Fonti istituzionali ${summary.authorities.join(", ")}`, regular, 10, muted, 12);
  draw("Riepilogo per la preparazione personale. Consulta il portale ufficiale per requisiti, presentazione ed esito.", regular, 10, muted);

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    item.drawText(`Modello ${PREPARATION_PDF_VERSION}  |  Pagina ${index + 1} di ${pages.length}`, {
      x: margin, y: 45, size: 9, font: regular, color: muted,
    });
  });
  return pdf.save();
}

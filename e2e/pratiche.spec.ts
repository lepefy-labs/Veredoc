import { expect, test } from "@playwright/test";
import { prisma } from "../lib/prisma";
import { login, register, uniqueEmail } from "./helpers";

async function createPublishedFixture() {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const source = await prisma.knowledgeSource.upsert({
    where: { url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html" },
    update: {},
    create: { authority: "INPS", title: "Portale unico ISEE", url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html", sourceType: "SERVIZIO", scope: "Nazionale", status: "VERIFIED", verifiedAt: new Date() },
  });
  const revision = await prisma.knowledgeRevision.findFirst({ where: { sourceId: source.id } }) ?? await prisma.knowledgeRevision.create({ data: { sourceId: source.id, version: 1, content: "Fixture di test per il flusso Pratiche", contentHash: `test-${suffix}`, status: "VERIFIED" } });
  const procedure = await prisma.procedureDefinition.create({ data: { slug: `test-pratica-${suffix}`, title: "Pratica di prova", description: "Percorso di test con un passaggio condizionale.", category: "Test", audience: "Utenti di test", scope: "Nazionale", authority: "INPS", status: "PUBLISHED" } });
  const version = await prisma.procedureVersion.create({ data: { procedureId: procedure.id, version: 1, status: "PUBLISHED", approvedAt: new Date(), definition: { questions: [{ id: "opzione", title: "Serve un documento aggiuntivo?", type: "boolean", required: true }], steps: [{ id: "base", title: "Prepara i dati", description: "Raccogli le informazioni necessarie.", kind: "task", required: true }, { id: "extra", title: "Prepara il documento aggiuntivo", description: "Documento richiesto per questo caso.", kind: "document", required: true, when: { questionId: "opzione", equals: true } }, { id: "portale", title: "Apri il portale INPS", description: "Presenta la pratica sul sito ufficiale.", kind: "portal", required: false, url: "https://www.inps.it/" }] } } });
  await prisma.procedureCitation.create({ data: { procedureVersionId: version.id, sourceId: source.id, revisionId: revision.id, instructionIds: ["opzione", "base", "extra", "portale"] } });
  return procedure.slug;
}

test("percorso Pratiche salva, riprende e protegge la proprietà", async ({ page, browser }) => {
  const slug = await createPublishedFixture();
  const email = uniqueEmail("pratiche");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto(`/pratiche/${slug}`);
  await page.getByRole("button", { name: "Inizia la pratica" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  const caseId = page.url().split("/").pop()!;
  const ownProfiles = await (await page.request.get("/api/profiles")).json();
  const ownProfileId = ownProfiles.profiles[0].id as string;
  await page.getByLabel("No").check();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Serve un documento aggiuntivo?" })).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.getByLabel("Ho completato questa attività su Veredoc").click();
  await expect(page.getByLabel("Ho completato questa attività su Veredoc")).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Apri il portale INPS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ho presentato la pratica" })).toBeVisible();
  const invalid = await page.request.patch(`/api/pratiche/cases/${caseId}`, { data: { kind: "answer", questionId: "opzione", value: "invalid", expectedRevision: 3 } });
  expect([400, 409]).toContain(invalid.status());
  const stale = await page.request.patch(`/api/pratiche/cases/${caseId}`, { data: { kind: "step", stepId: "base", done: false, expectedRevision: 0 } });
  expect(stale.status()).toBe(409);
  const stranger = await browser.newContext();
  expect((await stranger.request.get(`/api/pratiche/cases/${caseId}`)).status()).toBe(401);
  const other = await stranger.newPage();
  const otherEmail = uniqueEmail("stranger");
  await register(other, otherEmail);
  await login(other, otherEmail);
  await expect(other).toHaveURL(/\/dashboard/);
  const foreign = await other.request.get(`/api/pratiche/cases/${caseId}`);
  expect(foreign.status()).toBe(404);
  expect((await other.request.post("/api/pratiche/cases", { data: { slug, profileId: ownProfileId } })).status()).toBe(403);
  expect((await other.request.get("/api/pratiche/admin")).status()).toBe(403);
  await stranger.close();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Elimina la pratica" }).click();
  await expect(page).toHaveURL(/\/pratiche\/mie/);
  expect((await page.request.get(`/api/pratiche/cases/${caseId}`)).status()).toBe(404);
});

test("@mobile catalogo e navigazione Pratiche", async ({ page }) => {
  const email = uniqueEmail("pratiche-mobile");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/pratiche");
  await expect(page.getByRole("heading", { name: "Cosa devi fare?" })).toBeVisible();
  if (test.info().project.name === "mobile") await expect(page.getByRole("navigation", { name: "Navigazione app" }).getByRole("link", { name: "Pratiche" })).toBeVisible();
  else await expect(page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Pratiche", exact: true })).toBeVisible();
});

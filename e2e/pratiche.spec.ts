import { expect, test } from "@playwright/test";
import { prisma } from "../lib/prisma";
import { login, PASSWORD, register, testIp, uniqueEmail } from "./helpers";

async function createPublishedFixture(versionId?: string, publicSlug?: string) {
  if (versionId) {
    const fixture = await prisma.procedureVersion.findUnique({
      where: { id: versionId }, select: { procedure: { select: { slug: true } } },
    });
    if (fixture) return fixture.procedure.slug;
  }
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const source = await prisma.knowledgeSource.upsert({
    where: { url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html" },
    update: {},
    create: { authority: "INPS", title: "Portale unico ISEE", url: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.Portale-unico-ISEE.html", sourceType: "SERVIZIO", scope: "Nazionale", status: "VERIFIED", verifiedAt: new Date() },
  });
  const revision = await prisma.knowledgeRevision.findFirst({ where: { sourceId: source.id } }) ?? await prisma.knowledgeRevision.create({ data: { sourceId: source.id, version: 1, content: "Fixture di test per il flusso Pratiche", contentHash: `test-${suffix}`, status: "VERIFIED" } });
  const procedure = await prisma.procedureDefinition.create({ data: { slug: publicSlug ?? `test-pratica-${suffix}`, title: publicSlug === "assegno-unico" ? "Assegno unico per i figli" : publicSlug === "bonus-asilo-nido" ? "Bonus asilo nido" : "Pratica di prova", description: "Percorso di test con un passaggio condizionale.", category: "Test", audience: "Utenti di test", scope: "Nazionale", authority: "INPS", status: "PUBLISHED" } });
  const version = await prisma.procedureVersion.create({ data: { id: versionId, procedureId: procedure.id, version: 1, status: "PUBLISHED", approvedAt: new Date(), definition: { questions: [{ id: "opzione", title: "Serve un documento aggiuntivo?", type: "boolean", required: true }], steps: [{ id: "base", title: "Prepara i dati", description: "Raccogli le informazioni necessarie.", kind: "task", required: true }, { id: "extra", title: "Prepara il documento aggiuntivo", description: "Documento richiesto per questo caso.", kind: "document", required: true, when: { questionId: "opzione", equals: true } }, { id: "portale", title: "Apri il portale INPS", description: "Presenta la pratica sul sito ufficiale.", kind: "portal", required: false, url: "https://www.inps.it/" }] } } });
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
  await expect(page.getByText("Documento richiesto per questo caso.")).toBeHidden();
  await page.getByRole("button", { name: "Spiegazione: In alcuni casi: Prepara il documento aggiuntivo" }).click();
  await expect(page.getByText("Documento richiesto per questo caso.")).toBeVisible();
  await page.getByRole("button", { name: "Avvia la checklist" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  const caseId = page.url().split("/").pop()!;
  const ownProfiles = await (await page.request.get("/api/profiles")).json();
  const ownProfileId = ownProfiles.profiles[0].id as string;
  await page.getByLabel("No").check();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await expect(page.getByText("Raccogli le informazioni necessarie.")).toBeHidden();
  await page.getByRole("button", { name: "Spiegazione: Prepara i dati" }).click();
  await expect(page.getByText("Raccogli le informazioni necessarie.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Serve un documento aggiuntivo?" })).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.getByLabel("Ho fatto questo passaggio").click();
  await expect(page.getByLabel("Ho fatto questo passaggio")).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Apri il portale INPS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ho inviato la richiesta" })).toBeVisible();
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

test("@mobile riprende dalla dashboard il primo passaggio ancora da fare", async ({ page }) => {
  const slug = await createPublishedFixture();
  const email = uniqueEmail("riprendi");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Riprendi pratica" })).toHaveCount(0);
  await page.goto(`/pratiche/${slug}`);
  await page.getByRole("button", { name: "Avvia la checklist" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  await page.getByLabel("No").check();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  const caseUrl = new URL(page.url());
  await page.goto("/dashboard");

  const shortcut = page.getByRole("region", { name: "Pratica da riprendere" });
  await expect(shortcut.getByText("Io · In corso")).toBeVisible();
  await expect(shortcut.getByRole("link", { name: "Vedi tutte le pratiche" })).toHaveAttribute("href", "/pratiche/mie");
  await shortcut.getByRole("link", { name: "Riprendi pratica" }).click();
  await expect(page).toHaveURL(`${caseUrl.toString()}?from=dashboard`);
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  const saved = page.waitForResponse((response) =>
    response.request().method() === "PATCH" && response.url().includes("/api/pratiche/cases/")
  );
  await page.getByLabel("Ho fatto questo passaggio").click();
  expect((await (await saved).json()).advanced).toBe(true);
  await expect(page.getByLabel("Ho fatto questo passaggio")).toBeChecked();
});

test("@mobile mostra documenti, passaggi e servizio ANPR prima della checklist", async ({ page }) => {
  const slug = await createPublishedFixture("pv_residenza_1", "cambio-residenza");
  const otherGuides = [
    {
      slug: await createPublishedFixture("pv_certificati_1", "certificati-anagrafici"),
      name: "Vai ai certificati su ANPR",
      url: "https://www.anagrafenazionale.interno.it/area-cittadino/certificati/",
    },
    {
      slug: await createPublishedFixture("pv_isee_1", "preparazione-dsu-isee"),
      name: "Apri il Portale unico ISEE dell’INPS",
      url: "https://servizi2.inps.it/servizi/ISEEPrecompilato/",
    },
  ];
  const email = uniqueEmail("guida-residenza");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/pratiche/${slug}`);

  await expect(page.getByRole("heading", { name: "Cambio di residenza", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vai al cambio di residenza su ANPR" }))
    .toHaveAttribute("href", "https://www.anagrafenazionale.interno.it/area-cittadino/cambio-di-residenza/");
  const documents = page.getByRole("region", { name: "Documenti e dati da preparare" });
  await expect(documents.getByText("Se sei in affitto o in comodato registrato", { exact: true })).toBeVisible();
  await expect(documents.getByText(/gli estremi di registrazione/)).toBeVisible();
  const steps = page.getByRole("region", { name: "Passaggi sul portale ufficiale" });
  await expect(steps.getByRole("listitem")).toHaveCount(5);
  await expect(steps.getByText(/dopo tutte le convalide/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Avvia la checklist" })).toBeVisible();
  await expect(page).toHaveURL(`/pratiche/${slug}`);

  for (const guide of otherGuides) {
    await page.goto(`/pratiche/${guide.slug}`);
    await expect(page.getByRole("link", { name: guide.name })).toHaveAttribute("href", guide.url);
    await expect(page.getByRole("heading", { name: "Documenti e dati da preparare" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Passaggi sul portale ufficiale" })).toBeVisible();
  }
});

test("@mobile le guide sono pubbliche e il link CAF conserva il percorso dopo il login", async ({ page }) => {
  const slug = await createPublishedFixture("pv_isee_1", "preparazione-dsu-isee");
  const email = uniqueEmail("isee-caf");
  await page.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
  await page.goto("/");
  await page.getByRole("link", { name: "Leggi le guide gratuite" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { name: "Guide per le pratiche" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prepara i dati per l'ISEE" })).toHaveAttribute("href", `/guide/${slug}`);

  await page.getByRole("link", { name: "Lavori in un CAF?" }).click();
  await expect(page).toHaveURL(/\/per-i-caf$/);
  await expect(page.getByRole("link", { name: "Proponi un pilota per la tua sede" }))
    .toHaveAttribute("href", /^mailto:ciao@veredoc\.it/);
  await page.getByRole("link", { name: "Vedi la guida da condividere" }).click();
  await expect(page).toHaveURL(/\/guide\/preparazione-dsu-isee\?da=caf$/);
  await expect(page.getByRole("heading", { name: "Documenti e dati da preparare" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute("href", "https://www.veredoc.it/guide/preparazione-dsu-isee");
  expect((await page.request.get("/api/pratiche/cases")).status()).toBe(401);

  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  expect(await sitemap.text()).toContain("https://www.veredoc.it/guide/preparazione-dsu-isee");

  await page.getByRole("link", { name: "Continua con la checklist" }).click();
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fpratiche%2Fpreparazione-dsu-isee%3Fda%3Dcaf_pilot$/);
  await page.getByRole("main").getByRole("link", { name: /registrati/i }).click();
  await expect(page).toHaveURL(/\/register\?callbackUrl=%2Fpratiche%2Fpreparazione-dsu-isee%3Fda%3Dcaf_pilot$/);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /registr|crea/i }).click();
  await expect(page).toHaveURL(/\/login\?registered=1&callbackUrl=%2Fpratiche%2Fpreparazione-dsu-isee%3Fda%3Dcaf_pilot$/);
  await login(page, email);
  await expect(page).toHaveURL(/\/pratiche\/preparazione-dsu-isee\?da=caf_pilot$/);
  await page.getByRole("button", { name: "Avvia la checklist" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  const caseId = new URL(page.url()).pathname.split("/").pop()!;
  const created = await prisma.caseEvent.findFirst({ where: { caseId, type: "CREATED" } });
  expect(created?.metadata).toEqual({ entryPoint: "caf_pilot" });
});

test("una guida ritirata esce dal sito pubblico e dalla sitemap", async ({ page }) => {
  const slug = await createPublishedFixture("pv_residenza_1", "cambio-residenza");
  await prisma.procedureDefinition.update({ where: { slug }, data: { status: "DRAFT" } });
  try {
    const hidden = await page.request.get(`/guide/${slug}`);
    expect(hidden.status()).toBe(404);
    const sitemap = await page.request.get("/sitemap.xml");
    await expect(sitemap).toBeOK();
    expect(await sitemap.text()).not.toContain(`/guide/${slug}`);
  } finally {
    await prisma.procedureDefinition.update({ where: { slug }, data: { status: "PUBLISHED" } });
  }
});

test("@mobile la guida pubblica conserva le spunte e si può stampare", async ({ page }) => {
  const slug = await createPublishedFixture("pv_residenza_1", "cambio-residenza");
  await page.goto(`/guide/${slug}`);

  const documents = page.getByRole("region", { name: "Documenti e dati da preparare" });
  const rental = documents.getByRole("checkbox", { name: "Se sei in affitto o in comodato registrato" });
  await expect(rental).not.toBeChecked();
  await rental.check();
  await expect(documents.getByRole("status")).toContainText("1 voce spuntata");
  await page.reload();
  await expect(rental).toBeChecked();
  await expect(page.getByRole("button", { name: "Stampa la guida" })).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Stampa la guida" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Continua con la checklist" })).toBeHidden();
  await expect(documents.getByText("[✓]", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vai al cambio di residenza su ANPR" }))
    .toHaveAttribute("data-guide-print-url", "https://www.anagrafenazionale.interno.it/area-cittadino/cambio-di-residenza/");
});

test("le nuove guide INPS sono pubbliche, collegate all’ISEE e incluse nella sitemap", async ({ page }) => {
  await createPublishedFixture("pv_isee_1", "preparazione-dsu-isee");
  await createPublishedFixture("pv_assegno_unico_1", "assegno-unico");
  await createPublishedFixture("pv_bonus_nido_1", "bonus-asilo-nido");

  await page.goto("/guide/preparazione-dsu-isee");
  const related = page.getByRole("region", { name: "Guide collegate" });
  await related.getByRole("link", { name: "Assegno unico per i figli" }).click();
  await expect(page.getByRole("heading", { name: "Assegno unico per i figli", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri il servizio Assegno unico su INPS" })).toHaveAttribute("href", /^https:\/\/www\.inps\.it\//);

  await page.getByRole("region", { name: "Guide collegate" }).getByRole("link", { name: "Bonus asilo nido" }).click();
  await expect(page.getByRole("heading", { name: "Bonus asilo nido", level: 1 })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Prova del pagamento tracciabile" })).toBeVisible();
  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  const xml = await sitemap.text();
  expect(xml).toContain("https://www.veredoc.it/guide/assegno-unico");
  expect(xml).toContain("https://www.veredoc.it/guide/bonus-asilo-nido");
});

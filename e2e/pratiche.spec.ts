import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";
import { prisma } from "../lib/prisma";
import { login, PASSWORD, register, testIp, uniqueEmail } from "./helpers";

async function createPublishedFixture(versionId?: string, publicSlug?: string, publicTitle?: string, publicGuide = false) {
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
  const procedure = await prisma.procedureDefinition.create({ data: { slug: publicSlug ?? `test-pratica-${suffix}`, title: publicTitle ?? (publicSlug === "assegno-unico" ? "Assegno unico per i figli" : publicSlug === "bonus-asilo-nido" ? "Bonus asilo nido" : "Pratica di prova"), description: "Percorso di test con un passaggio condizionale.", category: "Test", audience: "Utenti di test", scope: "Nazionale", authority: "INPS", status: "PUBLISHED" } });
  const version = await prisma.procedureVersion.create({ data: { id: versionId, procedureId: procedure.id, version: 1, status: "PUBLISHED", approvedAt: new Date(), definition: { ...(publicGuide ? { publicGuide: true } : {}), questions: [{ id: "opzione", title: "Serve un documento aggiuntivo?", type: "boolean", required: true }], steps: [{ id: "base", title: "Prepara i dati", description: "Raccogli le informazioni necessarie.", kind: "task", required: true }, { id: "extra", title: "Prepara il documento aggiuntivo", description: "Documento richiesto per questo caso.", kind: "document", required: true, when: { questionId: "opzione", equals: true } }, { id: "portale", title: "Apri il portale INPS", description: "Presenta la pratica sul sito ufficiale.", kind: "portal", required: false, url: "https://www.inps.it/" }] } } });
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
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.getByRole("button", { name: "Indietro" }).click();
  await expect(page.getByLabel("No")).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.getByLabel("Ho fatto questo passaggio").click();
  await expect(page.getByLabel("Ho fatto questo passaggio")).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Apri il portale INPS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ho inviato la richiesta" })).toBeVisible();
  const invalid = await page.request.patch(`/api/pratiche/cases/${caseId}`, { data: { kind: "answer", questionId: "opzione", value: "invalid", expectedRevision: 2 } });
  expect(invalid.status()).toBe(400);
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
  if (test.info().project.name === "mobile") await expect(page.getByRole("navigation", { name: "Navigazione app" }).getByRole("link", { name: "Le mie attività" })).toBeVisible();
  else await expect(page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Le mie attività", exact: true })).toBeVisible();
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

  const shortcut = page.getByRole("article", { name: "Pratica da riprendere" });
  await expect(shortcut.getByText("Io · In corso")).toBeVisible();
  await expect(page.getByRole("region", { name: "Attività in corso" }).getByRole("link", { name: "Le mie attività" })).toHaveAttribute("href", "/pratiche/mie");
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
  await page.goto(`/pratiche/${slug}?da=caf_pilot`);
  const existing = page.getByRole("list", { name: "Pratiche già avviate" }).getByRole("link");
  await expect(existing).toHaveAttribute("href", `/pratiche/caso/${caseId}`);
  await existing.click();
  await expect(page).toHaveURL(`/pratiche/caso/${caseId}`);
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

test("le guide su bollette, casa e agevolazioni sono accessibili senza account", async ({ page }) => {
  const editions = [
    ["pv_bonus_sociale_1", "bonus-sociale-luce-gas-acqua"],
    ["pv_lettura_bolletta_1", "come-leggere-bolletta-luce-gas"],
    ["pv_voltura_subentro_1", "voltura-o-subentro-luce-gas"],
    ["pv_isee_corrente_1", "isee-corrente"],
    ["pv_bonus_nuovi_nati_2026_1", "bonus-nuovi-nati-2026"],
  ];

  for (const [versionId, slug] of editions) {
    await createPublishedFixture(versionId, slug);
  }
  await createPublishedFixture("pv_isee_1", "preparazione-dsu-isee");

  await page.goto("/guide");
  const index = page.getByRole("main");
  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  const xml = await sitemap.text();

  for (const [, slug] of editions) {
    const path = `/guide/${slug}`;
    await expect(index.locator(`a[href="${path}"]`)).toBeVisible();
    const guide = await page.request.get(path);
    await expect(guide).toBeOK();
    const entry = xml.match(new RegExp("<url>\\s*<loc>https://www\\.veredoc\\.it" + path + "</loc>\\s*<lastmod>([^<]+)</lastmod>"))?.[1];
    expect(entry).toBe("2026-11-23");
  }

  await page.goto("/guide/come-leggere-bolletta-luce-gas");
  const canonical = "https://www.veredoc.it/guide/come-leggere-bolletta-luce-gas";
  const description = /Trova consumi, quote fisse e prezzo/;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
  await expect(page.getByText("Fonti verificate il", { exact: false })).toContainText("23 novembre 2026");
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(jsonLd ?? "")).toMatchObject({
    "@type": "Article",
    url: canonical,
    description: expect.stringMatching(description),
    dateModified: "2026-11-23",
  });
  const example = page.getByRole("table", { name: "Esempio di lettura dello scontrino luce" });
  await expect(example.getByRole("row", { name: /Subtotale dell’esempio/ })).toContainText("39,40 €");
  await expect(page.getByRole("link", { name: "Vai all’analisi della bolletta" })).toHaveAttribute("href", "/analyze");
  await page.getByRole("region", { name: "Guide collegate" }).locator('a[href="/guide/bonus-sociale-luce-gas-acqua"]').click();
  await expect(page.getByRole("region", { name: "Guide collegate" }).locator('a[href="/guide/preparazione-dsu-isee"]')).toBeVisible();
});

test("@mobile trova guide e servizi ufficiali per permessi e cittadinanza", async ({ page }) => {
  await createPublishedFixture("pv_controllo_permesso_1", "controllare-permesso-di-soggiorno", "Come controllare se il permesso di soggiorno è pronto");
  await createPublishedFixture("pv_cittadinanza_residenza_1", "cittadinanza-italiana-per-residenza", "Cittadinanza italiana per residenza");
  await createPublishedFixture("pv_voltura_subentro_1", "voltura-o-subentro-luce-gas");
  await page.goto("/guide");
  await expect(page.getByRole("navigation", { name: "Principale" }).getByRole("link", { name: "Guide", exact: true })).toHaveAttribute("href", "/guide");

  const search = page.getByRole("search");
  await search.getByRole("searchbox", { name: "Cerca una guida" }).fill("cambio intestatario bolletta");
  await search.getByRole("button", { name: "Cerca", exact: true }).click();
  const results = page.getByRole("region", { name: /Risultati per/ });
  await results.locator('a[href="/guide/voltura-o-subentro-luce-gas"]').click();
  await page.getByRole("link", { name: "Vai ai documenti e alla checklist" }).click();
  await expect(page).toHaveURL(/#documenti$/);
  await expect(page.getByRole("region", { name: "Documenti e dati da preparare" })).toBeVisible();
  await page.getByRole("navigation", { name: "Percorso" }).getByRole("link", { name: "Tutte le guide" }).click();

  await search.getByRole("searchbox", { name: "Cerca una guida" }).fill("documenti rinnovo per studio");
  await search.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(results.getByRole("link", { name: "Permesso di soggiorno per studio" }))
    .toHaveAttribute("href", "https://www.portaleimmigrazione.it/ITA/soggMotiviStudio39.html");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");

  await page.getByRole("navigation", { name: "Argomenti delle guide" }).getByRole("link", { name: /Permessi e cittadinanza/ }).click();
  await page.getByRole("link", { name: "Ho già fatto domanda per il permesso" }).click();
  await expect(page).toHaveURL(/#stato$/);
  await expect(page.getByRole("link", { name: "Come controllare se il permesso di soggiorno è pronto" }))
    .toHaveAttribute("href", "/guide/controllare-permesso-di-soggiorno");
  await page.getByRole("link", { name: "Voglio chiedere la cittadinanza italiana" }).click();
  await expect(page).toHaveURL(/#cittadinanza$/);
  await expect(page.getByRole("link", { name: "Cittadinanza italiana per residenza" }))
    .toHaveAttribute("href", "/guide/cittadinanza-italiana-per-residenza");
  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  expect(await sitemap.text()).toContain("https://www.veredoc.it/guide/temi/permessi-e-cittadinanza");
});

test("@mobile le guide immigrazione sono raggiungibili da tema, ricerca e sitemap", async ({ page }) => {
  const editions = [
    ["pv_permesso_famiglia_1", "permesso-soggiorno-motivi-familiari", "Permesso di soggiorno per motivi familiari"],
    ["pv_ricongiungimento_1", "ricongiungimento-familiare", "Ricongiungimento familiare"],
    ["pv_controllo_permesso_1", "controllare-permesso-di-soggiorno", "Come controllare se il permesso di soggiorno è pronto"],
    ["pv_cittadinanza_residenza_1", "cittadinanza-italiana-per-residenza", "Cittadinanza italiana per residenza"],
  ];
  for (const [versionId, slug, title] of editions) await createPublishedFixture(versionId, slug, title);

  await page.goto("/guide/temi/permessi-e-cittadinanza");
  const main = page.getByRole("main");
  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  const xml = await sitemap.text();
  for (const [, slug, title] of editions) {
    await expect(main.getByRole("link", { name: title, exact: true })).toHaveAttribute("href", `/guide/${slug}`);
    expect(xml).toContain(`https://www.veredoc.it/guide/${slug}`);
  }

  await page.goto("/guide?q=permesso+pronto");
  const results = page.getByRole("region", { name: /Risultati per/ });
  await results.getByRole("link", { name: "Come controllare se il permesso di soggiorno è pronto", exact: true }).click();
  await expect(page.getByRole("link", { name: "Verifica lo stato sul sito ufficiale" }))
    .toHaveAttribute("href", "https://questure.poliziadistato.it/stranieri/");
  await expect(page.getByRole("checkbox", { name: "Ricevuta della domanda" })).toBeVisible();
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-11-23");
});

test("gli eventi delle guide usano solo esito e identificativo pubblico", async ({ page }) => {
  const slug = await createPublishedFixture("pv_residenza_1", "cambio-residenza");
  await page.addInitScript(() => {
    const analytics = window as typeof window & {
      va: (command: string, payload: unknown) => void;
      guideEvents: unknown[];
    };
    analytics.guideEvents = [];
    analytics.va = (command, payload) => {
      if (command === "event") analytics.guideEvents.push(payload);
    };
  });
  const events = () => page.evaluate(() => (window as typeof window & { guideEvents: unknown[] }).guideEvents);
  await page.goto("/guide?q=nessunrisultatoveredoc");
  await expect.poll(events).toContainEqual(expect.objectContaining({
    name: "guide_search",
    data: { hasResults: false },
  }));

  await page.goto(`/guide/${slug}`);
  await page.getByRole("checkbox", { name: "Se sei in affitto o in comodato registrato" }).check();
  const portal = page.getByRole("link", { name: "Vai al cambio di residenza su ANPR" });
  await portal.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await portal.click();
  await expect.poll(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "guide_checklist_start", data: { subject: slug } }),
    expect.objectContaining({ name: "guide_official_click", data: { subject: slug } }),
  ]));
});

test("@mobile cerca un bisogno dalla home e apre la guida", async ({ page }) => {
  const slug = await createPublishedFixture("pv_residenza_1", "cambio-residenza");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cosa devi risolvere?", level: 1 })).toBeVisible();
  const search = page.getByRole("search");
  await search.getByRole("searchbox", { name: "Cerca per bisogno o argomento" }).fill("cambio di residenza");
  await search.getByRole("button", { name: "Cerca", exact: true }).click();
  const results = page.getByRole("region", { name: /Risultati per/ });
  await results.locator(`a[href="/guide/${slug}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/guide/${slug}$`));
  await expect(page.getByRole("link", { name: "Continua con la checklist" })).toBeVisible();
});

test("@mobile recupera la pratica dopo un salvataggio concorrente", async ({ page }) => {
  const slug = await createPublishedFixture();
  const email = uniqueEmail("conflitto");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/pratiche/${slug}`);
  await page.getByRole("button", { name: "Avvia la checklist" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  const casePath = new URL(page.url()).pathname.replace("/pratiche/caso/", "/api/pratiche/cases/");
  const saved = await page.request.patch(casePath, { data: { kind: "answer", questionId: "opzione", value: false, expectedRevision: 0 } });
  await expect(saved).toBeOK();

  await page.getByLabel("No", { exact: true }).check();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("La pratica è stata aggiornata altrove.");
  await page.getByRole("button", { name: "Carica versione aggiornata" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.getByText("Attività recenti", { exact: true }).click();
  await expect(page.getByText("Risposta salvata", { exact: true })).toBeVisible();
});

test("collega un originale del proprio profilo e rimuove il collegamento dopo lo spostamento", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const connection = await pool.connect();
    try {
      const migration = await readFile("supabase/migrations/007_case_evidence.sql", "utf8");
      await connection.query(migration);
    } finally {
      connection.release();
    }
  } finally {
    await pool.end();
  }

  const slug = await createPublishedFixture();
  const email = uniqueEmail("fascicolo");
  await register(page, email);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  const account = await prisma.user.findUniqueOrThrow({ where: { email }, include: { profiles: true } });
  const profile = account.profiles[0];
  const differentProfile = await prisma.analysisProfile.create({ data: { userId: account.id, label: "Altro profilo" } });
  const [document, otherDocument] = await Promise.all([
    prisma.document.create({ data: { userId: account.id, profileId: profile.id, type: "BUSTA_PAGA", status: "DONE", filePath: "tests/cedolino.pdf", fileName: "cedolino.pdf" } }),
    prisma.document.create({ data: { userId: account.id, profileId: differentProfile.id, type: "BUSTA_PAGA", status: "DONE", filePath: "tests/altro.pdf", fileName: "altro.pdf" } }),
  ]);

  await page.goto(`/pratiche/${slug}`);
  await page.getByRole("button", { name: "Avvia la checklist" }).click();
  await expect(page).toHaveURL(/\/pratiche\/caso\//);
  const casePath = new URL(page.url()).pathname;
  const endpoint = casePath.replace("/pratiche/caso/", "/api/pratiche/cases/") + "/documenti";
  await page.getByLabel("Sì", { exact: true }).check();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara i dati" })).toBeVisible();
  await page.getByLabel("Ho fatto questo passaggio").click();
  await expect(page.getByLabel("Ho fatto questo passaggio")).toBeChecked();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Prepara il documento aggiuntivo" })).toBeVisible();

  const invalid = await page.request.post(endpoint, { data: { action: "link", step: "extra", documentId: otherDocument.id } });
  expect(invalid.status()).toBe(404);
  const evidence = page.getByRole("region", { name: "Documenti collegati" });
  await evidence.getByRole("combobox").selectOption(document.id);
  await evidence.getByRole("button", { name: "Collega documento" }).click();
  await expect(evidence.getByRole("button", { name: "Scollega cedolino.pdf" })).toBeVisible();
  await expect(page.getByLabel("Ho fatto questo passaggio")).not.toBeChecked();
  await page.reload();
  await expect(evidence.getByRole("button", { name: "Scollega cedolino.pdf" })).toBeVisible();

  await prisma.document.update({ where: { id: document.id }, data: { profileId: differentProfile.id } });
  await page.reload();
  await expect(evidence.getByText("Nessun documento collegato.")).toBeVisible();
  expect(await prisma.caseDocument.count({ where: { documentId: document.id } })).toBe(0);
});

test("pubblica una guida dal workflow senza aggiungere una definizione nel frontend", async ({ page }) => {
  const slug = await createPublishedFixture(undefined, undefined, "Procedura pubblica generata", true);
  await page.goto(`/guide/${slug}`);
  await expect(page.getByRole("heading", { name: "Procedura pubblica generata", level: 1 })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Prepara il documento aggiuntivo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri il portale INPS" })).toHaveAttribute("href", "https://www.inps.it/");

  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  expect(await sitemap.text()).toContain(`https://www.veredoc.it/guide/${slug}`);
  await page.goto("/guide?q=procedura+pubblica+generata");
  await expect(page.getByRole("link", { name: "Procedura pubblica generata" })).toBeVisible();
});

test("trova ISEE corrente con una richiesta colloquiale e mostra un esito vuoto per un bisogno ambiguo", async ({ page }) => {
  const slug = await createPublishedFixture("pv_isee_corrente_1", "isee-corrente", "ISEE corrente");
  await page.goto("/");
  const search = page.getByRole("search");
  await search.getByRole("searchbox").fill("Ho perso il lavoro e devo aggiornare l’ISEE");
  await search.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(page.getByRole("link", { name: "ISEE corrente" })).toHaveAttribute("href", `/guide/${slug}`);

  await page.getByRole("searchbox").fill("Devo rifare i documenti per mia moglie");
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(page.getByText("Non abbiamo trovato un percorso per questa richiesta.", { exact: false })).toBeVisible();
});

test("l’assistente della guida mostra istruzioni pubblicate e fonte ufficiale", async ({ page }) => {
  const slug = await createPublishedFixture("pv_isee_1", "preparazione-dsu-isee");
  await page.goto(`/guide/${slug}`);
  const assistant = page.getByRole("region", { name: "Trova il prossimo passo" });
  await assistant.getByRole("combobox").selectOption("presentazione");
  await assistant.getByRole("button", { name: "Mostra istruzioni" }).click();
  await expect(assistant.getByText("Istruzioni dalla guida pubblicata.")).toBeVisible();
  await expect(assistant.getByRole("link", { name: "Apri il Portale unico ISEE dell’INPS" })).toHaveAttribute("href", /^https:\/\/servizi2\.inps\.it\//);
  await expect(assistant.getByText("Fonti verificate il", { exact: false })).toBeVisible();
});

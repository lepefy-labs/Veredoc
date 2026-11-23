import { strict as assert } from "node:assert";
import { test } from "node:test";
import { searchGuideDirectory } from "../lib/pratiche/guide-navigation.ts";

const guides = [
  { slug: "preparazione-dsu-isee", title: "Prepara i dati per l’ISEE", description: "Documenti e informazioni per la DSU." },
  { slug: "isee-corrente", title: "ISEE corrente", description: "Aggiorna l’ISEE se il tuo reddito cambia." },
  { slug: "cambio-residenza", title: "Cambio di residenza", description: "Come dichiarare il nuovo indirizzo." },
];

test("ricerca per titolo, frase e refuso", () => {
  for (const query of ["cambio di residenza", "Devo cambiare residenza", "cambio resdienza", "Mi sono trasferito"]) {
    assert.equal(searchGuideDirectory(guides, query)[0]?.href, "/guide/cambio-residenza");
  }
});

test("ISEE corrente emerge quando cambia il lavoro e la guida è pubblicata", () => {
  assert.ok(searchGuideDirectory(guides, "Devo richiedere l’ISEE").some(({ href }) => href === "/guide/preparazione-dsu-isee"));
  const query = "Ho perso il lavoro e devo aggiornare l’ISEE";
  assert.equal(searchGuideDirectory(guides, query)[0]?.href, "/guide/isee-corrente");
  assert.deepEqual(searchGuideDirectory(guides.filter(({ slug }) => slug !== "isee-corrente"), query), []);
});

test("rinnovo del permesso e lettura del cedolino rimandano ai servizi disponibili", () => {
  const permits = searchGuideDirectory([], "Mi è scaduto il permesso");
  assert.ok(permits.length > 0);
  assert.ok(permits.every(({ authority }) => authority === "Portale Immigrazione"));
  assert.equal(searchGuideDirectory([], "Non capisco questa voce sullo stipendio")[0]?.href, "/analyze");
});

test("una richiesta ambigua o senza corrispondenze non suggerisce una pratica", () => {
  assert.deepEqual(searchGuideDirectory(guides, "Devo rifare i documenti per mia moglie"), []);
  assert.deepEqual(searchGuideDirectory(guides, "rinnovo patente nautica"), []);
  assert.deepEqual(searchGuideDirectory(guides, "i"), []);
});

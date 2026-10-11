import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { login, register, uniqueEmail } from "./helpers";

// Documenti inseriti direttamente nel DB di test: niente Storage né AI.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(async () => {
  await pool.end();
});

const SENSITIVE_MARKER = "POD-IT001E99999999-SEGRETO";

async function seedBills(email: string, count: number) {
  const { rows } = await pool.query<{ userId: string; profileId: string }>(
    `SELECT u.id AS "userId", p.id AS "profileId" FROM "User" u
     JOIN "AnalysisProfile" p ON p."userId" = u.id AND p."isDefault"
     WHERE lower(u.email) = lower($1)`,
    [email]
  );
  const { userId, profileId } = rows[0];
  for (let index = 0; index < count; index++) {
    const analysis = {
      tipo: "luce",
      tipo_rilevato: "luce",
      fornitore: `Fornitore ${index + 1}`,
      importo_totale: 50 + index,
      pod: SENSITIVE_MARKER,
      consumo_kwh: 200 + index,
    };
    await pool.query(
      `INSERT INTO "Document" (id, "userId", "profileId", type, "fileName", status, analysis, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'BOLLETTA_LUCE', $4, 'DONE', $5::jsonb, now() - ($6 || ' days')::interval, now())`,
      [`e2e-${userId}-${index}`, userId, profileId, `bolletta-${index + 1}.pdf`, JSON.stringify(analysis), String(30 * index)]
    );
  }
}

test("dashboard: riepiloghi paginati, nessun dato completo dell'analisi nella pagina", async ({ page }) => {
  const email = uniqueEmail("dashboard");
  await register(page, email);
  await seedBills(email, 12);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByText("12 documenti").first()).toBeVisible();
  // Il più recente (indice 0) è il primo; importo e fornitore dal riepilogo.
  await expect(page.getByText("Fornitore 1", { exact: true })).toBeVisible();
  await expect(page.getByText("50,00 €").first()).toBeVisible();
  await expect(page.getByText("bolletta-11.pdf")).toHaveCount(0);

  await page.getByRole("button", { name: "Mostra altri 2 di 2" }).click();
  await expect(page.getByText("bolletta-12.pdf")).toBeVisible();

  // L'HTML e il payload RSC non contengono campi dell'analisi non mostrati.
  expect(await page.content()).not.toContain(SENSITIVE_MARKER);
});

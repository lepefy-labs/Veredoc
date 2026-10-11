import { expect, test } from "@playwright/test";
import { PASSWORD, login, register, testIp, uniqueEmail } from "./helpers";

test.describe("accesso e account", () => {
  test("pagine protette: ritorno alla destinazione dopo il login", async ({ page }) => {
    const email = uniqueEmail("redirect");
    await register(page, email);

    await page.goto("/analyze?id=documento-di-prova");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fanalyze%3Fid%3Ddocumento-di-prova/);
    await login(page, email);
    await expect(page).toHaveURL(/\/analyze\?id=documento-di-prova$/);
  });

  test("registrazione, login con maiuscole e pagina account con email e stato", async ({ page }) => {
    const email = uniqueEmail("account");
    await register(page, email);
    await expect(page.getByText(/Registrazione ricevuta/)).toBeVisible();

    await login(page, email.toUpperCase());
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Carica il tuo primo documento per iniziare")).toBeVisible();

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account", level: 1 })).toBeVisible();
    await expect(page.getByRole("main").getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByText("Da confermare")).toBeVisible();
    await expect(page.getByText(/Analisi utilizzate questo mese/)).toBeVisible();
  });

  test("registrazione con email già usata: stessa risposta, nessun secondo account", async ({ page, request }) => {
    const email = uniqueEmail("dup");
    await register(page, email);
    const headers = { "x-forwarded-for": testIp() };
    const first = await request.post("/api/auth/register", { headers, data: { email, password: PASSWORD, acceptTerms: true } });
    const second = await request.post("/api/auth/register", { headers, data: { email: email.toUpperCase(), password: "Altra-password-1", acceptTerms: true } });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    expect(await second.json()).toEqual(await first.json());

    const withoutConsent = await request.post("/api/auth/register", { headers, data: { email: uniqueEmail("noconsent"), password: PASSWORD } });
    expect(withoutConsent.status()).toBe(400);
  });

  test("cambio password: sessioni chiuse e nuova password attiva", async ({ page }) => {
    const email = uniqueEmail("pwd");
    await register(page, email);
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/account");
    await page.getByRole("button", { name: "Cambia password" }).click();
    await page.getByLabel("Password attuale").fill(PASSWORD);
    await page.getByLabel("Nuova password", { exact: true }).fill("Nuova-password-456");
    await page.getByLabel("Conferma nuova password").fill("Nuova-password-456");
    await page.getByRole("button", { name: "Salva nuova password" }).click();

    await expect(page).toHaveURL(/\/login\?passwordChanged=1/);
    await expect(page.getByText(/Password aggiornata/)).toBeVisible();

    await login(page, email, PASSWORD);
    await expect(page.getByText("Email o password non corretti.")).toBeVisible();
    await login(page, email, "Nuova-password-456");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("esportazione dati in JSON", async ({ page }) => {
    const email = uniqueEmail("export");
    await register(page, email);
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    const response = await page.request.get("/api/account/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toMatch(/attachment; filename="veredoc-dati-/);
    const data = await response.json();
    expect(data.format).toBe("veredoc-export-v1");
    expect(data.account.email).toBe(email);
    expect(data.profiles).toHaveLength(1);
    expect(JSON.stringify(data)).not.toMatch(/password|\$2[aby]\$/);
  });

  test("profili: creazione, rinomina ed eliminazione di un profilo vuoto", async ({ page }) => {
    const email = uniqueEmail("profili");
    await register(page, email);
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/account");
    await page.getByRole("button", { name: "+ Nuovo profilo" }).click();
    await page.getByLabel("Nome profilo").fill("Casa al mare");
    await page.getByRole("button", { name: "Crea" }).click();
    await expect(page.getByText("Casa al mare")).toBeVisible();

    const row = page.getByRole("listitem").filter({ hasText: "Casa al mare" });
    await row.getByRole("button", { name: "Rinomina" }).click();
    await page.getByLabel("Nuovo nome per Casa al mare").fill("Casa in montagna");
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Casa in montagna")).toBeVisible();

    const renamed = page.getByRole("listitem").filter({ hasText: "Casa in montagna" });
    await renamed.getByRole("button", { name: "Elimina" }).click();
    await renamed.getByRole("alertdialog").getByRole("button", { name: "Elimina" }).click();
    await expect(page.getByText("Casa in montagna")).toHaveCount(0);
    // Il profilo predefinito non offre l'eliminazione.
    await expect(page.getByRole("listitem").filter({ hasText: "predefinito" }).getByRole("button", { name: "Elimina" })).toHaveCount(0);
  });

  test("troppi tentativi di accesso: messaggio dedicato", async ({ page }) => {
    const email = uniqueEmail("ratelimit");
    await register(page, email);
    for (let attempt = 0; attempt < 10; attempt++) {
      await login(page, email, `sbagliata-${attempt}`);
      await expect(page.getByText("Email o password non corretti.")).toBeVisible();
    }
    await login(page, email, PASSWORD);
    await expect(page.getByText(/Troppi tentativi di accesso/)).toBeVisible();
  });
});

test.describe("mobile", () => {
  test("@mobile account raggiungibile dalla barra in basso e logout", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo viewport mobile");
    const email = uniqueEmail("mobile");
    await register(page, email);
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("navigation", { name: "Navigazione app" }).getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("main").getByText(email, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Esci dall'account" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

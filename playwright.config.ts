import { defineConfig, devices } from "@playwright/test";

// Test end-to-end su build di produzione (`pnpm build` prima di `pnpm test:e2e`)
// e Postgres reale con schema da `prisma db push` (vedi scripts/e2e-env.sh e CI).
// Nessuna dipendenza esterna: Storage, AI ed email non vengono chiamati da questi flussi.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_TRUST_HOST: "true",
      NEXTAUTH_URL: baseURL,
      // Nessun invio email reale durante i test.
      BREVO_API_KEY: "",
      NOTIFICATIONS_ENABLED: "false",
      OPS_ALERT_EMAIL: "",
    },
  },
});

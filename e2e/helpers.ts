import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password-e2e-123";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// Ogni test simula un client diverso: il rate limit per IP (5 registrazioni/ora) resta attivo
// senza bloccare la suite. In produzione x-forwarded-for è impostato da Vercel.
export function testIp(): string {
  return `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
}

export async function register(page: Page, email: string, password = PASSWORD) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
  await page.goto("/register");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /registr|crea/i }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /accedi/i }).click();
}

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { consumeRateLimits } from "@/lib/security/rate-limit";
import { ALERT_WINDOW_SECONDS, renderOpsAlert, shouldAlert, type AlertFields } from "@/lib/observability/alert-core";
import { isDeliverableEmail } from "@/lib/notifications/config";

const ALERT_RULE = { name: "ops-alert", limit: 1, windowSeconds: ALERT_WINDOW_SECONDS };

export async function sendOpsAlert(event: string, fields: AlertFields): Promise<void> {
  const to = process.env.OPS_ALERT_EMAIL?.trim();
  if (!isDeliverableEmail(to) || !shouldAlert(event)) return;

  const limit = await consumeRateLimits((query) => prisma.$queryRaw<Array<{ count: number }>>(query), [
    { rule: ALERT_RULE, subject: event },
  ]);
  // Senza rate limit verificabile non si invia: meglio un avviso perso che una raffica di email.
  if (!limit.enforced || !limit.allowed) return;

  const email = renderOpsAlert({
    event,
    fields,
    occurredAt: new Date(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  });
  await sendTransactionalEmail({ to, ...email, tags: ["ops-alert"] });
}

// Programmato con after() quando c'è una richiesta in corso (la funzione resta viva fino
// all'invio), altrimenti eseguito senza attesa.
export function scheduleOpsAlert(event: string, fields: AlertFields): void {
  const task = () => sendOpsAlert(event, fields).catch((error) => {
    console.error(JSON.stringify({ service: "veredoc", event: "ops_alert.failed", error: error instanceof Error ? error.name : "unknown" }));
  });
  try {
    after(task);
  } catch {
    void task();
  }
}

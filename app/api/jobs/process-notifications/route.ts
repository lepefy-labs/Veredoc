// POST /api/jobs/process-notifications
// Job server-to-server (n8n, ogni minuto): accoda gli avvisi di attesa prolungata e invia
// le email transazionali dovute. Idempotente e sicuro con chiamate concorrenti
// (claim atomico con lease). La risposta contiene solo contatori, nessun dato personale.

import { NextRequest, NextResponse } from "next/server";
import { runNotificationDispatch } from "@/lib/notifications/dispatcher";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";
import { isJobRequestAuthorized } from "@/lib/security/access";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  try {
    const result = await runNotificationDispatch({ enqueueDelayed: true });
    if (result.skipped) {
      logOperationalEvent("job.process_notifications.skipped", { reason: result.reason }, "warn");
      return NextResponse.json({ success: true, skipped: true, reason: result.reason });
    }

    const { skipped: _skipped, ...summary } = result;
    void _skipped;
    const level = summary.crashed + summary.unconfirmed > 0
      ? "error"
      : summary.failed + summary.retryScheduled > 0 ? "warn" : "info";
    logOperationalEvent("job.process_notifications.completed", { ...summary }, level);
    return NextResponse.json({ success: true, skipped: false, ...summary });
  } catch (error) {
    logOperationalEvent("job.process_notifications.failed", { error: toSafeErrorMessage(error, 200) }, "error");
    return NextResponse.json({ success: false, error: "Elaborazione notifiche non riuscita." }, { status: 500 });
  }
}

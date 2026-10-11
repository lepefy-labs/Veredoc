import type { Instrumentation } from "next";

// Avvisi operativi (solo runtime Node): eventi di log di livello error e errori server non gestiti.
// Senza OPS_ALERT_EMAIL non viene inviato nulla.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ setOperationalErrorHook }, { scheduleOpsAlert }] = await Promise.all([
    import("@/lib/observability/operations"),
    import("@/lib/observability/alerts"),
  ]);
  setOperationalErrorHook((event, fields) => scheduleOpsAlert(event, fields));
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sendOpsAlert } = await import("@/lib/observability/alerts");
  // Solo percorso (senza query string, che può contenere token) e tipo di errore.
  await sendOpsAlert("request.unhandled_error", {
    path: request.path.split("?")[0],
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
    errorName: error instanceof Error ? error.name : "unknown",
    digest: (error as { digest?: string }).digest ?? null,
  }).catch(() => undefined);
};

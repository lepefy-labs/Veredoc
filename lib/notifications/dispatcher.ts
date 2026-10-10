// Adapter Prisma/Brevo del dispatcher notifiche.
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";
import {
  DELAYED_NOTICE_MAX_AGE_SECONDS,
  getAppBaseUrl,
  getDelayedThresholdSeconds,
  isDelayedNoticeEnabled,
  isDeliverableEmail,
  isEmailProviderConfigured,
  isNotificationOutboxEnabled,
} from "@/lib/notifications/config";
import { getAnalysisCycle } from "@/lib/notifications/events";
import { renderAnalysisEmail } from "@/lib/notifications/templates";
import {
  claimNotificationsSql,
  enqueueDelayedNoticesSql,
  finishNotificationSql,
  markSendStartedSql,
  markSentSql,
  purgeNotificationsSql,
  rescheduleNotificationSql,
  type ClaimedNotificationRow,
} from "@/lib/notifications/notification-sql";
import {
  createNotificationDispatcher,
  type DispatchSummary,
  type NotificationStore,
} from "@/lib/notifications/dispatcher-core";

const RETENTION_DAYS = 90;

const store: NotificationStore = {
  enqueueDelayed: (input) => prisma.$executeRaw(enqueueDelayedNoticesSql(input)),
  claim: (input) => prisma.$queryRaw<ClaimedNotificationRow[]>(claimNotificationsSql(input)),
  async loadContext(row) {
    const [document, user] = await Promise.all([
      prisma.document.findUnique({
        where: { id: row.documentId },
        select: { status: true, deletedAt: true, type: true, analysis: true },
      }),
      prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } }),
    ]);
    return {
      document: document
        ? { status: document.status, deletedAt: document.deletedAt, type: document.type, cycle: getAnalysisCycle(document.analysis) }
        : null,
      recipientEmail: user?.email ?? null,
    };
  },
  markSendStarted: (input) => prisma.$executeRaw(markSendStartedSql(input)),
  markSent: (input) => prisma.$executeRaw(markSentSql(input)),
  reschedule: (input) => prisma.$executeRaw(rescheduleNotificationSql(input)),
  finish: (input) => prisma.$executeRaw(finishNotificationSql(input)),
  purge: () => prisma.$executeRaw(purgeNotificationsSql({ retentionDays: RETENTION_DAYS, limit: 500 })),
};

const dispatch = createNotificationDispatcher({
  store,
  send: (email) => sendTransactionalEmail(email),
  render: (input) => renderAnalysisEmail({ ...input, baseUrl: getAppBaseUrl() }),
  isDeliverableEmail,
  get delayedNotice() {
    return {
      enabled: isDelayedNoticeEnabled(),
      thresholdSeconds: getDelayedThresholdSeconds(),
      maxAgeSeconds: DELAYED_NOTICE_MAX_AGE_SECONDS,
    };
  },
  log: logOperationalEvent,
});

export type NotificationDispatchResult =
  | ({ skipped: false } & DispatchSummary)
  | { skipped: true; reason: "notifications_disabled" | "email_not_configured" };

export async function runNotificationDispatch(options: {
  documentId?: string | null;
  enqueueDelayed?: boolean;
} = {}): Promise<NotificationDispatchResult> {
  if (!isNotificationOutboxEnabled()) return { skipped: true, reason: "notifications_disabled" };
  // Senza chiave API le righe restano PENDING e verranno inviate quando il provider sarà configurato.
  if (!isEmailProviderConfigured()) return { skipped: true, reason: "email_not_configured" };
  const summary = await dispatch(options);
  return { skipped: false, ...summary };
}

// Invio immediato dopo una transizione finale del worker. Non lancia mai:
// un problema email non deve influire sull'analisi; il job schedulato riprende le righe rimaste.
export async function dispatchDocumentNotifications(documentId: string): Promise<void> {
  try {
    const result = await runNotificationDispatch({ documentId });
    if (!result.skipped && result.claimed > 0) {
      logOperationalEvent("notification.inline_dispatch", {
        documentId,
        claimed: result.claimed,
        sent: result.sent + result.deduplicated,
        retryScheduled: result.retryScheduled,
      });
    }
  } catch (error) {
    logOperationalEvent("notification.inline_dispatch_failed", {
      documentId,
      error: toSafeErrorMessage(error, 200),
    }, "warn");
  }
}

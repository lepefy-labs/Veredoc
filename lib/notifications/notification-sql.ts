import { Prisma } from "@prisma/client";
import { buildNotificationEventKey, eventKeyPrefix, type NotificationIntent } from "./events.ts";

// Query SQL della NotificationOutbox. Testate su Postgres reale in-process (PGlite).
//
// - Gli eventi COMPLETED/FAILED sono inseriti nella STESSA istruzione che porta il
//   documento in DONE/ERROR (CTE con UPDATE ... RETURNING): o avvengono entrambi o nessuno.
// - ON CONFLICT ("eventKey") DO NOTHING rende idempotente la creazione dell'evento.
// - Il claim usa FOR UPDATE SKIP LOCKED + lease con token: dispatcher concorrenti
//   non prendono mai la stessa riga; un lease scaduto rende la riga di nuovo reclamabile.

// Documenti caricati prima di questa soglia non generano email quando vengono chiusi
// (es. recovery di documenti storici bloccati): nessuna notifica retroattiva.
export const NOTIFIABLE_DOCUMENT_MAX_AGE_HOURS = 48;

// Avvolge un UPDATE di "Document" (senza RETURNING) e accoda l'evento solo se l'UPDATE
// ha modificato la riga. Restituisce una riga { rows } con il numero di documenti aggiornati.
export function withOutboxEventSql(update: Prisma.Sql, documentId: string, intent: NotificationIntent): Prisma.Sql {
  const eventKey = buildNotificationEventKey(intent.eventType, documentId, intent.cycle);
  return Prisma.sql`
    WITH updated AS (
      ${update}
      RETURNING "id", "userId", "createdAt"
    ),
    queued AS (
      INSERT INTO "NotificationOutbox"
        ("id", "userId", "documentId", "eventType", "eventKey", "analysisCycle", "status", "nextAttemptAt", "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, "userId", "id", ${intent.eventType}::"NotificationEventType", ${eventKey}, ${intent.cycle},
             'PENDING'::"NotificationStatus", now(), now(), now()
      FROM updated
      WHERE ${intent.cycle} > 0
         OR "createdAt" > now() - make_interval(hours => ${NOTIFIABLE_DOCUMENT_MAX_AGE_HOURS})
      ON CONFLICT ("eventKey") DO NOTHING
      RETURNING 1
    )
    SELECT (SELECT count(*) FROM updated)::int AS "rows"`;
}

// Accoda l'avviso di attesa per i documenti ancora PENDING/PROCESSING il cui ciclo di
// analisi è iniziato da almeno `thresholdSeconds` e da non più di `maxAgeSeconds`.
// Inizio ciclo = analysis._job.cycleStartedAt (riprova manuale) oppure createdAt (upload):
// gli aggiornamenti generici del record (updatedAt) non spostano la soglia.
export function enqueueDelayedNoticesSql(input: {
  thresholdSeconds: number;
  maxAgeSeconds: number;
  limit: number;
}): Prisma.Sql {
  const prefix = eventKeyPrefix("ANALYSIS_DELAYED");
  return Prisma.sql`
    WITH candidates AS (
      SELECT d."id",
             d."userId",
             COALESCE((d."analysis" -> '_job' ->> 'manualRetries')::int, 0) AS "cycle",
             COALESCE(
               CASE WHEN (d."analysis" -> '_job' ->> 'cycleStartedAt') ~ '^\\d{4}-\\d{2}-\\d{2}T'
                    THEN (d."analysis" -> '_job' ->> 'cycleStartedAt')::timestamptz END,
               d."createdAt"
             ) AS "startedAt"
      FROM "Document" d
      WHERE d."status" IN ('PENDING'::"AnalysisStatus", 'PROCESSING'::"AnalysisStatus")
        AND d."deletedAt" IS NULL
        AND d."updatedAt" > now() - make_interval(secs => ${input.maxAgeSeconds})
    )
    INSERT INTO "NotificationOutbox"
      ("id", "userId", "documentId", "eventType", "eventKey", "analysisCycle", "status", "nextAttemptAt", "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, c."userId", c."id", 'ANALYSIS_DELAYED'::"NotificationEventType",
           ${prefix} || ':' || c."id" || ':' || c."cycle", c."cycle",
           'PENDING'::"NotificationStatus", now(), now(), now()
    FROM candidates c
    WHERE c."startedAt" <= now() - make_interval(secs => ${input.thresholdSeconds})
      AND c."startedAt" > now() - make_interval(secs => ${input.maxAgeSeconds})
    ORDER BY c."startedAt" ASC
    LIMIT ${input.limit}
    ON CONFLICT ("eventKey") DO NOTHING`;
}

export interface ClaimedNotificationRow {
  id: string;
  userId: string;
  documentId: string;
  eventType: "ANALYSIS_DELAYED" | "ANALYSIS_COMPLETED" | "ANALYSIS_FAILED";
  analysisCycle: number;
  attempts: number;
  previousStatus: "PENDING" | "SENDING";
  lastSendStartedAt: Date | null;
  ambiguousSince: Date | null;
}

const dueCondition = Prisma.sql`(
  ("status" = 'PENDING'::"NotificationStatus" AND "nextAttemptAt" <= now())
  OR ("status" = 'SENDING'::"NotificationStatus" AND "leaseExpiresAt" < now())
)`;

export function claimNotificationsSql(input: {
  leaseId: string;
  leaseSeconds: number;
  limit: number;
  documentId?: string | null;
}): Prisma.Sql {
  const documentFilter = input.documentId
    ? Prisma.sql`AND "documentId" = ${input.documentId}`
    : Prisma.empty;
  return Prisma.sql`
    WITH due AS (
      SELECT "id", "status" AS "previousStatus"
      FROM "NotificationOutbox"
      WHERE ${dueCondition} ${documentFilter}
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${input.limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "NotificationOutbox" o
    SET "status" = 'SENDING'::"NotificationStatus",
        "leaseId" = ${input.leaseId},
        "leaseExpiresAt" = now() + make_interval(secs => ${input.leaseSeconds}),
        "attempts" = o."attempts" + 1,
        "updatedAt" = now()
    FROM due
    WHERE o."id" = due."id"
    RETURNING o."id", o."userId", o."documentId", o."eventType"::text AS "eventType", o."analysisCycle",
              o."attempts", due."previousStatus"::text AS "previousStatus",
              o."lastSendStartedAt", o."ambiguousSince"`;
}

function leaseGuard(id: string, leaseId: string): Prisma.Sql {
  return Prisma.sql`"id" = ${id} AND "status" = 'SENDING'::"NotificationStatus" AND "leaseId" = ${leaseId}`;
}

// Registrato immediatamente prima della chiamata al provider: se il worker muore dopo,
// il recupero del lease sa che l'esito dell'invio è ambiguo.
export function markSendStartedSql(input: { id: string; leaseId: string; ambiguousSince: Date | null }): Prisma.Sql {
  return Prisma.sql`
    UPDATE "NotificationOutbox"
    SET "lastSendStartedAt" = now(),
        "ambiguousSince" = COALESCE("ambiguousSince", ${input.ambiguousSince}::timestamptz),
        "updatedAt" = now()
    WHERE ${leaseGuard(input.id, input.leaseId)}`;
}

export function markSentSql(input: { id: string; leaseId: string; providerMessageId: string | null }): Prisma.Sql {
  return Prisma.sql`
    UPDATE "NotificationOutbox"
    SET "status" = 'SENT'::"NotificationStatus",
        "sentAt" = now(),
        "providerMessageId" = ${input.providerMessageId},
        "lastErrorCode" = NULL,
        "leaseId" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = now()
    WHERE ${leaseGuard(input.id, input.leaseId)}`;
}

// Ritenta più tardi. `ambiguous` = il provider potrebbe aver accettato il messaggio:
// lastSendStartedAt resta valorizzato e ambiguousSince fissa l'inizio della finestra
// entro cui il riuso dell'idempotencyKey protegge dai duplicati.
export function rescheduleNotificationSql(input: {
  id: string;
  leaseId: string;
  delaySeconds: number;
  errorCode: string;
  ambiguous: boolean;
}): Prisma.Sql {
  const ambiguity = input.ambiguous
    ? Prisma.sql`"ambiguousSince" = COALESCE("ambiguousSince", "lastSendStartedAt", now()),`
    : Prisma.sql`"lastSendStartedAt" = NULL,`;
  return Prisma.sql`
    UPDATE "NotificationOutbox"
    SET "status" = 'PENDING'::"NotificationStatus",
        "nextAttemptAt" = now() + make_interval(secs => ${input.delaySeconds}),
        "lastErrorCode" = ${input.errorCode},
        ${ambiguity}
        "leaseId" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = now()
    WHERE ${leaseGuard(input.id, input.leaseId)}`;
}

export function finishNotificationSql(input: {
  id: string;
  leaseId: string;
  status: "FAILED" | "CANCELLED";
  errorCode: string;
}): Prisma.Sql {
  return Prisma.sql`
    UPDATE "NotificationOutbox"
    SET "status" = ${input.status}::"NotificationStatus",
        "lastErrorCode" = ${input.errorCode},
        "leaseId" = NULL,
        "leaseExpiresAt" = NULL,
        "updatedAt" = now()
    WHERE ${leaseGuard(input.id, input.leaseId)}`;
}

// Retention: le righe chiuse servono solo a deduplicazione e diagnosi.
export function purgeNotificationsSql(input: { retentionDays: number; limit: number }): Prisma.Sql {
  return Prisma.sql`
    DELETE FROM "NotificationOutbox"
    WHERE "id" IN (
      SELECT "id" FROM "NotificationOutbox"
      WHERE "status" IN ('SENT'::"NotificationStatus", 'FAILED'::"NotificationStatus", 'CANCELLED'::"NotificationStatus")
        AND "updatedAt" < now() - make_interval(days => ${input.retentionDays})
      LIMIT ${input.limit}
    )`;
}

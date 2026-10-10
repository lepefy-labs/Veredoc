import { sendTransactionalEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/notifications/config";
import { logOperationalEvent } from "@/lib/observability/operations";
import {
  renderAccountDeletedNotice,
  renderChangeEmailConfirm,
  renderChangeEmailNotice,
  renderExistingAccountNotice,
  renderVerifyEmail,
} from "@/lib/account/email-templates";
import type { RenderedEmail } from "@/lib/notifications/templates";

type AccountEmailKind = "verify" | "change_confirm" | "change_notice" | "existing_account" | "account_deleted";

async function deliver(kind: AccountEmailKind, to: string, email: RenderedEmail): Promise<boolean> {
  const result = await sendTransactionalEmail({ to, ...email, tags: [`account-${kind.replace(/_/g, "-")}`] });
  if (!result.ok) logOperationalEvent("account.email_failed", { kind, errorCode: result.code }, "warn");
  return result.ok;
}

export const accountMailer = {
  verify: (to: string, token: string) => deliver("verify", to, renderVerifyEmail({ baseUrl: getAppBaseUrl(), token })),
  changeConfirm: (to: string, token: string) =>
    deliver("change_confirm", to, renderChangeEmailConfirm({ baseUrl: getAppBaseUrl(), token, newEmail: to })),
  changeNotice: (to: string) => deliver("change_notice", to, renderChangeEmailNotice({ baseUrl: getAppBaseUrl() })),
  existingAccount: (to: string) => deliver("existing_account", to, renderExistingAccountNotice({ baseUrl: getAppBaseUrl() })),
  accountDeleted: (to: string) => deliver("account_deleted", to, renderAccountDeletedNotice()),
};

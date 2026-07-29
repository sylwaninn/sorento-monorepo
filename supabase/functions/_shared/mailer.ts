import { env } from "@shared/env.ts";

export type SendResult = "sent" | "skipped_no_key" | "failed";

export interface EmailContent {
  subject: string;
  bodyHtml: string;
  /** Notification type the recipient can switch off, so the footer deep-links to it. */
  unsubscribeType?: string;
}

/**
 * One-click unsubscribe is mandatory on every email, and it has to land on the exact preference
 * the recipient wants to switch off rather than on a generic settings page. Exported with the
 * site URL passed in so the link can be asserted without a configured environment.
 */
export const unsubscribeFooter = (siteUrl: string, unsubscribeType: string | undefined): string => {
  const target = unsubscribeType
    ? `${siteUrl}/parametres?notification=${encodeURIComponent(unsubscribeType)}`
    : `${siteUrl}/parametres`;
  return `<p style="font-size:12px;color:#666"><a href="${target}">Ne plus recevoir ce type d'email</a></p>`;
};

/**
 * Sober by design: no deceased name in the subject, minimal body, one-click unsubscribe for
 * the exact notification type. Skips silently (not an error) when RESEND_API_KEY is unset:
 * local dev has no Resend account, and a missing key is not a delivery failure worth
 * retrying forever.
 */
export const sendEmail = async (to: string, content: EmailContent): Promise<SendResult> => {
  if (!env.resendApiKey) return "skipped_no_key";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Sorento <${env.resendFromEmail}>`,
        to,
        subject: content.subject,
        html: `${content.bodyHtml}${unsubscribeFooter(env.siteUrl, content.unsubscribeType)}`,
      }),
    });

    if (!response.ok) {
      console.error("sendEmail rejected by provider", response.status, await response.text());
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("sendEmail failed", error);
    return "failed";
  }
};

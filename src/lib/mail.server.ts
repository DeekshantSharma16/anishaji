import { getLiveContent } from "./content.server";
import { site } from "./site-config";

/**
 * Shared mail transport and house style.
 *
 * Two rules hold everywhere below.
 *
 * 1. Mail never breaks a booking. A missing API key, a Resend outage, a bad
 *    address — all of it returns false and logs. The appointment is already
 *    saved by the time we get here, and losing it because an email bounced
 *    would be a far worse failure than a missing confirmation.
 *
 * 2. Anything a visitor typed is escaped before it reaches the HTML. The
 *    practice inbox receives a name and a free-text note straight from a
 *    public form; without escaping, a stray angle bracket could rewrite the
 *    email the practitioner reads.
 *
 * Required env for live mail:
 *   RESEND_API_KEY=re_xxx
 *   MAIL_FROM="Wellness with Anisha <hello@wellnesswithanisha.com>"
 *   PRACTICE_INBOX=hello@wellnesswithanisha.com
 */

export type MailResult = { sent: boolean; reason?: string };

export type Mail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/** Escapes text destined for an HTML email body. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Where practice notifications go. Fixed in env, never editable from the browser. */
export function practiceInbox(): string {
  return process.env["PRACTICE_INBOX"] || site.email;
}

export function mailConfig() {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["MAIL_FROM"];
  return {
    hasApiKey: Boolean(key),
    /** Resend's shared sandbox sender only delivers to your own account address. */
    usingSandboxSender: !from,
    from: from || `${site.name} <onboarding@resend.dev>`,
    inbox: practiceInbox(),
  };
}

export async function send({ to, subject, html, replyTo }: Mail): Promise<MailResult> {
  const config = mailConfig();

  if (!config.hasApiKey) {
    console.info(`[mail:skipped] no RESEND_API_KEY — would have sent "${subject}" to ${to}`);
    return { sent: false, reason: "Email is not configured yet (RESEND_API_KEY is missing)." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["RESEND_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.from, to, subject, html, reply_to: replyTo }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[mail:failed]", response.status, detail);
      return { sent: false, reason: `Resend refused the message (${response.status}). ${detail}` };
    }
    return { sent: true };
  } catch (error) {
    console.error("[mail:error]", error);
    return { sent: false, reason: "Could not reach the email service." };
  }
}

/**
 * The wrapper every email shares. Colours are literal hex rather than the
 * site's CSS variables: mail clients do not support custom properties, and
 * several strip <style> blocks entirely, so everything has to be inline.
 */
export async function shell(body: string): Promise<string> {
  const { brand } = await getLiveContent();
  return `
<div style="font-family:Georgia,serif;background:#f4f4ef;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fbf7ef;padding:32px;border-radius:14px">
    <div style="font-size:22px;font-weight:700;color:#1b3328">${esc(brand.name)}</div>
    ${body}
    <hr style="border:none;border-top:1px solid #e2d9c8;margin:28px 0" />
    <div style="font-size:12px;color:#7d7365;line-height:1.7">
      ${esc(brand.address.street)}, ${esc(brand.address.locality)} ${esc(brand.address.postalCode)}<br />
      ${esc(brand.phoneDisplay)} · ${esc(brand.email)}<br />
      Reply to this email and it reaches the practice directly.
    </div>
  </div>
</div>`;
}

/** A labelled row, used by the detail tables in both confirmation emails. */
export function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#7d7365;width:38%;vertical-align:top">${esc(label)}</td>
      <td style="padding:8px 0;font-size:15px;color:#1b3328;vertical-align:top">${value}</td>
    </tr>`;
}

export function table(rows: string) {
  return `<table style="width:100%;border-collapse:collapse;margin:18px 0;border-top:1px solid #e2d9c8;border-bottom:1px solid #e2d9c8">${rows}</table>`;
}

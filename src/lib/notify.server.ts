import { getLiveContent } from "./content.server";
import { esc, practiceInbox, row, send, shell, table, type MailResult } from "./mail.server";
import { formatDateKey } from "./schedule";
import { site } from "./site-config";
import { mapsLinkFor } from "./content-schema";

/**
 * Booking email.
 *
 * Two messages go out per request, and they are deliberately different
 * documents rather than one template sent twice:
 *
 *   - The visitor gets what they need to show up: what, when, where, how to
 *     change it. No internal detail.
 *   - The practice inbox gets everything about the person: contact details,
 *     their note, when they submitted, and a link straight into the diary.
 *
 * The practice address is fixed in PRACTICE_INBOX, not in the CMS, so nobody
 * can redirect patient data by editing a text field in the admin panel.
 */

export type BookingMail = {
  client_name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  service: string;
  session_date: string;
  session_time: string;
  location: string;
  manage_token: string;
};

export async function sendBookingReceived(booking: BookingMail): Promise<{
  client: MailResult;
  practice: MailResult;
}> {
  const { brand } = await getLiveContent();
  const when = `${formatDateKey(booking.session_date)} at ${booking.session_time}`;
  const address = `${brand.address.street}, ${brand.address.locality} ${brand.address.postalCode}`;

  const client = await send({
    to: booking.email,
    subject: `We have your request — ${booking.service} on ${formatDateKey(booking.session_date)}`,
    replyTo: brand.email,
    html: await shell(`
      <p style="font-size:16px;color:#1b3328">Hello ${esc(booking.client_name)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        Thank you — your request is with us. We confirm within one working day, and you will get a
        second email once the time is held for you.
      </p>

      ${table(
        row("Session", esc(booking.service)) +
          row("Date and time", esc(when)) +
          row(
            "Where",
            booking.location
              ? esc(booking.location)
              : `${esc(address)}<br /><a href="${mapsLinkFor(brand)}" style="color:#8a4b2a">Open in Maps</a>`,
          ) +
          row("Booked under", `${esc(booking.client_name)}<br />${esc(booking.email)}`) +
          (booking.phone ? row("Phone", esc(booking.phone)) : "") +
          (booking.notes ? row("Your note", esc(booking.notes)) : ""),
      )}

      <p style="font-size:14px;color:#4a4239;margin-bottom:4px">Your private booking code:</p>
      <p style="font-family:monospace;font-size:18px;letter-spacing:2px;color:#8a4b2a;margin-top:0">
        ${esc(booking.manage_token)}
      </p>
      <p style="font-size:14px;color:#4a4239;line-height:1.6">
        Keep it somewhere you can find it. With that code you can
        <a href="${site.url}/#manage" style="color:#8a4b2a">move or cancel this session</a> yourself,
        at any hour, without emailing anyone.
      </p>
      <p style="font-size:14px;color:#4a4239;line-height:1.6">
        Come in something you can move in, and arrive five minutes early if this is your first
        visit. If anything changes, just reply to this email.
      </p>
    `),
  });

  const practice = await send({
    to: practiceInbox(),
    subject: `New request · ${booking.service} · ${booking.session_date} ${booking.session_time}`,
    // Replying to the notification writes straight back to the patient.
    replyTo: booking.email,
    html: await shell(`
      <p style="font-size:15px;color:#1b3328;margin-bottom:0"><strong>New booking request</strong></p>

      ${table(
        row("Name", esc(booking.client_name)) +
          row(
            "Email",
            `<a href="mailto:${esc(booking.email)}" style="color:#8a4b2a">${esc(booking.email)}</a>`,
          ) +
          row(
            "Phone",
            booking.phone
              ? `<a href="tel:${esc(booking.phone)}" style="color:#8a4b2a">${esc(booking.phone)}</a>`
              : "<span style='color:#a09585'>not given</span>",
          ) +
          row("Session", esc(booking.service)) +
          row("Date and time", esc(when)) +
          row("Location", esc(booking.location || address)) +
          row("Booking code", `<code>${esc(booking.manage_token)}</code>`) +
          row(
            "Requested at",
            esc(
              new Date().toLocaleString("en-IN", {
                timeZone: site.timeZone,
                dateStyle: "medium",
                timeStyle: "short",
              }),
            ),
          ),
      )}

      ${
        booking.notes
          ? `<p style="font-size:14px;color:#4a4239;background:#f1e9d9;padding:14px 16px;border-radius:8px;line-height:1.6">
               <strong>Their note:</strong><br />${esc(booking.notes)}
             </p>`
          : `<p style="font-size:13px;color:#a09585">They left no note.</p>`
      }

      <p style="font-size:14px">
        <a href="${site.url}/admin" style="color:#8a4b2a">Open the practice diary to confirm or decline</a>
      </p>
    `),
  });

  return { client, practice };
}

export async function sendBookingChanged(
  booking: BookingMail,
  kind: "rescheduled" | "cancelled" | "confirmed",
) {
  const { brand } = await getLiveContent();
  const when = `${formatDateKey(booking.session_date)} at ${booking.session_time}`;
  const address = `${brand.address.street}, ${brand.address.locality} ${brand.address.postalCode}`;

  const lines: Record<typeof kind, string> = {
    rescheduled: `Your session has moved to <strong>${esc(when)}</strong>.`,
    cancelled: `Your session on ${esc(formatDateKey(booking.session_date))} has been cancelled. Whenever you're ready, the diary is open again.`,
    confirmed: `You're confirmed for <strong>${esc(when)}</strong>. We look forward to seeing you.`,
  };

  const subjects: Record<typeof kind, string> = {
    rescheduled: `Moved — ${booking.service} is now ${formatDateKey(booking.session_date)}`,
    cancelled: `Cancelled — ${booking.service} on ${formatDateKey(booking.session_date)}`,
    confirmed: `Confirmed — ${booking.service} on ${formatDateKey(booking.session_date)}`,
  };

  const details =
    kind === "cancelled"
      ? ""
      : table(
          row("Session", esc(booking.service)) +
            row("Date and time", esc(when)) +
            row(
              "Where",
              `${esc(booking.location || address)}<br /><a href="${mapsLinkFor(brand)}" style="color:#8a4b2a">Open in Maps</a>`,
            ) +
            row("Booking code", `<code>${esc(booking.manage_token)}</code>`),
        );

  return send({
    to: booking.email,
    subject: subjects[kind],
    replyTo: brand.email,
    html: await shell(`
      <p style="font-size:16px;color:#1b3328">Hello ${esc(booking.client_name)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">${lines[kind]}</p>
      ${details}
      <p style="font-size:14px;color:#4a4239;line-height:1.6">
        Need to change it again? Use your code at
        <a href="${site.url}/#manage" style="color:#8a4b2a">${site.url}/#manage</a>, or just reply here.
      </p>
    `),
  });
}

export async function sendLeadMagnet(email: string) {
  const { brand } = await getLiveContent();
  return send({
    to: email,
    subject: "Your four-minute reset for desk spines",
    replyTo: brand.email,
    html: await shell(`
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        Three movements and one breath pattern for the space between meetings.
      </p>
      <ol style="font-size:15px;color:#4a4239;line-height:1.8">
        <li><strong>Open the front line.</strong> Hands behind the chair, chest forward, 5 slow breaths.</li>
        <li><strong>Unwind the mid-back.</strong> Seated rotation, one hand on the opposite knee, 5 each side.</li>
        <li><strong>Reset the neck.</strong> Chin gently back, not down. Hold 20 seconds, three times.</li>
        <li><strong>Then breathe.</strong> In for four, out for six, for two minutes. The exhale is the medicine.</li>
      </ol>
      <p style="font-size:14px;color:#4a4239">
        If something keeps catching, <a href="${site.url}/#book" style="color:#8a4b2a">book a session</a> and we'll look properly.
      </p>
    `),
  });
}

/** Used by the admin Email panel to prove delivery end to end. */
export async function sendTestEmail(to: string) {
  return send({
    to,
    subject: "Test email from your website",
    html: await shell(`
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        This is a test. If you are reading it, booking confirmations will reach people too.
      </p>
      <p style="font-size:13px;color:#7d7365">
        Sent from the Email tab in your admin panel.
      </p>
    `),
  });
}

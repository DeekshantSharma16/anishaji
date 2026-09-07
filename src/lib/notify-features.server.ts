import { esc, send, shell } from "./mail.server";
import { site } from "./site-config";
import { formatDateKey } from "./schedule";

/**
 * Mail for the newer features: intake forms, packages, and the waitlist.
 * Same Resend transport and house style as notify.server.ts — kept separate so
 * the original booking mail stays untouched. Without RESEND_API_KEY the
 * message is logged and the calling flow carries on.
 */

const button = (href: string, label: string) => `
  <p style="margin:26px 0">
    <a href="${href}" style="background:#8a4b2a;color:#fbf7ef;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:15px">${label}</a>
  </p>`;

/** Re-exported from mail.server so both modules agree on the destination. */
const practiceInbox = () => process.env["PRACTICE_INBOX"] || site.email;

/* ---------------------------------------------------------------- intake */

export async function sendIntakeInvite(input: {
  email: string;
  clientName: string;
  service: string;
  sessionDate: string;
  intakeToken: string;
}) {
  const url = `${site.url}/intake/${input.intakeToken}`;
  await send({
    to: input.email,
    subject: "Before we meet — a few questions",
    replyTo: site.email,
    html: await shell(`
      <p style="font-size:16px;color:#2e2820">Hello ${esc(input.clientName)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        Ahead of your ${esc(input.service)} on ${formatDateKey(input.sessionDate)}, please fill in a short
        health history. It takes about four minutes and means we can spend the session working
        rather than writing.
      </p>
      ${button(url, "Fill in the form")}
      <p style="font-size:13px;color:#7d7365">
        The link is private to you. If it doesn't open, paste this into your browser:<br />${url}
      </p>
    `),
  });
}

export async function sendIntakeReceived(input: {
  clientName: string;
  email: string;
  service: string;
  sessionDate: string;
}) {
  await send({
    to: practiceInbox(),
    subject: `Intake completed · ${esc(input.clientName)} · ${input.sessionDate}`,
    replyTo: input.email,
    html: await shell(`
      <p style="font-size:15px;color:#4a4239">
        <strong>${esc(input.clientName)}</strong> has completed their health history for
        ${esc(input.service)} on ${formatDateKey(input.sessionDate)}.
      </p>
      <p style="font-size:14px"><a href="${site.url}/admin" style="color:#8a4b2a">Read it in the diary</a></p>
    `),
  });
}

/* -------------------------------------------------------------- packages */

export async function sendPackageRequested(input: {
  clientName: string;
  email: string;
  label: string;
  sessions: number;
  code: string;
}) {
  await send({
    to: input.email,
    subject: `Your ${esc(input.label)} is reserved`,
    replyTo: site.email,
    html: await shell(`
      <p style="font-size:16px;color:#2e2820">Hello ${esc(input.clientName)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        We've noted your <strong>${esc(input.label)}</strong> — ${input.sessions} sessions. Anisha will
        confirm it personally and settle payment at your next visit; nothing is charged online.
      </p>
      <p style="font-size:14px;color:#4a4239">Your package code:</p>
      <p style="font-family:monospace;font-size:18px;letter-spacing:2px;color:#8a4b2a">${esc(input.code)}</p>
      <p style="font-size:14px;color:#4a4239">
        Quote it when you book and we'll draw a session from the bundle.
      </p>
    `),
  });

  await send({
    to: practiceInbox(),
    subject: `Package request · ${esc(input.label)} · ${esc(input.clientName)}`,
    replyTo: input.email,
    html: await shell(`
      <p style="font-size:15px;color:#4a4239">
        <strong>${esc(input.clientName)}</strong> (${esc(input.email)}) asked for the ${esc(input.label)}
        (${input.sessions} sessions). Code ${esc(input.code)}.
      </p>
      <p style="font-size:14px"><a href="${site.url}/admin" style="color:#8a4b2a">Activate it in the diary</a></p>
    `),
  });
}

export async function sendPackageActivated(input: {
  clientName: string;
  email: string;
  label: string;
  remaining: number;
  code: string;
}) {
  await send({
    to: input.email,
    subject: `Your ${esc(input.label)} is active`,
    replyTo: site.email,
    html: await shell(`
      <p style="font-size:16px;color:#2e2820">Hello ${esc(input.clientName)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        Your ${esc(input.label)} is now active with <strong>${input.remaining} sessions</strong> to use.
        Quote code <strong>${esc(input.code)}</strong> when you book.
      </p>
      ${button(`${site.url}/#book`, "Book your next session")}
    `),
  });
}

/* -------------------------------------------------------------- waitlist */

export async function sendWaitlistJoined(input: {
  clientName: string;
  email: string;
  sessionDate: string;
  sessionTime?: string | null;
}) {
  await send({
    to: input.email,
    subject: `You're on the waitlist for ${formatDateKey(input.sessionDate)}`,
    replyTo: site.email,
    html: await shell(`
      <p style="font-size:16px;color:#2e2820">Hello ${esc(input.clientName)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        We've added you to the waitlist for
        <strong>${formatDateKey(input.sessionDate)}</strong>${input.sessionTime ? ` at <strong>${input.sessionTime}</strong>` : ""}.
        If that slot frees up you'll be the first to hear — usually within minutes of a cancellation.
      </p>
      <p style="font-size:14px;color:#4a4239">
        You don't have to wait: the diary usually has openings later in the week.
      </p>
      ${button(`${site.url}/#book`, "See other times")}
    `),
  });

  await send({
    to: practiceInbox(),
    subject: `Waitlist · ${esc(input.clientName)} · ${input.sessionDate}`,
    replyTo: input.email,
    html: await shell(`
      <p style="font-size:15px;color:#4a4239">
        <strong>${esc(input.clientName)}</strong> (${esc(input.email)}) is waiting on
        ${formatDateKey(input.sessionDate)}${input.sessionTime ? ` at ${input.sessionTime}` : ""}.
      </p>
    `),
  });
}

export async function sendWaitlistOpening(input: {
  clientName: string;
  email: string;
  sessionDate: string;
  sessionTime: string;
}) {
  await send({
    to: input.email,
    subject: `A slot just opened on ${formatDateKey(input.sessionDate)}`,
    replyTo: site.email,
    html: await shell(`
      <p style="font-size:16px;color:#2e2820">Hello ${esc(input.clientName)},</p>
      <p style="font-size:15px;color:#4a4239;line-height:1.6">
        <strong>${input.sessionTime}</strong> on
        <strong>${formatDateKey(input.sessionDate)}</strong> has just come free. It's first come,
        first served, so book it now if it still suits.
      </p>
      ${button(`${site.url}/#book`, "Take this slot")}
    `),
  });
}

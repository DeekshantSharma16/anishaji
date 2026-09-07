import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Email diagnostics for the admin panel.
 *
 * Mail is the one part of the site that fails silently by design: a booking
 * must save even when Resend is down. That is correct, but it leaves the
 * practitioner with no way to know whether confirmations are actually going
 * out. These two handlers close that gap without anyone reading a server log.
 *
 * The status handler deliberately reports only whether each variable is SET.
 * It never returns the API key itself, not even partially.
 */

export const mailStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();

  const { mailConfig } = await import("./mail.server");
  const config = mailConfig();

  return {
    hasApiKey: config.hasApiKey,
    usingSandboxSender: config.usingSandboxSender,
    from: config.from,
    inbox: config.inbox,
  };
});

export const sendTestMail = createServerFn({ method: "POST" })
  .validator(z.object({ to: z.string().email() }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();

    const { sendTestEmail } = await import("./notify.server");
    const result = await sendTestEmail(data.to);

    if (!result.sent) {
      return { ok: false as const, reason: result.reason ?? "The email did not send." };
    }
    return { ok: true as const };
  });

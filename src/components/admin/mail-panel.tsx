import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { mailStatus, sendTestMail } from "@/lib/mail.functions";

/**
 * Shows, in plain language, whether booking emails are actually being
 * delivered — and lets the practitioner prove it with a real send rather than
 * trusting a green tick.
 */
export function MailPanel() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof mailStatus>> | null>(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    mailStatus()
      .then(setStatus)
      .catch(() => toast.error("Couldn't check the email settings."));
  }, []);

  const handleTest = async () => {
    setBusy(true);
    try {
      const result = await sendTestMail({ data: { to } });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      toast.success("Sent. Check that inbox, and the spam folder if it isn't there.");
    } catch {
      toast.error("That address doesn't look right.");
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-ink/60">
        <Loader2 className="size-4 animate-spin" /> Checking email settings…
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-2xl space-y-5">
      <div className="surface p-6">
        <h2 className="section-title flex items-center gap-2 text-lg">
          <Mail className="size-4 text-clay" /> Booking emails
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Every booking sends two emails: a confirmation with the date, time and location to the
          person who booked, and a full record of their details to the practice inbox.
        </p>

        <div className="mt-5 space-y-3">
          <Line
            ok={status.hasApiKey}
            title={status.hasApiKey ? "Email service connected" : "Email service not connected"}
            detail={
              status.hasApiKey
                ? "Confirmations are being sent."
                : "RESEND_API_KEY is missing, so nothing is being sent. Bookings still save normally."
            }
          />
          <Line
            ok={!status.usingSandboxSender}
            title={
              status.usingSandboxSender
                ? "Using the test sender address"
                : "Sending from your own domain"
            }
            detail={
              status.usingSandboxSender
                ? "MAIL_FROM is not set, so email goes out from Resend's shared test address. That only delivers to your own Resend account, not to patients. Set MAIL_FROM to an address on your verified domain."
                : status.from
            }
          />
          <Line
            ok
            title="Practice notifications go to"
            detail={`${status.inbox} — set by PRACTICE_INBOX, not editable here, so patient details cannot be redirected from the browser.`}
          />
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="section-title text-base">Send yourself a test</h3>
        <p className="mt-2 text-sm text-ink/60">
          The only way to be sure. If it arrives, patients will get theirs too.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="your@email.com"
            className="form-control max-w-xs"
          />
          <Button type="button" variant="ink" onClick={handleTest} disabled={busy || !to}>
            {busy ? <Loader2 className="animate-spin" /> : <Send className="size-4" />} Send test
          </Button>
        </div>
      </div>
    </div>
  );
}

function Line({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
          ok ? "bg-moss/15 text-moss" : "bg-destructive/12 text-destructive"
        }`}
      >
        {ok ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      </span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-ink/55">{detail}</div>
      </div>
    </div>
  );
}

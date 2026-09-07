import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Health-history forms. The link is a one-off token generated with the
 * booking, so a client never signs in and we never email their answers back
 * out. Answers land as JSONB against the booking and appear in the diary.
 */

const token = z.string().trim().min(10).max(80);

export const getIntakeContext = createServerFn({ method: "POST" })
  .validator(z.object({ token }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, service, session_date, session_time, status")
      .eq("intake_token", data.token)
      .maybeSingle();

    if (error) {
      console.error("Intake lookup failed", error);
      throw new Error("We could not open that form.");
    }
    if (!booking) return { found: false as const };

    const { data: existing } = await supabaseAdmin
      .from("intake_forms")
      .select("submitted_at")
      .eq("booking_id", booking.id)
      .maybeSingle();

    return {
      found: true as const,
      booking,
      submittedAt: existing?.submitted_at ?? null,
    };
  });

export const submitIntake = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token,
      answers: z.record(z.string().max(60), z.string().trim().max(1200)),
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { intakeQuestions } = await import("./intake-questions");
    const { sendIntakeReceived } = await import("./notify-features.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, email, service, session_date")
      .eq("intake_token", data.token)
      .maybeSingle();

    if (!booking) return { ok: false as const, reason: "That form link is no longer valid." };

    // Only keep keys we actually asked about, and enforce required answers.
    const allowed = new Set(intakeQuestions.map((question) => question.key));
    const answers: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.answers)) {
      if (allowed.has(key) && value) answers[key] = value;
    }

    const missing = intakeQuestions
      .filter((question) => question.required && !answers[question.key])
      .map((question) => question.label);

    if (missing.length) {
      return { ok: false as const, reason: `Please answer: ${missing.join(", ")}.` };
    }

    const { error } = await supabaseAdmin
      .from("intake_forms")
      .upsert(
        { booking_id: booking.id, answers, submitted_at: new Date().toISOString() },
        { onConflict: "booking_id" },
      );

    if (error) {
      console.error("Intake save failed", error);
      return { ok: false as const, reason: "We could not save your answers. Please try again." };
    }

    await sendIntakeReceived({
      clientName: booking.client_name,
      email: booking.email,
      service: booking.service,
      sessionDate: booking.session_date,
    });

    return { ok: true as const };
  });

/** Diary view of one booking's answers. */
export const adminIntakeFor = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: form } = await supabaseAdmin
      .from("intake_forms")
      .select("answers, submitted_at")
      .eq("booking_id", data.bookingId)
      .maybeSingle();

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("intake_token")
      .eq("id", data.bookingId)
      .maybeSingle();

    return {
      answers: (form?.answers ?? null) as Record<string, string> | null,
      submittedAt: form?.submitted_at ?? null,
      intakeToken: booking?.intake_token ?? null,
    };
  });

/** Re-send the intake link, for when the first email got lost. */
export const adminResendIntake = createServerFn({ method: "POST" })
  .validator(z.object({ bookingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendIntakeInvite } = await import("./notify-features.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, email, service, session_date, intake_token")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (!booking) return { ok: false as const, reason: "Booking not found." };

    let intakeToken = booking.intake_token;
    if (!intakeToken) {
      intakeToken = crypto.randomUUID().replaceAll("-", "");
      await supabaseAdmin
        .from("bookings")
        .update({ intake_token: intakeToken })
        .eq("id", booking.id);
    }

    await sendIntakeInvite({
      email: booking.email,
      clientName: booking.client_name,
      service: booking.service,
      sessionDate: booking.session_date,
      intakeToken,
    });

    return { ok: true as const };
  });

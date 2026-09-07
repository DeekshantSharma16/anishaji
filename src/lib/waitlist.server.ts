/**
 * Server-only waitlist helper, shared by the cancellation flow and the diary
 * so a freed slot always reaches the people waiting for it. Best-effort: a
 * mail failure here must never roll back the cancellation that caused it.
 */
export async function notifyWaitlistForSlot(sessionDate: string, sessionTime: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWaitlistOpening } = await import("./notify-features.server");

    const { data: entries } = await supabaseAdmin
      .from("waitlist_entries")
      .select("id, client_name, email, session_time")
      .eq("session_date", sessionDate)
      .eq("status", "waiting")
      .or(`session_time.is.null,session_time.eq.${sessionTime}`)
      .order("created_at", { ascending: true })
      .limit(10);

    if (!entries?.length) return 0;

    for (const entry of entries) {
      await sendWaitlistOpening({
        clientName: entry.client_name,
        email: entry.email,
        sessionDate,
        sessionTime,
      });
    }

    await supabaseAdmin
      .from("waitlist_entries")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .in(
        "id",
        entries.map((entry) => entry.id),
      );

    return entries.length;
  } catch (error) {
    console.error("Waitlist notification failed", error);
    return 0;
  }
}

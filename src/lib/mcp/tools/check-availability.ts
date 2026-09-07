import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { isOpenDay, times, todayKey, maxDateKey, formatDateKey } from "@/lib/schedule";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "check_availability",
  title: "Check availability",
  description:
    "Which appointment times are still free on a given date (YYYY-MM-DD). Returns only free/taken times — never any client details.",
  inputSchema: {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Date to check, as YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }) => {
    if (date < todayKey() || date > maxDateKey()) {
      throw new ToolError(
        `Pick a date between ${todayKey()} and ${maxDateKey()} — the diary only opens that far ahead.`,
      );
    }

    if (!isOpenDay(date)) {
      const payload = {
        date,
        label: formatDateKey(date),
        open: false,
        reason: "The practice is closed on Sundays and Mondays.",
        freeTimes: [] as string[],
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    const supabase = supabaseAnon();
    const [booked, blocked] = await Promise.all([
      supabase
        .from("bookings")
        .select("session_time")
        .eq("session_date", date)
        .in("status", ["pending", "confirmed"]),
      supabase.from("blocked_slots").select("block_time").eq("block_date", date),
    ]);

    if (booked.error || blocked.error) {
      throw new ToolError("Could not read the diary right now. Please try again.");
    }

    const dayClosed = (blocked.data ?? []).some((row) => row.block_time === null);
    const taken = new Set<string>([
      ...(booked.data ?? []).map((row) => row.session_time as string),
      ...(blocked.data ?? [])
        .map((row) => row.block_time as string | null)
        .filter((value): value is string => Boolean(value)),
    ]);

    const payload = {
      date,
      label: formatDateKey(date),
      open: !dayClosed,
      freeTimes: dayClosed ? [] : times.filter((time) => !taken.has(time)),
      takenTimes: dayClosed ? times : times.filter((time) => taken.has(time)),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

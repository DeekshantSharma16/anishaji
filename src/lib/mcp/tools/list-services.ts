import { defineTool } from "@lovable.dev/mcp-js";

import { services, openingHoursLabel, times } from "@/lib/schedule";
import { site } from "@/lib/site-config";

export default defineTool({
  name: "list_services",
  title: "List services",
  description:
    "List the treatments offered by the practice with duration, price and whether they run online, plus opening hours and the daily appointment times.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      practice: site.name,
      openingHours: openingHoursLabel,
      appointmentTimes: times,
      services: services.map((service) => ({
        slug: service.slug,
        name: service.name,
        duration: service.duration,
        priceInr: service.price,
        online: service.online,
        detail: service.detail,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

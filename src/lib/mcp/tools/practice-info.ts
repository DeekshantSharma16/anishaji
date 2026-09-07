import { defineTool } from "@lovable.dev/mcp-js";

import { site } from "@/lib/site-config";
import { openingHoursLabel } from "@/lib/schedule";
import { faqs } from "@/lib/faq-content";

export default defineTool({
  name: "practice_info",
  title: "Practice information",
  description:
    "Where the practice is, how to reach it, when it is open, and answers to the questions clients ask most often.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      name: site.name,
      tagline: site.tagline,
      description: site.description,
      website: site.url,
      email: site.email,
      phone: site.phoneDisplay,
      address: site.address,
      openingHours: openingHoursLabel,
      faqs: faqs.map((item) => ({ question: item.question, answer: item.answer })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

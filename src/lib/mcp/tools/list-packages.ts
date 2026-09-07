import { defineTool } from "@lovable.dev/mcp-js";

import { packageCatalog } from "@/lib/packages-catalog";

export default defineTool({
  name: "list_packages",
  title: "List session bundles",
  description:
    "List the multi-session bundles the practice offers, with the number of sessions, total price, per-session price and how long each bundle stays valid.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const payload = {
      packages: packageCatalog.map((item) => ({
        key: item.key,
        label: item.label,
        sessions: item.sessions,
        priceInr: item.price,
        perSessionInr: item.perSession,
        validityWeeks: item.validityWeeks,
        detail: item.detail,
        includes: item.includes,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});

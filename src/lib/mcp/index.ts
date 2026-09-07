import { defineMcp, type McpDefinitionInput } from "@lovable.dev/mcp-js";

import checkAvailability from "./tools/check-availability";
import listPackages from "./tools/list-packages";
import listServices from "./tools/list-services";
import practiceInfo from "./tools/practice-info";

export default defineMcp({
  name: "wellness-with-anisha",
  title: "Wellness with Anisha",
  version: "0.1.0",
  instructions:
    "Public tools for the Wellness with Anisha practice. Use `list_services` and `list_packages` for treatments, prices and bundles, `check_availability` to see which appointment times are free on a date, and `practice_info` for location, hours, contact details and FAQs. No client records are available through this server; sessions are booked on the practice website.",
  // The SDK's tool type declares outputSchema as required-but-undefinable, which
  // this project's exactOptionalPropertyTypes rejects; the values are correct.
  tools: [listServices, listPackages, checkAvailability, practiceInfo] as unknown as McpDefinitionInput["tools"],
});

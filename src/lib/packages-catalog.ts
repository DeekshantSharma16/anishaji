/**
 * Session bundles. Shared by the pricing section, the package request form,
 * the manage flow and the diary, so a change here is a change everywhere.
 * Money still changes hands at the studio — a package is a promise, not a
 * payment, until the practitioner marks it active.
 */

export type PackageDefinition = {
  key: string;
  label: string;
  sessions: number;
  price: number;
  perSession: number;
  detail: string;
  includes: string[];
  validityWeeks: number;
  featured?: boolean;
};

export const packageCatalog: PackageDefinition[] = [
  {
    key: "course-of-four",
    label: "Course of four",
    sessions: 4,
    price: 12600,
    perSession: 3150,
    detail: "For a pattern that needs consistent work. Saves roughly one session.",
    includes: [
      "Four sessions within twelve weeks",
      "Progress review at session three",
      "Priority rescheduling",
    ],
    validityWeeks: 12,
    featured: true,
  },
  {
    key: "course-of-five",
    label: "Course of five",
    sessions: 5,
    price: 15000,
    perSession: 3000,
    detail: "The full arc of a rehabilitation plan, at the lowest per-session rate.",
    includes: [
      "Five sessions within sixteen weeks",
      "Written home programme",
      "Priority rescheduling",
    ],
    validityWeeks: 16,
  },
  {
    key: "breath-programme",
    label: "Breath programme",
    sessions: 4,
    price: 7500,
    perSession: 1875,
    detail: "Four online breath-led sessions for sleep, anxiety, and recovery.",
    includes: ["Runs online", "Recorded practice for between sessions", "Weekly check-in"],
    validityWeeks: 10,
  },
];

export const findPackage = (key: string) => packageCatalog.find((item) => item.key === key);

export const packageKeys = packageCatalog.map((item) => item.key);

export const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

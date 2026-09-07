/**
 * The health-history questions asked before a first session. Kept as data so
 * the form, the email, and the diary view all read the same list — add a
 * question here and it appears in all three.
 */

export type IntakeQuestion = {
  key: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "choice" | "scale";
  options?: string[];
  required?: boolean;
  maxLength?: number;
};

export const intakeQuestions: IntakeQuestion[] = [
  {
    key: "main_concern",
    label: "What's bringing you in?",
    help: "The thing you'd most like to feel different after a few sessions.",
    type: "textarea",
    required: true,
    maxLength: 800,
  },
  {
    key: "duration",
    label: "How long has it been going on?",
    type: "choice",
    options: [
      "Less than a week",
      "A few weeks",
      "A few months",
      "Over a year",
      "On and off for years",
    ],
    required: true,
  },
  {
    key: "pain_level",
    label: "On a normal day, how strong is it?",
    help: "0 is nothing at all, 10 is the worst you can imagine.",
    type: "scale",
    required: true,
  },
  {
    key: "aggravates",
    label: "What makes it worse?",
    type: "text",
    maxLength: 300,
  },
  {
    key: "eases",
    label: "What eases it?",
    type: "text",
    maxLength: 300,
  },
  {
    key: "history",
    label: "Past injuries, surgeries, or scans",
    help: "Anything a hands-on practitioner should know about, even if it feels unrelated.",
    type: "textarea",
    maxLength: 800,
  },
  {
    key: "conditions",
    label: "Ongoing medical conditions",
    help: "For example blood pressure, diabetes, osteoporosis, pregnancy.",
    type: "textarea",
    maxLength: 600,
  },
  {
    key: "medication",
    label: "Medication and supplements",
    type: "text",
    maxLength: 400,
  },
  {
    key: "activity",
    label: "How does a typical week move?",
    help: "Desk hours, training, caring for others, standing all day — whatever is true.",
    type: "textarea",
    maxLength: 500,
  },
  {
    key: "sleep",
    label: "How is sleep at the moment?",
    type: "choice",
    options: ["Good", "Broken but manageable", "Poor", "Very poor"],
  },
  {
    key: "goal",
    label: "What would a good outcome look like for you?",
    type: "textarea",
    required: true,
    maxLength: 500,
  },
  {
    key: "emergency_contact",
    label: "Emergency contact (name and number)",
    type: "text",
    maxLength: 160,
  },
];

export const intakeQuestionMap = new Map(intakeQuestions.map((q) => [q.key, q]));

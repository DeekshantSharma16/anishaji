/**
 * The "From the notes" articles. File-based rather than database-backed, so
 * each one renders server-side, is crawlable, and needs no query on load.
 * To publish a new note, add an entry here.
 *
 * These four are carried over from the blog on wellnesswithanisha.com, with
 * their original titles, categories, slugs and publication dates.
 *
 * TODO(anisha): the saved copy of the old homepage only contained each post's
 * title, category and date. The bodies below were rewritten to match, so paste
 * the original article text over them if you want the exact wording back.
 */

import type { ImageKey } from "./images";

export type Note = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  image: ImageKey;
  imageAlt: string;
  /** Paragraphs and headings, kept simple on purpose. */
  body: ({ heading: string } | { paragraph: string } | { list: string[] })[];
};

export const notes: Note[] = [
  {
    slug: "why-practicing-meditation-daily-is-essential-for-your-well-being",
    title: "Why practicing meditation daily is essential for your well-being",
    category: "Meditation",
    excerpt:
      "A few quiet minutes each day changes how the nervous system handles everything that comes after.",
    publishedAt: "2025-06-11",
    readingMinutes: 4,
    image: "meditation",
    imageAlt: "A person meditating at sunrise above the clouds",
    body: [
      {
        paragraph:
          "Meditation is often described as something you either have time for or you do not. In practice it works the other way round. A short daily sit is what makes the rest of the day feel like it has room in it.",
      },
      { heading: "What daily practice actually does" },
      {
        paragraph:
          "Regular meditation trains attention and settles the stress response. Over weeks, that shows up as steadier sleep, a slower heart rate at rest, and a longer gap between something happening and you reacting to it. None of it is dramatic on any single day, which is exactly why consistency matters more than duration.",
      },
      { heading: "Where to begin" },
      {
        list: [
          "Start with ten minutes at the same time each day, rather than an hour once a week.",
          "Sit upright and comfortable. Discomfort becomes the only thing you can pay attention to.",
          "Let the exhale be longer than the inhale. It is the simplest signal that the body is safe.",
          "When the mind wanders, notice and return. The returning is the practice, not a failure of it.",
        ],
      },
      {
        paragraph:
          "If sitting alone is difficult at first, a guided practice or a structured program gives the mind something to hold on to while the habit forms.",
      },
    ],
  },
  {
    slug: "unlock-your-true-potential-with-the-happiness-program-by-art-of-living",
    title: "Unlock your true potential with the Happiness Program by Art of Living",
    category: "Programs",
    excerpt:
      "The Happiness Program teaches a breathing practice that keeps working long after the workshop ends.",
    publishedAt: "2025-06-11",
    readingMinutes: 5,
    image: "smiling-client",
    imageAlt: "A relaxed, smiling person outdoors in warm light",
    body: [
      {
        paragraph:
          "The Happiness Program is the Art of Living's foundational course, and the thing most people remember afterwards is not the theory. It is how differently they sleep that week.",
      },
      { heading: "What the program covers" },
      {
        paragraph:
          "Over a few guided sessions you learn practical breathing techniques, simple yoga, and a framework for handling the mind when it will not settle. The centrepiece is a rhythmic breathing practice you can carry home and repeat on your own, which is what makes the effect last rather than fade.",
      },
      { heading: "Who tends to benefit most" },
      {
        list: [
          "Anyone carrying persistent stress, restlessness, or poor sleep.",
          "People who have tried meditation and found sitting still on their own too difficult.",
          "Those who want a practice with structure and a community behind it.",
        ],
      },
      {
        paragraph:
          "The program runs regularly and is open to complete beginners. No prior yoga or meditation experience is needed.",
      },
    ],
  },
  {
    slug: "unlock-healing-inner-peace-transformative-yoga-sessions-with-dr-anisha",
    title: "Unlock healing and inner peace: transformative yoga sessions with Dr. Anisha",
    category: "Yoga",
    excerpt:
      "Yoga shaped around your body rather than a class plan, blending authentic practice with clinical understanding.",
    publishedAt: "2025-06-08",
    readingMinutes: 4,
    image: "portrait",
    imageAlt: "Dr. Anisha practising yoga outdoors in a garden",
    body: [
      {
        paragraph:
          "A yoga class built for a room of thirty people cannot account for your left shoulder. A session built around you can, and that difference is where most of the healing happens.",
      },
      { heading: "Clinical eye, traditional practice" },
      {
        paragraph:
          "Because these sessions are led by a practitioner trained in osteopathy and physiotherapy, the postures are chosen with your structure in mind. Where a joint needs protecting, it is protected. Where a pattern needs challenging, it is challenged. The tradition stays intact; the sequencing adapts.",
      },
      { heading: "What a session includes" },
      {
        list: [
          "Breath work to settle the nervous system before movement begins.",
          "Postures selected for your mobility, history, and goals.",
          "Guided meditation to close, so the calm is not left behind on the mat.",
        ],
      },
      {
        paragraph: "Sessions are available in person and online, individually or in small groups.",
      },
    ],
  },
  {
    slug: "osteopathy-a-natural-path-to-pain-relief-and-holistic-healing",
    title: "Osteopathy: a natural path to pain relief and holistic healing",
    category: "Therapies",
    excerpt:
      "Osteopathy treats the cause rather than the symptom, which is why the relief tends to hold.",
    publishedAt: "2025-06-08",
    readingMinutes: 5,
    image: "treatment-room",
    imageAlt: "A therapist's hands working on a client during a treatment session",
    body: [
      {
        paragraph:
          "Most people arrive pointing at one place. The lower back, the right shoulder, the base of the neck. It is almost never where the story starts.",
      },
      { heading: "Treating the line, not the location" },
      {
        paragraph:
          "Osteopathy looks at how weight travels through the body, from foot to pelvis to ribcage to head. A stiff ankle can reorganise everything above it. Treat only the back that hurts and the pain returns. Restore the ankle and the back stops needing to compensate.",
      },
      {
        paragraph:
          "Treatment is hands-on and gentle. There is no medication and no recovery period, and most people walk out moving more freely than they walked in.",
      },
      { heading: "What osteopathy helps with" },
      {
        list: [
          "Chronic back, neck, and shoulder pain, including desk-related patterns.",
          "Restricted movement after an injury that never fully resolved.",
          "Recurring headaches linked to posture and jaw or neck tension.",
          "Joint stiffness that has crept in gradually over years.",
        ],
      },
      { heading: "When to be seen medically first" },
      {
        list: [
          "Trauma, or pain that woke you and has not settled.",
          "Numbness, weakness, or changes in bladder or bowel function.",
          "Pain that does not change at all with position or movement.",
        ],
      },
      {
        paragraph:
          "In those cases you will be referred, and early. Osteopathy works best as part of a network of care rather than a substitute for it.",
      },
    ],
  },
];

export const findNote = (slug: string) => notes.find((note) => note.slug === slug);

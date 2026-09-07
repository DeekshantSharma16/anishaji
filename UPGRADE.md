# Practice site upgrade

Everything below is implemented, typechecks clean (`npx tsc --noEmit`), passes
lint, and builds (`npm run build`).

---

## 1. Set up before this runs properly

Add to your environment (there is now a `.env.example` listing all of them):

```
SUPABASE_SERVICE_ROLE_KEY=...     # already needed by the old code, was missing from .env
RESEND_API_KEY=re_...             # optional in dev, required for real emails
MAIL_FROM=Wellness with Anisha <hello@wellnesswithanisha.com>
PRACTICE_INBOX=hello@wellnesswithanisha.com
ADMIN_PASSCODE=<something long>   # unlocks /admin
ADMIN_SESSION_SECRET=<random 32+ chars>
```

Then run the new migration: `supabase/migrations/20260829130000_practice_upgrade.sql`.

Finally, open `src/lib/site-config.ts` and replace the placeholder address,
phone, and geo coordinates. They feed the Google structured data, so wrong
values are worse than none.

Without `RESEND_API_KEY` the site still works: emails are logged to the server
console instead of sent. Nothing fails.

---

## 2. Bugs that are now fixed

| Bug | What was happening | Fix |
| --- | --- | --- |
| Manage flow was dead | The confirmation showed `booking.id.slice(0,8)` but lookup queried `manage_token`. The code shown could never find the booking. | The real `manage_token` is returned, displayed, copyable, and emailed. |
| Double bookings | No check against existing rows for a date. | A partial unique index on `(session_date, session_time)` for live statuses, plus a live availability check in the UI. The database is the real guard; the UI just makes the message friendly. |
| Past and closed dates | No `min` on the date input, Sundays accepted despite "Tue–Sat". | `validateSlot()` in `src/lib/schedule.ts` is enforced server-side on create and reschedule, and mirrored in the UI. |
| No confirmation email | `emailReady: false` and nothing else. | Resend integration for client confirmation, practice notification, reschedule, cancel, and confirm. |
| Open anon insert | RLS let anyone spray rows into `bookings`. | The anon INSERT grant and policy are dropped. All writes go through the service role in server functions. Plus a honeypot field and a 5-per-hour-per-IP limit. |
| `.env` committed | Not in `.gitignore`. | Added, with `.env.example` alongside. |
| No cancel | Only reschedule existed. | `cancelBooking` with a confirm step; the slot returns to the diary. |

---

## 3. New features

**Booking**
- Live availability: taken and blocked slots render struck through and disabled
- Slot counter ("4 of 6 free") and a fully-booked state
- Date picker bounded to today through 90 days, opening on the next working day
- Cancel with confirmation, and reschedule that checks the new slot first
- `.ics` download and a Google Calendar link on the confirmation card, with a 24h reminder baked into the `.ics`
- Copy-to-clipboard on the booking code
- Toast feedback throughout (using the `sonner` that was already installed but unused)

**Practitioner side** (`/admin`, new)
- Passcode login, signed httpOnly cookie, 12-hour session, `noindex`
- Diary grouped by day, filterable by status
- Confirm, cancel, mark complete — each triggering the right client email
- Block a single slot or a whole day off, and remove blocks
- Per-client history by email

**Content and SEO**
- The three "notes" cards were dummy divs. They are now real articles at `/notes` and `/notes/$slug`, server-rendered and crawlable, with full text written out
- `MedicalBusiness` JSON-LD with address, geo, hours, services and price catalog
- `FAQPage`, `Article`, and `BreadcrumbList` structured data
- `sitemap.xml`, a real `robots.txt` (disallowing `/admin`), per-route canonical URLs and OG tags
- A `/first-visit` page, which is the page people search for before booking anywhere
- Google Maps embed, directions link, and a proper hours/contact block

**Conversion**
- Three-question quiz that recommends a session and drops the visitor into the form with it preselected
- Sticky booking bar on mobile that hides itself when the form is on screen
- Pricing section with three packages and per-session rates
- Lead magnet (the desk-spine reset) emailed in exchange for an address, stored in a new `leads` table
- WhatsApp float button and links in the footer and visit section

**Polish and technical**
- Dark mode: toggle in the nav, warm dark palette rather than a grey inversion, respects the OS setting and remembers the choice
- The 214-line `index.tsx` is now thirteen components under `src/components/sections/`
- Fonts are actually loaded now — `styles.css` referenced Libre Baskerville, IBM Plex Sans and Caveat but nothing ever fetched them, so the site was rendering in fallback serif
- Accessibility: testimonial dots now use real `role="tab"` with arrow-key navigation, a skip link, `aria-controls` on the FAQ, and the auto-rotation pauses on hover/focus and stops entirely under `prefers-reduced-motion`
- Analytics helper (`track()`) wired to booking start, submit, failure, reschedule, cancel, quiz, lead capture, WhatsApp and calendar events. It's provider-agnostic and a no-op until you add Plausible or GA4
- PWA manifest with shortcuts to booking and managing
- `src/integrations/supabase/types.ts` extended with the new tables and columns

---

## 4. Deliberately not done, and why

- **Razorpay deposits.** This needs a merchant account, webhook endpoint, refund policy, and reconciliation. It is its own project, and half-built payments are worse than none. The pricing section says payment is taken at the studio, which is true today.
- **Hindi and Marathi.** Machine-translating clinical copy would embarrass the practice. This needs a translator and a routing decision (`/hi/...` subpaths vs a toggle). The structure supports adding it; the copy has to be human.
- **Service worker for offline.** The manifest is in, but a service worker on an SSR app that also serves a booking form risks caching stale availability. Worth doing carefully later, not as a bonus item.
- **Real Google reviews.** Needs a Places API key and a caching layer to stay within quota. Testimonials remain hardcoded until then.
- **WebP/AVIF images.** The three JPEGs are served through Lovable's asset pipeline, so the conversion belongs there rather than in this code.

---

## 5. Files worth reading first

- `src/lib/schedule.ts` — every scheduling rule, shared by client and server
- `src/lib/bookings.functions.ts` — the booking lifecycle
- `src/lib/admin.functions.ts` — the diary, with the auth model explained at the top
- `src/lib/site-config.ts` — the placeholders you need to replace

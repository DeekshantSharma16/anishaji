# Editing the website without touching code

There are two ways to change the words and colours on this site. Both edit the
same thing, so pick whichever suits the person doing the work.

## 1. The admin panel (for Dr. Anisha, or anyone non-technical)

Go to `/admin`, sign in with the practice passcode, and open the **Website
text** tab.

Each grey box is one part of the page. Click **Edit**, change what you like,
then press **Save and publish** at the top. The change is live immediately —
no deployment, no developer.

Buttons at the top:

| Button              | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| Save and publish    | Puts your changes live.                                          |
| Download a backup   | Saves a copy of everything to your computer, dated.               |
| Restore a backup    | Loads a downloaded copy back in. Still needs Save to go live.     |
| Start over          | Puts every word and colour back to the original. Cannot be undone.|

Before a big rewrite, press **Download a backup**. It takes one second and it
is the whole safety net.

## 2. The JSON file (for developers)

`src/content/site.content.json` holds the same information. It is the copy the
site ships with, and the copy **Start over** returns to. Editing it and
deploying changes the default, but note: if someone has saved edits in the
admin panel, those still win at runtime. Use **Start over** to hand control
back to the file.

## What lives where

- **Words, colours, menu links, service card text** — the content file / admin
  panel. Safe to change freely.
- **Prices, session lengths, opening days, appointment times** — `src/lib/schedule.ts`
  and `src/lib/packages-catalog.ts`. These are deliberately outside the CMS: the
  booking handler validates every request against them, so a typo here would
  mean a session someone can select but not actually book.
- **Photos** — drop a file with the same name into `public/images/`. The names
  are listed in `src/lib/images.ts`.
- **FAQ answers, notes articles** — `src/lib/faq-content.ts` and
  `src/lib/notes-content.ts`. These could move into the CMS later; they were
  left out to keep the first version of the editor short enough to actually
  read.

## Setting it up once

The admin panel needs the `site_content` table. Run the migration in
`supabase/migrations/20260907090000_site_content.sql`.

If the table is missing, or Supabase is unreachable, the site quietly falls
back to `src/content/site.content.json` and keeps working. Nothing breaks; the
Save button just reports an error.

---

# Keeping the free database awake

Supabase pauses a free project after seven days with **no database activity at
all**. It is not a time limit on the free tier — it is an idleness timer.

A live site never reaches seven days idle. Every visitor who opens the booking
form triggers an availability query, and every page load reads the site content.
One visitor a week is enough. So this only bites while the site is still being
built, or if it goes completely quiet.

## The fix

`/api/public/health` makes one very cheap database read and reports whether it
worked. `.github/workflows/keep-alive.yml` calls it every three days.

To turn it on, add a repository variable in GitHub:

**Settings → Secrets and variables → Actions → Variables → New variable**

```
Name:  SITE_URL
Value: https://wellnesswithanisha.com
```

That is the whole setup. You can trigger it manually from the Actions tab to
check it works before trusting the schedule.

If the database is already paused, the endpoint returns 503, the workflow run
fails, and GitHub emails you. That is deliberate: a keep-alive that fails
quietly is worse than none, because it removes the one moment you would
otherwise have noticed.

Once the site has steady traffic you can delete the workflow.

## What this does not fix

The free tier has **no backups**. Not delayed backups, none. This site stores
patient names, phone numbers, and health intake answers. If that data is lost,
it is lost.

The keep-alive solves the pausing. It does nothing about the backups. When the
practice is taking real bookings, Supabase Pro at $25/month is the honest
answer, and the daily backups are the reason — not the uptime.

In the meantime, the practitioner can export the diary from the admin panel
periodically, which is a manual backup of the part that matters most.

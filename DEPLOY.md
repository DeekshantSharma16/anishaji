# Deploying to Vercel

## 1. Import the repo

Push the project to GitHub, then in Vercel: **Add New → Project → Import** the
repository.

Vercel should detect the framework and use `npm run build`. Leave the output
directory blank — Nitro writes to `.vercel/output` and Vercel picks that up on
its own.

## 2. Environment variables

Add these under **Settings → Environment Variables**. Everything without a
`VITE_` prefix is server-only and never reaches the browser.

| Variable                    | Value                                              |
| --------------------------- | -------------------------------------------------- |
| `NITRO_PRESET`              | `vercel`                                           |
| `VITE_SITE_URL`             | `https://wellnesswithanisha.com`                   |
| `SUPABASE_URL`              | from Supabase → Project Settings → API             |
| `SUPABASE_SERVICE_ROLE_KEY` | same page. **Server-only. Never prefix with VITE_** |
| `ADMIN_PASSCODE`            | something long, for `/admin`                        |
| `ADMIN_SESSION_SECRET`      | 32+ random characters                               |
| `RESEND_API_KEY`            | from Resend                                         |
| `MAIL_FROM`                 | `Wellness with Anisha <hello@wellnesswithanisha.com>` |
| `PRACTICE_INBOX`            | where patient details land                          |

The browser never talks to Supabase directly in this app — every database read
happens server-side with the service-role key — so there are deliberately no
`VITE_SUPABASE_*` variables here. If you see a build guide asking for them, it
is assuming Supabase Auth, which this project does not use.

About `NITRO_PRESET`: this project's build config defaults to Cloudflare. Vercel
is normally auto-detected and the default is ignored, but setting it explicitly
costs nothing and removes a class of confusing build output.

About `VITE_SITE_URL`: set this **per environment**. In Production use the real
domain. In Preview, either leave it unset or point it at the preview URL —
otherwise a preview deployment sends booking emails whose reschedule links go to
the live site and edit real bookings.

## 3. Connect the domain

**Settings → Domains → Add** `wellnesswithanisha.com`, then add the DNS records
Vercel gives you at your registrar.

You will be adding two unrelated sets of DNS records at the same registrar: one
set from Vercel that points the domain at the site, and one set from Resend that
authorises the domain to send email. They do not conflict. Add both.

## 4. Then verify, in this order

1. **Site loads** on the real domain.
2. **`/admin` opens** and the passcode works. If it rejects a correct passcode,
   `ADMIN_SESSION_SECRET` is missing.
3. **Website text tab saves.** If Save fails, the `site_content` migration has
   not been run against Supabase.
4. **Email tab shows three green lines,** then send yourself a test.
5. **Make a real booking** through the public form. Confirm both emails arrive:
   the one to the person booking, and the one to `PRACTICE_INBOX`.
6. **Check the booking appears** in the admin diary.

## 5. Point the keep-alive at the live URL

In GitHub: **Settings → Secrets and variables → Actions → Variables**, set
`SITE_URL` to `https://wellnesswithanisha.com`. Then run the workflow once by
hand from the Actions tab.

## Two things that will bite you if you skip them

**Preview deployments hit the same database.** Every pull-request preview reads
and writes your live bookings, because there is only one Supabase project. Be
careful about testing bookings on a preview URL — they land in the real diary
and send real emails. If this becomes a problem, make a second free Supabase
project for previews and set the preview environment variables to point at it.

**`SUPABASE_SERVICE_ROLE_KEY` must never get a `VITE_` prefix.** That key bypasses
every access rule in the database. `VITE_` variables are compiled into the
JavaScript that ships to every visitor's browser. Prefixing it would publish
full read and write access to your patient data to anyone who opens devtools.

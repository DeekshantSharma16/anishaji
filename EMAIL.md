# Getting booking emails working

The emails are already built and wired in. Every booking request sends two
messages:

**To the person who booked** — session type, date, time, location with a Maps
link, the name and contact they booked under, their own note back to them,
their private booking code, and a link to move or cancel it themselves.

**To the practice inbox** — everything about the patient: name, clickable email
and phone, session, date, time, location, booking code, the exact time they
submitted, and their note. Replying to that email writes straight back to the
patient. There is a link into the diary to confirm or decline.

The practice address is fixed in an environment variable, not in the admin
panel. Nobody can redirect patient details by editing a text field in a browser.

Emails also go out when a booking is confirmed, moved, or cancelled, when the
health-history form is sent and returned, and for waitlist and bundle requests.

## What you need to set up

Nothing about this works until an email provider is connected. The site uses
[Resend](https://resend.com).

1. **Make a Resend account** and add your domain (`wellnesswithanisha.com`).
   Resend gives you a few DNS records to add wherever the domain is managed.
   This step is what stops your mail landing in spam, so it is worth doing
   properly rather than skipping.

2. **Create an API key** in Resend.

3. **Set three environment variables** on the host:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   MAIL_FROM=Wellness with Anisha <hello@wellnesswithanisha.com>
   PRACTICE_INBOX=hello@wellnesswithanisha.com
   ```

   - `MAIL_FROM` must be on the domain you verified in step 1.
   - `PRACTICE_INBOX` is where all patient details land. It can be a personal
     Gmail address if that is easier.

4. **Check it.** Go to `/admin` → **Email** tab. It tells you in plain language
   whether the service is connected and whether you are still on the test
   sender. Then send yourself a test email from that same screen.

## Two things that catch people out

**The test sender only mails you.** If `MAIL_FROM` is not set, Resend sends from
its shared sandbox address, which is allowed to deliver *only* to the email on
your own Resend account. A test to yourself will arrive and everything will look
fine, while patients get nothing. The Email tab flags this specifically.

**A failed email never fails a booking.** This is on purpose — losing an
appointment because a mail server hiccuped would be worse than a missing
confirmation. The booking is saved and visible in the diary either way. The
consequence is that a broken mail setup is silent, which is exactly why the
Email tab exists. Check it after any change to the domain or the keys.

## Changing the wording

The practice name, address, phone and email inside the emails come from the same
place as the website: `/admin` → **Website text**. Change them there and the next
email uses the new details, with no redeploy.

The body copy of the emails is still in `src/lib/notify.server.ts` and
`src/lib/notify-features.server.ts`. It was left in code on purpose: email HTML
breaks in ways a text box cannot warn you about, and these messages carry
appointment details people rely on.

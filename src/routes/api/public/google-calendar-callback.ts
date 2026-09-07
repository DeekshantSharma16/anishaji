import { createFileRoute } from "@tanstack/react-router";

/**
 * Google hands the practitioner back here after consent. The `state` is the
 * signed nonce we issued in the diary, so only a signed-in practitioner can
 * complete the connection. The refresh token is stored server-side and never
 * returned to the browser.
 */

function page(title: string, message: string, ok: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
     <meta name="robots" content="noindex" />
     <style>
       body{font-family:Georgia,serif;background:#f5efe4;color:#2e2820;display:grid;place-items:center;min-height:100vh;margin:0}
       .card{background:#fbf7ef;padding:40px;border-radius:16px;max-width:420px;text-align:center;box-shadow:0 18px 40px -24px rgba(46,40,32,.5)}
       a{color:#8a4b2a}
     </style></head>
     <body><div class="card">
       <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
       <p style="color:#4a4239;line-height:1.6;margin:0 0 20px">${message}</p>
       <a href="/admin">Back to the diary</a>
     </div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/google-calendar-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const denied = url.searchParams.get("error");

        if (denied) return page("Connection cancelled", "Nothing was changed.", false);
        if (!code || !state) return page("Something's missing", "That link was incomplete.", false);

        const { signPayload, safeEqual } = await import("@/lib/admin-auth.server");
        const [expiry, signature] = state.split(".");
        if (!expiry || !signature || Number(expiry) < Date.now()) {
          return page("That link expired", "Start the connection again from the diary.", false);
        }
        if (!safeEqual(await signPayload(`gcal:${expiry}`), signature)) {
          return page(
            "We couldn't verify that",
            "Start the connection again from the diary.",
            false,
          );
        }

        const { exchangeCode, googleUserEmail } = await import("@/lib/gcal.server");
        const tokens = await exchangeCode(code, url.origin);

        if (!tokens.refresh_token) {
          console.error("Google returned no refresh token", tokens.error, tokens.error_description);
          return page(
            "Google didn't send a refresh token",
            "Remove the app's access in your Google account and try connecting once more.",
            false,
          );
        }

        const accountEmail = tokens.access_token
          ? await googleUserEmail(tokens.access_token)
          : null;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error } = await supabaseAdmin.from("calendar_connections").upsert({
          id: true,
          account_email: accountEmail,
          calendar_id: "primary",
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token ?? null,
          expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Calendar connection save failed", error);
          return page("We couldn't save the connection", "Please try again.", false);
        }

        return page(
          "Calendar connected",
          `Sessions will now appear in ${accountEmail ?? "your Google Calendar"}. You can run a full resync from the diary.`,
          true,
        );
      },
    },
  },
});

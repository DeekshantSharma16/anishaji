import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Note on the missing Supabase auth middleware.
 *
 * Lovable scaffolds `attachSupabaseAuth` in here by default. It runs in the
 * BROWSER before every server-function call, reads supabase.auth.getSession(),
 * and attaches the resulting bearer token to the request.
 *
 * This app has no Supabase Auth. The practitioner signs in to /admin with a
 * passcode and gets a signed cookie; every database read happens server-side
 * with the service-role key. Nothing anywhere reads that bearer token.
 *
 * So the middleware did nothing except instantiate the browser Supabase
 * client, which throws unless VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 * are inlined at build time. That turned two unused variables into a hard
 * dependency that crashed the site on the first server-function call, with an
 * error message pointing at Lovable Cloud rather than at this file.
 *
 * Removing it also keeps the Supabase URL and anon key out of the client
 * bundle entirely, which is a small security win on top.
 *
 * If Supabase Auth is ever added for real, restore the import and put
 * `attachSupabaseAuth` back into functionMiddleware.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));

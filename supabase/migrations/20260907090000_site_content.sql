-- Editable site copy, held as a single JSON row.
--
-- One row, id = 'live'. Keeping it as one document rather than a table per
-- section means the admin editor saves atomically: the page is never half
-- old copy and half new. Reads happen through the service role in a server
-- function, so anon needs no access at all.

CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- No policies, and no grants to anon or authenticated. With RLS on and no
-- policy, every client-side request returns nothing. Only the service-role
-- key used by the server functions can read or write this table.
REVOKE ALL ON public.site_content FROM anon, authenticated;

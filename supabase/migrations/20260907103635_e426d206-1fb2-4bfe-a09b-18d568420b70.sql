CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY,
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_content FROM anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
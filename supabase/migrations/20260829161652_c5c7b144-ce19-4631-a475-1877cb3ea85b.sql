CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT NOT NULL,
  session_date DATE NOT NULL,
  session_time TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'The Anisha Practice · Bandra West',
  notes TEXT,
  manage_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.bookings TO anon;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a session"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

CREATE OR REPLACE FUNCTION public.update_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();

-- ---------------------------------------------------------------------------
-- Practice upgrade: real availability, cancellation, admin, abuse control.
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS confirmed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason  TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS source         TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS client_hash    TEXT;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'declined', 'completed'));

CREATE UNIQUE INDEX IF NOT EXISTS bookings_live_slot_unique
  ON public.bookings (session_date, session_time)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_session_date_idx
  ON public.bookings (session_date);

CREATE INDEX IF NOT EXISTS bookings_created_at_idx
  ON public.bookings (created_at DESC);

CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date   DATE NOT NULL,
  block_time   TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blocked_slots_unique
  ON public.blocked_slots (block_date, COALESCE(block_time, '*'));

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.blocked_slots TO service_role;

CREATE TABLE IF NOT EXISTS public.booking_attempts (
  id           BIGSERIAL PRIMARY KEY,
  client_hash  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_attempts_lookup
  ON public.booking_attempts (client_hash, created_at DESC);

ALTER TABLE public.booking_attempts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.booking_attempts TO service_role;

CREATE TABLE IF NOT EXISTS public.leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'desk-reset',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON public.leads (lower(email));

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.leads TO service_role;

DROP POLICY IF EXISTS "Anyone can request a session" ON public.bookings;
REVOKE INSERT ON public.bookings FROM anon;

CREATE OR REPLACE FUNCTION public.prune_booking_attempts()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.booking_attempts WHERE created_at < now() - INTERVAL '2 days';
$$;
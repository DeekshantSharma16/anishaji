-- ---------------------------------------------------------------------------
-- Practice upgrade: real availability, cancellation, admin, abuse control.
-- ---------------------------------------------------------------------------

-- 1. Extra booking state ----------------------------------------------------
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

-- 2. One live booking per slot. This is the actual double-booking guard;
--    the application check is only there to give a friendly message first.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_live_slot_unique
  ON public.bookings (session_date, session_time)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS bookings_session_date_idx
  ON public.bookings (session_date);

CREATE INDEX IF NOT EXISTS bookings_created_at_idx
  ON public.bookings (created_at DESC);

-- 3. Practitioner time off --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date   DATE NOT NULL,
  -- NULL means the whole day is blocked.
  block_time   TEXT,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blocked_slots_unique
  ON public.blocked_slots (block_date, COALESCE(block_time, '*'));

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.blocked_slots TO service_role;

-- 4. Abuse control ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_attempts (
  id           BIGSERIAL PRIMARY KEY,
  client_hash  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_attempts_lookup
  ON public.booking_attempts (client_hash, created_at DESC);

ALTER TABLE public.booking_attempts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.booking_attempts TO service_role;

-- 5. Newsletter / lead magnet ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'desk-reset',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON public.leads (lower(email));

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.leads TO service_role;

-- 6. Lock the front door ----------------------------------------------------
-- Bookings are written by the server function using the service role, so the
-- anonymous client never needs table access. Removing it kills the "anyone can
-- spray rows into the table" hole without changing any user-facing behaviour.
DROP POLICY IF EXISTS "Anyone can request a session" ON public.bookings;
REVOKE INSERT ON public.bookings FROM anon;

-- 7. Housekeeping: forget stale rate-limit rows ------------------------------
CREATE OR REPLACE FUNCTION public.prune_booking_attempts()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.booking_attempts WHERE created_at < now() - INTERVAL '2 days';
$$;

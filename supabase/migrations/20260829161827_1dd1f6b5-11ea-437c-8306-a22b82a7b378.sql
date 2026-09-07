-- Booking additions -------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS intake_token     TEXT,
  ADD COLUMN IF NOT EXISTS package_code     TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_intake_token_unique
  ON public.bookings (intake_token) WHERE intake_token IS NOT NULL;

-- Intake forms --------------------------------------------------------------
CREATE TABLE public.intake_forms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX intake_forms_booking_unique ON public.intake_forms (booking_id);

GRANT ALL ON public.intake_forms TO service_role;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;

-- Session packages ----------------------------------------------------------
CREATE TABLE public.client_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  client_name     TEXT NOT NULL,
  email           TEXT NOT NULL,
  package_key     TEXT NOT NULL,
  label           TEXT NOT NULL,
  sessions_total  INTEGER NOT NULL CHECK (sessions_total > 0),
  sessions_used   INTEGER NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  status          TEXT NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested', 'active', 'completed', 'cancelled')),
  notes           TEXT,
  expires_at      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX client_packages_email_idx ON public.client_packages (lower(email));

GRANT ALL ON public.client_packages TO service_role;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER client_packages_updated_at
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();

-- Waitlist ------------------------------------------------------------------
CREATE TABLE public.waitlist_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name   TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  service       TEXT,
  session_date  DATE NOT NULL,
  session_time  TEXT,
  status        TEXT NOT NULL DEFAULT 'waiting'
                CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  notified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_lookup_idx ON public.waitlist_entries (session_date, status);
CREATE UNIQUE INDEX waitlist_no_duplicates
  ON public.waitlist_entries (lower(email), session_date, COALESCE(session_time, '*'))
  WHERE status = 'waiting';

GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Reviews -------------------------------------------------------------------
CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name   TEXT NOT NULL,
  author_photo  TEXT,
  rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  body          TEXT NOT NULL,
  relative_time TEXT,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google')),
  external_id   TEXT,
  published     BOOLEAN NOT NULL DEFAULT true,
  position      INTEGER NOT NULL DEFAULT 0,
  fetched_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reviews_external_unique ON public.reviews (external_id) WHERE external_id IS NOT NULL;

GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Aggregate rating cache (one row) -----------------------------------------
CREATE TABLE public.review_summary (
  id            BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  rating        NUMERIC(2,1),
  total_reviews INTEGER,
  profile_url   TEXT,
  fetched_at    TIMESTAMPTZ
);

GRANT ALL ON public.review_summary TO service_role;
ALTER TABLE public.review_summary ENABLE ROW LEVEL SECURITY;

-- Google Calendar connection (private, server-only) --------------------------
CREATE TABLE public.calendar_connections (
  id             BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  account_email  TEXT,
  calendar_id    TEXT NOT NULL DEFAULT 'primary',
  refresh_token  TEXT NOT NULL,
  access_token   TEXT,
  expires_at     TIMESTAMPTZ,
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.calendar_connections TO service_role;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
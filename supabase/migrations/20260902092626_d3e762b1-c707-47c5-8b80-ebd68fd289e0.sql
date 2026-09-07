-- Anonymous callers may see ONLY the slot columns of bookings.
GRANT SELECT (session_date, session_time, status) ON public.bookings TO anon;
GRANT SELECT (block_date, block_time) ON public.blocked_slots TO anon;

DROP POLICY IF EXISTS "Anyone can see which slots are taken" ON public.bookings;
CREATE POLICY "Anyone can see which slots are taken"
  ON public.bookings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Anyone can see blocked slots" ON public.blocked_slots;
CREATE POLICY "Anyone can see blocked slots"
  ON public.blocked_slots FOR SELECT TO anon USING (true);
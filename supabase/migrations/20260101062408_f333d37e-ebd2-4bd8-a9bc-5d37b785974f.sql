-- 1) Ensure one balance row per user + leave type + year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_balances_profile_leave_type_year_key'
      AND conrelid = 'public.leave_balances'::regclass
  ) THEN
    ALTER TABLE public.leave_balances
      ADD CONSTRAINT leave_balances_profile_leave_type_year_key
      UNIQUE (profile_id, leave_type_id, year);
  END IF;
END $$;

-- 2) Sync used_days whenever a request becomes approved (paid)
CREATE OR REPLACE FUNCTION public.sync_leave_balance_from_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr int;
  delta numeric;
BEGIN
  yr := EXTRACT(YEAR FROM NEW.start_date)::int;

  -- Default: no change
  delta := 0;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' AND NEW.is_paid THEN
      delta := COALESCE(NEW.total_days, 0);
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    -- non-approved -> approved
    IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved' THEN
      IF NEW.is_paid THEN
        delta := COALESCE(NEW.total_days, 0);
      ELSE
        RETURN NEW;
      END IF;

    -- approved -> non-approved (rare, but keep consistent)
    ELSIF COALESCE(OLD.status, '') = 'approved' AND NEW.status <> 'approved' THEN
      IF OLD.is_paid THEN
        delta := -COALESCE(OLD.total_days, 0);
      ELSE
        RETURN NEW;
      END IF;

    -- paid/unpaid toggled after approval
    ELSIF COALESCE(OLD.status, '') = 'approved'
      AND NEW.status = 'approved'
      AND (OLD.is_paid IS DISTINCT FROM NEW.is_paid) THEN

      IF OLD.is_paid AND NOT NEW.is_paid THEN
        delta := -COALESCE(OLD.total_days, 0);
      ELSIF NOT OLD.is_paid AND NEW.is_paid THEN
        delta := COALESCE(NEW.total_days, 0);
      ELSE
        RETURN NEW;
      END IF;

    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Ensure balance row exists (created on-demand if someone forgot to initialize balances)
  INSERT INTO public.leave_balances (
    profile_id,
    leave_type_id,
    year,
    total_days,
    used_days,
    carry_forward_days,
    accrued_days
  )
  VALUES (
    NEW.profile_id,
    NEW.leave_type_id,
    yr,
    COALESCE((SELECT lt.days_per_year::numeric FROM public.leave_types lt WHERE lt.id = NEW.leave_type_id), 0),
    0,
    0,
    0
  )
  ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;

  UPDATE public.leave_balances
  SET used_days = GREATEST(0, used_days + delta),
      updated_at = now()
  WHERE profile_id = NEW.profile_id
    AND leave_type_id = NEW.leave_type_id
    AND year = yr;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_requests_sync_balance ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_sync_balance
AFTER INSERT OR UPDATE OF status, is_paid, total_days
ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_leave_balance_from_leave_request();

-- 3) Backfill existing balances from already-approved leave requests (paid)
WITH usage AS (
  SELECT
    lr.profile_id,
    lr.leave_type_id,
    EXTRACT(YEAR FROM lr.start_date)::int AS year,
    SUM(lr.total_days)::numeric AS used
  FROM public.leave_requests lr
  WHERE lr.status = 'approved'
    AND lr.is_paid = true
  GROUP BY 1,2,3
)
INSERT INTO public.leave_balances (
  profile_id,
  leave_type_id,
  year,
  total_days,
  used_days,
  carry_forward_days,
  accrued_days
)
SELECT
  u.profile_id,
  u.leave_type_id,
  u.year,
  COALESCE((SELECT lt.days_per_year::numeric FROM public.leave_types lt WHERE lt.id = u.leave_type_id), 0),
  0,
  0,
  0
FROM usage u
ON CONFLICT (profile_id, leave_type_id, year) DO NOTHING;

WITH usage AS (
  SELECT
    lr.profile_id,
    lr.leave_type_id,
    EXTRACT(YEAR FROM lr.start_date)::int AS year,
    SUM(lr.total_days)::numeric AS used
  FROM public.leave_requests lr
  WHERE lr.status = 'approved'
    AND lr.is_paid = true
  GROUP BY 1,2,3
)
UPDATE public.leave_balances lb
SET used_days = GREATEST(lb.used_days, COALESCE(u.used, 0)),
    updated_at = now()
FROM usage u
WHERE lb.profile_id = u.profile_id
  AND lb.leave_type_id = u.leave_type_id
  AND lb.year = u.year;

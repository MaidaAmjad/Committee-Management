-- Enforce max_members when approving committee members (prevents over-accepting join requests).
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.enforce_committee_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_members INTEGER;
  v_slots_used NUMERIC;
  v_new_slot_weight NUMERIC;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT max_members
  INTO v_max_members
  FROM public.committees
  WHERE id = NEW.committee_id;

  IF v_max_members IS NULL THEN
    RAISE EXCEPTION 'Committee not found.';
  END IF;

  v_new_slot_weight := CASE
    WHEN COALESCE(NEW.slot_type, 'full') = 'shared' THEN 0.5
    ELSE 1
  END;

  SELECT COALESCE(SUM(
    CASE WHEN COALESCE(slot_type, 'full') = 'shared' THEN 0.5 ELSE 1 END
  ), 0)
  INTO v_slots_used
  FROM public.committee_members
  WHERE committee_id = NEW.committee_id
    AND status = 'approved'
    AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id);

  IF v_slots_used + v_new_slot_weight > v_max_members THEN
    RAISE EXCEPTION 'Committee is full (max % members). Cannot approve more join requests.', v_max_members
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_committee_member_limit_trigger ON public.committee_members;

CREATE TRIGGER enforce_committee_member_limit_trigger
  BEFORE INSERT OR UPDATE OF status, slot_type ON public.committee_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_committee_member_limit();

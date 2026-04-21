
CREATE OR REPLACE FUNCTION public.normalize_platform_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.platform IN ('x', 'X', 'X (Twitter)', 'x (twitter)') THEN
    NEW.platform := 'twitter';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_post_metrics_platform ON public.post_metrics;
CREATE TRIGGER trg_normalize_post_metrics_platform
  BEFORE INSERT OR UPDATE ON public.post_metrics
  FOR EACH ROW EXECUTE FUNCTION public.normalize_platform_name();

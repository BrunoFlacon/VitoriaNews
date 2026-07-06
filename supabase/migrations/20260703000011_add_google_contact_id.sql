-- Add google_contact_id column to contacts table for Google People API sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'google_contact_id'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN google_contact_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_google_id ON public.contacts(google_contact_id) WHERE google_contact_id IS NOT NULL;

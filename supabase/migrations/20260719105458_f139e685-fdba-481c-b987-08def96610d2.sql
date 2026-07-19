
-- External dataset ingestion (mcPHASES etc.)

-- 1. New enum values (must be committed before use)
ALTER TYPE wearable_metric ADD VALUE IF NOT EXISTS 'sleep_score';
ALTER TYPE wearable_metric ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE wearable_metric ADD VALUE IF NOT EXISTS 'respiratory_rate';
ALTER TYPE wearable_metric ADD VALUE IF NOT EXISTS 'computed_temp';
ALTER TYPE wearable_source ADD VALUE IF NOT EXISTS 'external_dataset';

-- 2. Extend studies
DO $$ BEGIN
  CREATE TYPE study_kind AS ENUM ('participant','external_cohort');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS kind study_kind NOT NULL DEFAULT 'participant',
  ADD COLUMN IF NOT EXISTS source text;

-- 3. dataset_requests
DO $$ BEGIN
  CREATE TYPE dataset_request_kind AS ENUM ('new_dataset','access_request');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE dataset_request_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.dataset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind dataset_request_kind NOT NULL,
  study_id uuid REFERENCES public.studies(id) ON DELETE SET NULL,
  title text NOT NULL,
  source text,
  dua_reference text,
  notes text,
  status dataset_request_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_requests TO authenticated;
GRANT ALL ON public.dataset_requests TO service_role;
ALTER TABLE public.dataset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requester reads own tickets" ON public.dataset_requests
  FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "requester creates tickets" ON public.dataset_requests
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND status = 'pending');
CREATE POLICY "admins manage tickets" ON public.dataset_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

-- 4. external_subjects
CREATE TABLE IF NOT EXISTS public.external_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  demographics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, external_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_subjects TO authenticated;
GRANT ALL ON public.external_subjects TO service_role;
ALTER TABLE public.external_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study members read external subjects" ON public.external_subjects
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = external_subjects.study_id
        AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','clinician','admin')
    )
  );
CREATE POLICY "admins write external subjects" ON public.external_subjects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = external_subjects.study_id AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')))
  WITH CHECK (has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = external_subjects.study_id AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')));

-- 5. dataset_files
CREATE TABLE IF NOT EXISTS public.dataset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  filename text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('raw_archive','mapped_source')),
  storage_path text NOT NULL,
  bytes bigint,
  sha256 text,
  rows_ingested integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_files TO authenticated;
GRANT ALL ON public.dataset_files TO service_role;
ALTER TABLE public.dataset_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study members read dataset files" ON public.dataset_files
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = dataset_files.study_id AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','clinician','admin'))
  );
CREATE POLICY "study writers manage dataset files" ON public.dataset_files
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = dataset_files.study_id AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')))
  WITH CHECK (has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.study_participants sp
      WHERE sp.study_id = dataset_files.study_id AND sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')));

-- 6. Extend measurement tables with external_subject_id + dataset_id
ALTER TABLE public.wearable_samples
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_subject_id uuid REFERENCES public.external_subjects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dataset_id uuid REFERENCES public.studies(id) ON DELETE CASCADE;

ALTER TABLE public.hormone_entries
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_subject_id uuid REFERENCES public.external_subjects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dataset_id uuid REFERENCES public.studies(id) ON DELETE CASCADE;

ALTER TABLE public.symptom_entries
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_subject_id uuid REFERENCES public.external_subjects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dataset_id uuid REFERENCES public.studies(id) ON DELETE CASCADE;

-- exclusivity: exactly one of user_id / external_subject_id
ALTER TABLE public.wearable_samples DROP CONSTRAINT IF EXISTS wearable_samples_subject_xor;
ALTER TABLE public.wearable_samples ADD CONSTRAINT wearable_samples_subject_xor
  CHECK ((user_id IS NOT NULL) <> (external_subject_id IS NOT NULL));
ALTER TABLE public.hormone_entries DROP CONSTRAINT IF EXISTS hormone_entries_subject_xor;
ALTER TABLE public.hormone_entries ADD CONSTRAINT hormone_entries_subject_xor
  CHECK ((user_id IS NOT NULL) <> (external_subject_id IS NOT NULL));
ALTER TABLE public.symptom_entries DROP CONSTRAINT IF EXISTS symptom_entries_subject_xor;
ALTER TABLE public.symptom_entries ADD CONSTRAINT symptom_entries_subject_xor
  CHECK ((user_id IS NOT NULL) <> (external_subject_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS wearable_samples_external_idx ON public.wearable_samples (external_subject_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS hormone_entries_external_idx ON public.hormone_entries (external_subject_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS symptom_entries_external_idx ON public.symptom_entries (external_subject_id, recorded_at DESC);

-- 7. RLS: extend researcher-read to external cohorts via study membership
CREATE OR REPLACE FUNCTION public.has_dataset_access(_actor uuid, _study_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _study_id IS NOT NULL AND (
      public.has_role(_actor,'admin')
      OR EXISTS (
        SELECT 1 FROM public.study_participants sp
        WHERE sp.study_id = _study_id AND sp.user_id = _actor
          AND sp.role_in_study IN ('researcher','clinician','admin')
      )
    );
$$;

DROP POLICY IF EXISTS "researchers read wearable" ON public.wearable_samples;
CREATE POLICY "researchers read wearable" ON public.wearable_samples
  FOR SELECT TO authenticated USING (
    (user_id IS NOT NULL AND has_participant_access(auth.uid(), user_id))
    OR (external_subject_id IS NOT NULL AND has_dataset_access(auth.uid(), dataset_id))
  );

DROP POLICY IF EXISTS "researchers read hormones" ON public.hormone_entries;
CREATE POLICY "researchers read hormones" ON public.hormone_entries
  FOR SELECT TO authenticated USING (
    (user_id IS NOT NULL AND has_participant_access(auth.uid(), user_id))
    OR (external_subject_id IS NOT NULL AND has_dataset_access(auth.uid(), dataset_id))
  );

DROP POLICY IF EXISTS "researchers read symptoms" ON public.symptom_entries;
CREATE POLICY "researchers read symptoms" ON public.symptom_entries
  FOR SELECT TO authenticated USING (
    (user_id IS NOT NULL AND has_participant_access(auth.uid(), user_id))
    OR (external_subject_id IS NOT NULL AND has_dataset_access(auth.uid(), dataset_id))
  );

-- writer policies for external rows (owner participants unchanged)
CREATE POLICY "study writers write external wearable" ON public.wearable_samples
  FOR INSERT TO authenticated WITH CHECK (
    external_subject_id IS NOT NULL AND (
      has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.study_participants sp
        WHERE sp.study_id = wearable_samples.dataset_id AND sp.user_id = auth.uid()
          AND sp.role_in_study IN ('researcher','admin'))
    )
  );
CREATE POLICY "study writers write external hormones" ON public.hormone_entries
  FOR INSERT TO authenticated WITH CHECK (
    external_subject_id IS NOT NULL AND (
      has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.study_participants sp
        WHERE sp.study_id = hormone_entries.dataset_id AND sp.user_id = auth.uid()
          AND sp.role_in_study IN ('researcher','admin'))
    )
  );
CREATE POLICY "study writers write external symptoms" ON public.symptom_entries
  FOR INSERT TO authenticated WITH CHECK (
    external_subject_id IS NOT NULL AND (
      has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.study_participants sp
        WHERE sp.study_id = symptom_entries.dataset_id AND sp.user_id = auth.uid()
          AND sp.role_in_study IN ('researcher','admin'))
    )
  );

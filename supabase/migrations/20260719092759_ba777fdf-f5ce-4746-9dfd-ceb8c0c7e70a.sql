
-- Grant clinician role to current user
INSERT INTO public.user_roles (user_id, role) VALUES ('085e7ecd-6b26-4565-abe7-3568c29676be', 'clinician')
ON CONFLICT (user_id, role) DO NOTHING;

-- EHR documents table
CREATE TABLE public.ehr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  document_type TEXT,
  notes TEXT,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ehr_documents TO authenticated;
GRANT ALL ON public.ehr_documents TO service_role;

ALTER TABLE public.ehr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects and authorized staff can read EHR"
  ON public.ehr_documents FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), subject_id));

CREATE POLICY "Clinicians/researchers/admin can insert EHR"
  ON public.ehr_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.has_participant_access(auth.uid(), subject_id)
    AND (
      public.has_role(auth.uid(), 'clinician')
      OR public.has_role(auth.uid(), 'researcher')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Uploader or admin can update EHR"
  ON public.ehr_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Uploader or admin can delete EHR"
  ON public.ehr_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_ehr_documents
  BEFORE UPDATE ON public.ehr_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE POLICY "EHR read access" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ehr-documents'
  AND public.has_participant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "EHR staff upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ehr-documents'
  AND public.has_participant_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  AND (
    public.has_role(auth.uid(), 'clinician')
    OR public.has_role(auth.uid(), 'researcher')
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "EHR uploader update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ehr-documents' AND owner = auth.uid());

CREATE POLICY "EHR uploader delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ehr-documents'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

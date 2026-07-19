
CREATE POLICY "external datasets read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'external-datasets'
  AND (
    has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.study_participants sp
      WHERE sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','clinician','admin')
        AND sp.study_id::text = split_part(name, '/', 1)
    )
  )
);

CREATE POLICY "external datasets write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'external-datasets'
  AND (
    has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.study_participants sp
      WHERE sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')
        AND sp.study_id::text = split_part(name, '/', 1)
    )
  )
);

CREATE POLICY "external datasets delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'external-datasets'
  AND (
    has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.study_participants sp
      WHERE sp.user_id = auth.uid()
        AND sp.role_in_study IN ('researcher','admin')
        AND sp.study_id::text = split_part(name, '/', 1)
    )
  )
);


CREATE POLICY "own storage folder select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('voice-memos','food-photos','wearable-uploads','brain-signals')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "own storage folder insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('voice-memos','food-photos','wearable-uploads','brain-signals')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "own storage folder update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('voice-memos','food-photos','wearable-uploads','brain-signals')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "own storage folder delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('voice-memos','food-photos','wearable-uploads','brain-signals')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

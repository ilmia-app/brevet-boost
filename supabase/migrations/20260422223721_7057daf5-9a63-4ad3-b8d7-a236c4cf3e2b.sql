-- Restrict write access to the 'annales' storage bucket. Reads remain public (bucket is public).
-- Only service_role can insert/update/delete objects in this bucket.

CREATE POLICY "Annales: block anon/auth inserts"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Annales: block anon/auth updates"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'annales' AND false)
WITH CHECK (bucket_id = 'annales' AND false);

CREATE POLICY "Annales: block anon/auth deletes"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'annales' AND false);
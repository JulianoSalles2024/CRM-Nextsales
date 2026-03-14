-- Migration 053: Create public storage bucket for inbox media (images, audio, video, documents)
-- Uploaded by WF-01 via Evolution API getBase64FromMediaMessage endpoint.
-- Objects are publicly readable via /storage/v1/object/public/inbox-media/{path}.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inbox-media',
  'inbox-media',
  true,
  52428800, -- 50 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac',
    'video/mp4', 'video/3gpp', 'video/webm',
    'application/pdf', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy (bucket is public, but explicit policy required for SELECT on storage.objects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'inbox-media public read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "inbox-media public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'inbox-media');
    $pol$;
  END IF;
END;
$$;

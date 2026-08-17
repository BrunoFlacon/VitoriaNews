-- ============================================================
-- Cria bucket 'documents' (público) + policies de storage
-- 2026-08-13
--
-- Motivo: o DocumentsView faz upload/lista no bucket 'documents',
-- mas ele nunca foi criado — todo upload falhava no storage e
-- gravava linha órfã na tabela documents.
-- Idempotente: seguro para re-run.
-- ============================================================

-- 1. Criar o bucket (público, igual ao 'media')
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Policies de storage.objects para o bucket 'documents'
-- (espelhando as do bucket 'media' para consistência)

DROP POLICY IF EXISTS "Authenticated users can upload to documents bucket" ON storage.objects;
CREATE POLICY "Authenticated users can upload to documents bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can read documents files" ON storage.objects;
CREATE POLICY "Authenticated users can read documents files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public can read documents files" ON storage.objects;
CREATE POLICY "Public can read documents files"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Users can delete own documents files" ON storage.objects;
CREATE POLICY "Users can delete own documents files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own documents files" ON storage.objects;
CREATE POLICY "Users can update own documents files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

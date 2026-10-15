-- ==============================================================================
-- HisabSetu — Phase 7 Database Migration
-- Alterations: public.expenses (add receipt_url, receipt_data)
-- Storage: Bucket definition and RLS policies for receipts
-- Migration Version: 20261020000100
-- ==============================================================================

-- 1. Extend public.expenses to store optional receipt attachment references
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'expenses' 
          AND column_name = 'receipt_url'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN receipt_url TEXT CHECK (receipt_url IS NULL OR char_length(receipt_url) <= 1000);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'expenses' 
          AND column_name = 'receipt_metadata'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN receipt_metadata JSONB DEFAULT NULL;
    END IF;
END $$;

-- 2. Setup user-scoped Supabase Storage bucket for receipts (if storage schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('receipts', 'receipts', false)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 3. Storage RLS Policies (Owner-only access)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Allow authenticated users to upload receipts to their own folder
        DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
        CREATE POLICY "Users can upload their own receipts"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

        -- Allow authenticated users to view their own receipts
        DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
        CREATE POLICY "Users can view their own receipts"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

        -- Allow authenticated users to delete their own receipts
        DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
        CREATE POLICY "Users can delete their own receipts"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;

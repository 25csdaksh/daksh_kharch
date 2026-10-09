-- ==============================================================================
-- PaisaTrack — Phase 3 Database Migration
-- Table: public.expenses
-- Description: Stores user personal expense transactions with strict RLS policies.
-- Migration Version: 20261009000100
-- ==============================================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    category TEXT NOT NULL CHECK (
        category IN (
            'Food',
            'Transport',
            'Shopping',
            'Education',
            'Entertainment',
            'Bills',
            'Healthcare',
            'Personal Care',
            'Other'
        )
    ),
    description TEXT CHECK (char_length(description) <= 500),
    expense_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (
        payment_method IN (
            'Cash',
            'UPI',
            'Card',
            'Bank Transfer',
            'Other'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for high-performance query execution
CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
    ON public.expenses (user_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_category 
    ON public.expenses (user_id, category);

CREATE INDEX IF NOT EXISTS idx_expenses_user_created 
    ON public.expenses (user_id, created_at DESC);

-- 3. Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS) - Mandatory
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- SELECT Policy: Users can only read their own expense records
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
CREATE POLICY "Users can view own expenses"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT Policy: Users can only insert records for their own authenticated user_id
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE Policy: Users can only update their own records and cannot transfer ownership
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE Policy: Users can only delete their own expense records
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Users can delete own expenses"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

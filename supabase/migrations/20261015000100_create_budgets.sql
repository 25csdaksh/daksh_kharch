-- ==============================================================================
-- HisabSetu — Phase 1 Database Migration
-- Table: public.budgets
-- Description: Stores monthly total and category-specific budget targets with strict RLS policies.
-- Migration Version: 20261015000100_create_budgets.sql
-- ==============================================================================

-- 1. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    category TEXT CHECK (
        category IS NULL OR category IN (
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
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Unique Constraints / Indexes to prevent duplicate budgets
-- Rule: Only one total budget (category IS NULL) per user per month & year
CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_user_year_month_total
    ON public.budgets (user_id, year, month)
    WHERE category IS NULL;

-- Rule: Only one category budget per user per month, year, and specific category
CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_user_year_month_category
    ON public.budgets (user_id, year, month, category)
    WHERE category IS NOT NULL;

-- Additional indexes for fast query filtering
CREATE INDEX IF NOT EXISTS idx_budgets_user_year_month
    ON public.budgets (user_id, year, month);

CREATE INDEX IF NOT EXISTS idx_budgets_user_category
    ON public.budgets (user_id, category);

-- 3. Automatic updated_at timestamp trigger
DROP TRIGGER IF EXISTS set_budgets_updated_at ON public.budgets;
CREATE TRIGGER set_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- SELECT Policy: Authenticated users can only read their own budget records
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets"
    ON public.budgets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT Policy: Authenticated users can only insert records for their own user_id
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;
CREATE POLICY "Users can insert own budgets"
    ON public.budgets
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE Policy: Authenticated users can only update their own records and cannot change ownership
DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
    ON public.budgets
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE Policy: Authenticated users can only delete their own budget records
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can delete own budgets"
    ON public.budgets
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

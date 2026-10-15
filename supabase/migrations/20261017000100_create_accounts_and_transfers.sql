-- ==============================================================================
-- HisabSetu — Phase 3 Database Migration
-- Tables: public.accounts, public.transfers, public.incomes
-- Alterations: public.expenses (add account_id foreign key)
-- Description: Multi-wallet/account management, account balances, transfers, and incomes.
-- Migration Version: 20261017000100
-- ==============================================================================

-- 1. Create accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
    type TEXT NOT NULL CHECK (
        type IN (
            'cash',
            'bank',
            'wallet',
            'savings',
            'credit_card',
            'other'
        )
    ),
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    color TEXT NOT NULL DEFAULT '#10B981',
    icon TEXT DEFAULT 'Wallet',
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create transfers table (Inter-account money transfers)
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    transfer_date DATE NOT NULL,
    note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_transfers_different_accounts CHECK (source_account_id <> destination_account_id)
);

-- 3. Create incomes table (Inflow to accounts)
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    source TEXT NOT NULL CHECK (
        source IN (
            'Salary',
            'Business',
            'Freelance',
            'Investments',
            'Rental',
            'Gifts',
            'Refund',
            'Other'
        )
    ),
    income_date DATE NOT NULL,
    description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Extend public.expenses to link with accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'expenses' 
          AND column_name = 'account_id'
    ) THEN
        ALTER TABLE public.expenses 
            ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_archived 
    ON public.accounts (user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_accounts_user_type 
    ON public.accounts (user_id, type);

CREATE INDEX IF NOT EXISTS idx_transfers_user_date 
    ON public.transfers (user_id, transfer_date DESC);

CREATE INDEX IF NOT EXISTS idx_transfers_source 
    ON public.transfers (source_account_id);

CREATE INDEX IF NOT EXISTS idx_transfers_dest 
    ON public.transfers (destination_account_id);

CREATE INDEX IF NOT EXISTS idx_incomes_user_date 
    ON public.incomes (user_id, income_date DESC);

CREATE INDEX IF NOT EXISTS idx_incomes_account 
    ON public.incomes (account_id);

CREATE INDEX IF NOT EXISTS idx_expenses_account 
    ON public.expenses (account_id);

-- 6. Updated_at Triggers
DROP TRIGGER IF EXISTS set_accounts_updated_at ON public.accounts;
CREATE TRIGGER set_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_transfers_updated_at ON public.transfers;
CREATE TRIGGER set_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_incomes_updated_at ON public.incomes;
CREATE TRIGGER set_incomes_updated_at
    BEFORE UPDATE ON public.incomes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: public.accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
CREATE POLICY "Users can view own accounts"
    ON public.accounts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
CREATE POLICY "Users can insert own accounts"
    ON public.accounts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
CREATE POLICY "Users can update own accounts"
    ON public.accounts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
CREATE POLICY "Users can delete own accounts"
    ON public.accounts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 9. RLS Policies: public.transfers
DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
CREATE POLICY "Users can view own transfers"
    ON public.transfers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
CREATE POLICY "Users can insert own transfers"
    ON public.transfers FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = source_account_id AND a.user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = destination_account_id AND a.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
CREATE POLICY "Users can update own transfers"
    ON public.transfers FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = source_account_id AND a.user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = destination_account_id AND a.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;
CREATE POLICY "Users can delete own transfers"
    ON public.transfers FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 10. RLS Policies: public.incomes
DROP POLICY IF EXISTS "Users can view own incomes" ON public.incomes;
CREATE POLICY "Users can view own incomes"
    ON public.incomes FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own incomes" ON public.incomes;
CREATE POLICY "Users can insert own incomes"
    ON public.incomes FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Users can update own incomes" ON public.incomes;
CREATE POLICY "Users can update own incomes"
    ON public.incomes FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND (account_id IS NULL OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Users can delete own incomes" ON public.incomes;
CREATE POLICY "Users can delete own incomes"
    ON public.incomes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

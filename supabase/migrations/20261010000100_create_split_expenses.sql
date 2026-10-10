-- ==============================================================================
-- HisabSetu — Phase 6 Database Migration
-- Feature: Split Expenses, Friends, Shares, and Settlement Management
-- Migration Version: 20261010000100_create_split_expenses.sql
-- ==============================================================================

-- 1. Create split_friends table
-- Stores non-account friend entities created by the authenticated owner.
CREATE TABLE IF NOT EXISTS public.split_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
    phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
    email TEXT CHECK (email IS NULL OR char_length(email) <= 255),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_friend_user_name UNIQUE (user_id, name)
);

-- 2. Create shared_expenses table
-- Stores master record for an expense split among multiple people.
CREATE TABLE IF NOT EXISTS public.shared_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0 AND total_amount <= 9999999999.99),
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
    expense_date DATE NOT NULL,
    paid_by_friend_id UUID REFERENCES public.split_friends(id) ON DELETE SET NULL,
    split_method TEXT NOT NULL CHECK (
        split_method IN ('equal', 'unequal', 'percentage', 'shares')
    ),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create shared_expense_shares table
-- Stores individual participant share breakdown for each shared expense.
-- If friend_id is NULL, the share belongs to the authenticated user ("You").
CREATE TABLE IF NOT EXISTS public.shared_expense_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_expense_id UUID NOT NULL REFERENCES public.shared_expenses(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES public.split_friends(id) ON DELETE RESTRICT,
    share_amount NUMERIC(12,2) NOT NULL CHECK (share_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create shared_expense_settlements table
-- Stores debt repayments between participants.
-- Payer or Recipient can be NULL indicating the authenticated user ("You").
CREATE TABLE IF NOT EXISTS public.shared_expense_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payer_friend_id UUID REFERENCES public.split_friends(id) ON DELETE RESTRICT,
    recipient_friend_id UUID REFERENCES public.split_friends(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    settlement_date DATE NOT NULL,
    shared_expense_id UUID REFERENCES public.shared_expenses(id) ON DELETE SET NULL,
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_distinct_payer_recipient CHECK (payer_friend_id IS DISTINCT FROM recipient_friend_id)
);

-- 5. Indexes for fast owner-scoped queries
CREATE INDEX IF NOT EXISTS idx_split_friends_user ON public.split_friends(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_user_date ON public.shared_expenses(user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_shared_expense_shares_expense ON public.shared_expense_shares(shared_expense_id);
CREATE INDEX IF NOT EXISTS idx_shared_expense_shares_friend ON public.shared_expense_shares(friend_id);
CREATE INDEX IF NOT EXISTS idx_settlements_user_date ON public.shared_expense_settlements(user_id, settlement_date DESC);

-- 6. Attach updated_at triggers
DROP TRIGGER IF EXISTS set_split_friends_updated_at ON public.split_friends;
CREATE TRIGGER set_split_friends_updated_at
    BEFORE UPDATE ON public.split_friends
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_shared_expenses_updated_at ON public.shared_expenses;
CREATE TRIGGER set_shared_expenses_updated_at
    BEFORE UPDATE ON public.shared_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_settlements_updated_at ON public.shared_expense_settlements;
CREATE TRIGGER set_settlements_updated_at
    BEFORE UPDATE ON public.shared_expense_settlements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Enable Row Level Security (RLS) on all split tables
ALTER TABLE public.split_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expense_settlements ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for split_friends
DROP POLICY IF EXISTS "Users can view own friends" ON public.split_friends;
CREATE POLICY "Users can view own friends"
    ON public.split_friends FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own friends" ON public.split_friends;
CREATE POLICY "Users can insert own friends"
    ON public.split_friends FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own friends" ON public.split_friends;
CREATE POLICY "Users can update own friends"
    ON public.split_friends FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own friends" ON public.split_friends;
CREATE POLICY "Users can delete own friends"
    ON public.split_friends FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 9. RLS Policies for shared_expenses
DROP POLICY IF EXISTS "Users can view own shared expenses" ON public.shared_expenses;
CREATE POLICY "Users can view own shared expenses"
    ON public.shared_expenses FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own shared expenses" ON public.shared_expenses;
CREATE POLICY "Users can insert own shared expenses"
    ON public.shared_expenses FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own shared expenses" ON public.shared_expenses;
CREATE POLICY "Users can update own shared expenses"
    ON public.shared_expenses FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own shared expenses" ON public.shared_expenses;
CREATE POLICY "Users can delete own shared expenses"
    ON public.shared_expenses FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 10. RLS Policies for shared_expense_shares
-- Subquery joins to shared_expenses to enforce strict ownership verification
DROP POLICY IF EXISTS "Users can view own expense shares" ON public.shared_expense_shares;
CREATE POLICY "Users can view own expense shares"
    ON public.shared_expense_shares FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_expenses se
            WHERE se.id = shared_expense_shares.shared_expense_id
              AND se.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own expense shares" ON public.shared_expense_shares;
CREATE POLICY "Users can insert own expense shares"
    ON public.shared_expense_shares FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shared_expenses se
            WHERE se.id = shared_expense_shares.shared_expense_id
              AND se.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own expense shares" ON public.shared_expense_shares;
CREATE POLICY "Users can update own expense shares"
    ON public.shared_expense_shares FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_expenses se
            WHERE se.id = shared_expense_shares.shared_expense_id
              AND se.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shared_expenses se
            WHERE se.id = shared_expense_shares.shared_expense_id
              AND se.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own expense shares" ON public.shared_expense_shares;
CREATE POLICY "Users can delete own expense shares"
    ON public.shared_expense_shares FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_expenses se
            WHERE se.id = shared_expense_shares.shared_expense_id
              AND se.user_id = auth.uid()
        )
    );

-- 11. RLS Policies for shared_expense_settlements
DROP POLICY IF EXISTS "Users can view own settlements" ON public.shared_expense_settlements;
CREATE POLICY "Users can view own settlements"
    ON public.shared_expense_settlements FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own settlements" ON public.shared_expense_settlements;
CREATE POLICY "Users can insert own settlements"
    ON public.shared_expense_settlements FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settlements" ON public.shared_expense_settlements;
CREATE POLICY "Users can update own settlements"
    ON public.shared_expense_settlements FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own settlements" ON public.shared_expense_settlements;
CREATE POLICY "Users can delete own settlements"
    ON public.shared_expense_settlements FOR DELETE TO authenticated
    USING (user_id = auth.uid());

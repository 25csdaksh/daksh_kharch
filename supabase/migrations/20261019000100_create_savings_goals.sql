-- ==============================================================================
-- HisabSetu — Phase 5 Database Migration
-- Tables: public.savings_goals, public.goal_transactions
-- Description: Savings goals, progress tracking, contributions, and withdrawals.
-- Migration Version: 20261019000100
-- ==============================================================================

-- 1. Create savings_goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
    category TEXT NOT NULL DEFAULT 'Custom' CHECK (
        category IN (
            'Emergency Fund',
            'Education',
            'Electronics',
            'Travel',
            'Vehicle',
            'Home',
            'Investment',
            'Custom'
        )
    ),
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0 AND target_amount <= 9999999999.99),
    current_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE NULL,
    linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    color TEXT NOT NULL DEFAULT '#064E3B',
    icon TEXT DEFAULT 'Target',
    monthly_target NUMERIC(12,2) NULL CHECK (monthly_target IS NULL OR monthly_target > 0),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
        status IN ('not_started', 'in_progress', 'completed', 'paused', 'overdue')
    ),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_goal_dates CHECK (target_date IS NULL OR target_date >= start_date)
);

-- 2. Create goal_transactions table (Contributions & Withdrawals history)
CREATE TABLE IF NOT EXISTS public.goal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('contribution', 'withdrawal')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
    source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    transfer_id UUID REFERENCES public.transfers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON public.savings_goals(status);
CREATE INDEX IF NOT EXISTS idx_savings_goals_target_date ON public.savings_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_savings_goals_linked_account ON public.savings_goals(linked_account_id);

CREATE INDEX IF NOT EXISTS idx_goal_tx_goal_id ON public.goal_transactions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_tx_user_id ON public.goal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_tx_date ON public.goal_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_goal_tx_transfer_id ON public.goal_transactions(transfer_id);

-- 4. Enable Row Level Security
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for savings_goals
DROP POLICY IF EXISTS "savings_goals_select_own" ON public.savings_goals;
CREATE POLICY "savings_goals_select_own"
    ON public.savings_goals FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_insert_own" ON public.savings_goals;
CREATE POLICY "savings_goals_insert_own"
    ON public.savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_update_own" ON public.savings_goals;
CREATE POLICY "savings_goals_update_own"
    ON public.savings_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_delete_own" ON public.savings_goals;
CREATE POLICY "savings_goals_delete_own"
    ON public.savings_goals FOR DELETE
    USING (auth.uid() = user_id);

-- 6. RLS Policies for goal_transactions
DROP POLICY IF EXISTS "goal_transactions_select_own" ON public.goal_transactions;
CREATE POLICY "goal_transactions_select_own"
    ON public.goal_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_transactions_insert_own" ON public.goal_transactions;
CREATE POLICY "goal_transactions_insert_own"
    ON public.goal_transactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.savings_goals g
            WHERE g.id = goal_id AND g.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "goal_transactions_update_own" ON public.goal_transactions;
CREATE POLICY "goal_transactions_update_own"
    ON public.goal_transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_transactions_delete_own" ON public.goal_transactions;
CREATE POLICY "goal_transactions_delete_own"
    ON public.goal_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Updated At Triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_savings_goals_updated_at'
    ) THEN
        CREATE TRIGGER trg_savings_goals_updated_at
            BEFORE UPDATE ON public.savings_goals
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_goal_transactions_updated_at'
    ) THEN
        CREATE TRIGGER trg_goal_transactions_updated_at
            BEFORE UPDATE ON public.goal_transactions
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

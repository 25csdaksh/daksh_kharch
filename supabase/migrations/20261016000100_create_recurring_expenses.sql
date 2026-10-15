-- ==============================================================================
-- HisabSetu — Phase 2 Database Migration
-- Tables: public.recurring_expenses, public.recurring_expense_occurrences
-- Feature: Recurring Expenses, Bill Reminders, and Safe Personal Expense Conversion
-- Migration Version: 20261016000100_create_recurring_expenses.sql
-- ==============================================================================

-- 1. Create recurring_expenses table
-- Stores master recurring expense schedules configured by users.
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 200),
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
    payment_method TEXT NOT NULL CHECK (
        payment_method IN (
            'Cash',
            'UPI',
            'Card',
            'Bank Transfer',
            'Other'
        )
    ),
    frequency TEXT NOT NULL CHECK (
        frequency IN ('daily', 'weekly', 'monthly', 'yearly')
    ),
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'paused', 'completed')
    ),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
    reminder_days_before INTEGER NOT NULL DEFAULT 1 CHECK (
        reminder_days_before >= 0 AND reminder_days_before <= 14
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create recurring_expense_occurrences table
-- Stores individual scheduled billing occurrences and links to paid personal expenses.
CREATE TABLE IF NOT EXISTS public.recurring_expense_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
    scheduled_due_date DATE NOT NULL,
    actual_payment_date DATE,
    actual_paid_amount NUMERIC(12,2) CHECK (
        actual_paid_amount IS NULL OR (actual_paid_amount > 0 AND actual_paid_amount <= 9999999999.99)
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'skipped')
    ),
    linked_expense_id UUID UNIQUE REFERENCES public.expenses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_occurrence_schedule_date UNIQUE (recurring_expense_id, scheduled_due_date)
);

-- 3. Indexes for fast dashboard and user-scoped queries
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_status 
    ON public.recurring_expenses (user_id, status);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_due 
    ON public.recurring_expenses (user_id, next_due_date ASC);

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_user_status 
    ON public.recurring_expense_occurrences (user_id, status);

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_user_due 
    ON public.recurring_expense_occurrences (user_id, scheduled_due_date ASC);

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_schedule 
    ON public.recurring_expense_occurrences (recurring_expense_id, scheduled_due_date DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_linked_expense 
    ON public.recurring_expense_occurrences (linked_expense_id);

-- 4. Attach updated_at triggers
DROP TRIGGER IF EXISTS set_recurring_expenses_updated_at ON public.recurring_expenses;
CREATE TRIGGER set_recurring_expenses_updated_at
    BEFORE UPDATE ON public.recurring_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_recurring_occurrences_updated_at ON public.recurring_expense_occurrences;
CREATE TRIGGER set_recurring_occurrences_updated_at
    BEFORE UPDATE ON public.recurring_expense_occurrences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_occurrences ENABLE ROW LEVEL SECURITY;

-- 6. Row Level Security Policies for recurring_expenses
DROP POLICY IF EXISTS "Users can view own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can view own recurring expenses"
    ON public.recurring_expenses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can insert own recurring expenses"
    ON public.recurring_expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can update own recurring expenses"
    ON public.recurring_expenses
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can delete own recurring expenses"
    ON public.recurring_expenses
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 7. Row Level Security Policies for recurring_expense_occurrences
DROP POLICY IF EXISTS "Users can view own occurrences" ON public.recurring_expense_occurrences;
CREATE POLICY "Users can view own occurrences"
    ON public.recurring_expense_occurrences
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own occurrences" ON public.recurring_expense_occurrences;
CREATE POLICY "Users can insert own occurrences"
    ON public.recurring_expense_occurrences
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own occurrences" ON public.recurring_expense_occurrences;
CREATE POLICY "Users can update own occurrences"
    ON public.recurring_expense_occurrences
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own occurrences" ON public.recurring_expense_occurrences;
CREATE POLICY "Users can delete own occurrences"
    ON public.recurring_expense_occurrences
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

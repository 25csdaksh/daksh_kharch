-- ==============================================================================
-- HisabSetu — Phase 4 Database Migration
-- Table Indexes: public.expenses, public.incomes, public.transfers
-- Description: Indexes to optimize multi-field search, date range filtering, and amount range filtering.
-- Migration Version: 20261018000100
-- ==============================================================================

-- 1. Optimize amount range queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_amount 
    ON public.expenses (user_id, amount);

CREATE INDEX IF NOT EXISTS idx_incomes_user_amount 
    ON public.incomes (user_id, amount);

CREATE INDEX IF NOT EXISTS idx_transfers_user_amount 
    ON public.transfers (user_id, amount);

-- 2. Optimize payment method and source filtering
CREATE INDEX IF NOT EXISTS idx_expenses_user_payment_method 
    ON public.expenses (user_id, payment_method);

CREATE INDEX IF NOT EXISTS idx_incomes_user_source 
    ON public.incomes (user_id, source);

-- 3. Composite date and amount index for high-velocity range queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_date_amount 
    ON public.expenses (user_id, expense_date DESC, amount);

CREATE INDEX IF NOT EXISTS idx_incomes_user_date_amount 
    ON public.incomes (user_id, income_date DESC, amount);

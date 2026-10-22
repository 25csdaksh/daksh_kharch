-- ==============================================================================
-- HisabSetu — My Ledger (Udhar Khatu / મારું ખાતું / ઉધાર ખાતું) Migration
-- Tables: public.ledger_contacts, public.ledger_entries
-- Description: Personal debt and credit ledger for tracking loans, borrowings,
--              repayments, and contact statements with atomic accounting rules.
-- Migration Version: 20261023000100
-- ==============================================================================

-- 1. Create public.ledger_contacts
CREATE TABLE IF NOT EXISTS public.ledger_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 150),
    phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
    email TEXT CHECK (email IS NULL OR char_length(email) <= 255),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create public.ledger_entries
-- entry_type:
--   'lend'            : Money I gave to contact (Receivable increases)
--   'borrow'          : Money I took from contact (Payable increases)
--   'repay_received'  : Money contact returned to me (Receivable decreases)
--   'repay_paid'      : Money I returned to contact (Payable decreases)
--   'adjustment'      : Audited correction (+ or - with mandatory reason)
--   'opening'         : Initial opening balance entry
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.ledger_contacts(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (
        entry_type IN ('lend', 'borrow', 'repay_received', 'repay_paid', 'adjustment', 'opening')
    ),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
    direction TEXT NOT NULL CHECK (direction IN ('receivable', 'payable')),
    transaction_date DATE NOT NULL,
    due_date DATE NULL,
    description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
    payment_method TEXT CHECK (
        payment_method IS NULL OR payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')
    ),
    reference_number TEXT CHECK (reference_number IS NULL OR char_length(reference_number) <= 100),
    linked_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    original_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
    adjustment_reason TEXT CHECK (adjustment_reason IS NULL OR char_length(adjustment_reason) <= 500),
    idempotency_key TEXT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for query and filtering performance
CREATE INDEX IF NOT EXISTS idx_ledger_contacts_user_archived 
    ON public.ledger_contacts (user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_ledger_contacts_user_name 
    ON public.ledger_contacts (user_id, name);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_contact 
    ON public.ledger_entries (user_id, contact_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date 
    ON public.ledger_entries (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_due_date 
    ON public.ledger_entries (user_id, due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_linked_account 
    ON public.ledger_entries (linked_account_id) WHERE linked_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_original_entry 
    ON public.ledger_entries (original_entry_id) WHERE original_entry_id IS NOT NULL;

-- 4. Set updated_at trigger
DROP TRIGGER IF EXISTS set_ledger_contacts_updated_at ON public.ledger_contacts;
CREATE TRIGGER set_ledger_contacts_updated_at
    BEFORE UPDATE ON public.ledger_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ledger_entries_updated_at ON public.ledger_entries;
CREATE TRIGGER set_ledger_entries_updated_at
    BEFORE UPDATE ON public.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.ledger_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: public.ledger_contacts
DROP POLICY IF EXISTS "Users can view own ledger contacts" ON public.ledger_contacts;
CREATE POLICY "Users can view own ledger contacts"
    ON public.ledger_contacts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own ledger contacts" ON public.ledger_contacts;
CREATE POLICY "Users can insert own ledger contacts"
    ON public.ledger_contacts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own ledger contacts" ON public.ledger_contacts;
CREATE POLICY "Users can update own ledger contacts"
    ON public.ledger_contacts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own ledger contacts" ON public.ledger_contacts;
CREATE POLICY "Users can delete own ledger contacts"
    ON public.ledger_contacts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 7. RLS Policies: public.ledger_entries
-- Ensures contact and linked_account belong strictly to the authenticated user
DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can view own ledger entries"
    ON public.ledger_entries FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can insert own ledger entries"
    ON public.ledger_entries FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.ledger_contacts c 
            WHERE c.id = contact_id AND c.user_id = auth.uid()
        )
        AND (
            linked_account_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM public.accounts a 
                WHERE a.id = linked_account_id AND a.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can update own ledger entries"
    ON public.ledger_entries FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.ledger_contacts c 
            WHERE c.id = contact_id AND c.user_id = auth.uid()
        )
        AND (
            linked_account_id IS NULL 
            OR EXISTS (
                SELECT 1 FROM public.accounts a 
                WHERE a.id = linked_account_id AND a.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can delete own ledger entries"
    ON public.ledger_entries FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

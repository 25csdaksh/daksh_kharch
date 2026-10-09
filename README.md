# PaisaTrack — Personal Expense Tracker & Live Financial Analytics

PaisaTrack is a production-grade personal expense tracking web application built with **React 19**, **Vite 6**, **React Router 7**, **Recharts**, and **Supabase PostgreSQL** with strict **Row Level Security (RLS)**.

---

## 🛠️ Prerequisites & System Requirements

- **Node.js**: v18.0.0 or higher (Tested on Node v25.4.0)
- **npm**: v9.0.0 or higher (Tested on npm 11.7.0)
- **Git**: For version control
- **Supabase Account**: [https://supabase.com](https://supabase.com) (Free tier supported)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/25csdaksh/daksh_kharch.git
cd daksh_kharch
npm install
```

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. In your Supabase project dashboard, navigate to **Project Settings** -> **API**.
3. Fill in your project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
   ```

> 🔒 **Security Notice:** Never commit your `.env` file or expose service-role keys in client-side code. The `anon` key is safely restricted by Row Level Security.

---

## 🗄️ Database Setup & SQL Migration

To create the `expenses` table, indexes, updated_at triggers, and Row Level Security policies:

### Method 1: Using Supabase Dashboard SQL Editor (Recommended)
1. In your Supabase Dashboard, click **SQL Editor** in the left navigation.
2. Click **New Query**.
3. Copy and paste the complete contents of [`supabase/migrations/20261009000100_create_expenses.sql`](file:///e:/daksh_kharch/supabase/migrations/20261009000100_create_expenses.sql).
4. Click **Run**.
5. Verify table creation in **Table Editor** -> `expenses`.

### Method 2: Using Supabase CLI
```bash
supabase db push
```

---

## 📊 Database Schema & Row Level Security

### `public.expenses` Table Definition
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique transaction ID |
| `user_id` | `UUID` | `REFERENCES auth.users(id) ON DELETE CASCADE`, Default `auth.uid()` | Authenticated owner ID |
| `amount` | `NUMERIC(12,2)` | `NOT NULL`, `CHECK (amount > 0 AND amount <= 9999999999.99)` | Monetary transaction value |
| `category` | `TEXT` | `NOT NULL`, `CHECK (category IN ('Food', 'Transport', 'Shopping', 'Education', 'Entertainment', 'Bills', 'Healthcare', 'Personal Care', 'Other'))` | Allowed expense category |
| `description` | `TEXT` | `CHECK (char_length(description) <= 500)` | Optional merchant/notes |
| `expense_date` | `DATE` | `NOT NULL` | Calendar transaction date |
| `payment_method` | `TEXT` | `NOT NULL`, `CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'))` | Payment medium |
| `created_at` | `TIMESTAMPTZ` | Default `now()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Default `now()`, updated via trigger | Record last modified |

### 🛡️ Row Level Security (RLS) Policies
- **SELECT**: `auth.uid() = user_id` (Users only view their own records).
- **INSERT**: `auth.uid() = user_id` (Users only insert records bound to their authenticated UID).
- **UPDATE**: `auth.uid() = user_id` (Users only update their own rows; ownership cannot be transferred).
- **DELETE**: `auth.uid() = user_id` (Users only delete their own rows).

---

## 🧪 Two-Account RLS User Isolation Verification

To verify that Row Level Security strictly isolates user financial records:
1. Open the app in a regular browser window and sign up Account A (`user_a@example.com`).
2. Add 2 expenses (e.g. ₹500 for Food and ₹200 for Transport). Verify they appear on Account A's Dashboard and Ledger.
3. Open an Incognito/Private window and sign up Account B (`user_b@example.com`).
4. **Observe**: Account B's Dashboard and Ledger start completely empty with ₹0 totals. Account A's records are completely inaccessible.
5. Add an expense under Account B (e.g. ₹1,200 for Bills).
6. Refresh Account A's browser: Account A only sees their own 2 transactions (₹700 total), and Account B's ₹1,200 bill is completely hidden.

---

## 💻 Available Scripts

- **Development Server**: `npm run dev`
- **Automated Unit Tests**: `npm test`
- **Production Build**: `npm run build`
- **Preview Production Build**: `npm run preview`

---

## 📁 Project Architecture

```text
src/
├── lib/
│   └── supabase.js             # Supabase JS client with validation & fallbacks
├── context/
│   └── AuthContext.jsx         # Global AuthProvider & useAuth hook
├── services/
│   └── expenseService.js       # Live Supabase CRUD & metric aggregation
├── utils/
│   └── dateUtils.js            # Calendar boundaries, INR formatting, & validation
├── components/
│   ├── auth/
│   │   ├── AuthLoadingScreen.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── PublicRoute.jsx
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── common/
│   │   ├── AddExpenseModal.jsx  # Real expense create/edit modal
│   │   ├── DemoNotice.jsx       # Real-time DB & RLS status badge
│   │   └── StatCard.jsx         # KPI summary card
│   └── dashboard/
│       ├── BudgetProgress.jsx   # Live budget gauge
│       ├── CategoryBreakdownChart.jsx # Live category donut chart
│       ├── RecentExpenses.jsx   # Live recent transactions table
│       └── WeeklySpendingChart.jsx # Live weekly daily bar chart
└── pages/
    ├── DashboardPage.jsx       # Live dashboard overview
    ├── ExpensesPage.jsx        # Live expense ledger & filter engine
    ├── LoginPage.jsx           # Sign in view
    ├── ReportsPage.jsx         # Reports & analytics preview
    ├── ResetPasswordPage.jsx   # Password recovery view
    ├── SettingsPage.jsx        # Account settings view
    └── SignupPage.jsx          # Registration view
```

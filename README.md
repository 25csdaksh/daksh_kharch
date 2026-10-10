# HisabSetu — Personal Expense Tracker & Smart Financial Bridge

HisabSetu is a production-grade personal expense tracking web application built with **React 19**, **Vite 6**, **React Router 7**, **Recharts**, and **Supabase PostgreSQL** with strict **Row Level Security (RLS)**.

---

## 🛠️ Prerequisites & System Requirements

- **Node.js**: v18.0.0 or higher (Tested on Node v25.4.0)
- **npm**: v9.0.0 or higher (Tested on npm 11.7.0)
- **Git**: For version control
- **Supabase Account**: [https://supabase.com](https://supabase.com) (Free tier supported)
- **Vercel Account**: [https://vercel.com](https://vercel.com) (For production hosting)

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

To create the `expenses` table, indexes, `updated_at` triggers, and Row Level Security policies:

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

Anonymous/unauthenticated requests have **zero access** to any rows.

---

## 🧪 Production Verification & Isolation Testing Procedure

To safely verify multi-tenant isolation without touching production data:

1. **Create Account 1** (e.g. `tester-a@example.com`):
   - Sign up at `/signup`.
   - Add an expense: `Food`, `₹450`, description: `Test Expense A`.
   - Confirm it appears on the Dashboard and Expense Ledger.
2. **Create Account 2** (e.g. `tester-b@example.com`):
   - Open an incognito/private browser window.
   - Sign up with the second account.
   - Open `/expenses` and verify that the ledger is **completely empty** (0 records). `Test Expense A` is not visible.
   - Add an expense: `Bills`, `₹1200`, description: `Test Expense B`.
3. **Verify Cross-Tenant Immutability**:
   - In Account 1's window, refresh the page: Account 1 continues to see only `Test Expense A`.
   - Attempting to query, update, or delete Account 2's ID via Supabase client fails immediately with an RLS policy violation.
4. **Log out** from both test sessions. Protected routes (`/`, `/expenses`, `/reports`, `/settings`) immediately redirect to `/login`.

---

## 🚀 Vercel Deployment Guide

PaisaTrack is pre-configured for seamless single-page application (SPA) deployment on Vercel.

### 1. Vercel Configuration (`vercel.json`)
The repository includes `vercel.json` with SPA route rewrites:
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This ensures direct URLs (e.g. `/expenses`, `/reports`, `/reset-password`) do not return 404 errors on browser reload.

### 2. Environment Variables on Vercel
In your Vercel Project Dashboard -> **Settings** -> **Environment Variables**, add:
- `VITE_SUPABASE_URL`: Your Supabase project URL (e.g. `https://xyzcompany.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon or publishable key

### 3. Supabase Redirect URL Configuration
In your Supabase Dashboard -> **Authentication** -> **URL Configuration**:
1. Set **Site URL** to your production domain:
   ```
   https://your-paisatrack-app.vercel.app
   ```
2. In **Redirect URLs**, add:
   ```
   https://your-paisatrack-app.vercel.app/login
   https://your-paisatrack-app.vercel.app/reset-password
   ```

---

## 📈 Advanced Financial Reports & Analytics

The `/reports` view provides multi-period deep financial intelligence based on real PostgreSQL data:

### 1. Reporting Periods & Time-Travel Navigation
- **Weekly**: Exact Monday–Sunday calendar interval with previous/next week navigation.
- **Monthly**: Exact calendar month with 28, 29 (leap year), 30, and 31 day handling.
- **Yearly**: Complete 12-month calendar overview (Jan–Dec) with timezone-safe parsing.
- **Custom Range**: Custom start and end date selection with date order validation.

### 2. Analytical Metrics
- **Total Expenditure & Transaction Count**: Aggregates all authenticated records in the period.
- **Comparative Deltas**: Automatic comparison with prior period (`+X%` / `-X%` / `No prior spending`).
- **Average Spend Calculation**: Daily average for weekly/monthly/custom periods; monthly average for yearly period.
- **Peak Metrics**: Identifies peak spending days, peak spending months, and top spending categories.
- **Timeline & Distribution Charts**: Recharts daily/monthly bar visualization and donut category chart.
- **Category Distribution Ledger**: Tabular category breakdown including percentage shares and average ticket size per transaction.

### 3. CSV Data Export & Formula Injection Security
- Click **Download CSV** to export the filtered transactions for any selected period.
- RFC-4180 compliant with UTF-8 BOM encoding for Microsoft Excel compatibility.
- **Formula Injection Mitigation**: Automatically sanitizes cells starting with `=`, `+`, `-`, `@`, Tab, or Carriage Returns by prefixing single quotes.

---

## 🧪 Automated Testing

Run the automated test suite:

```bash
npm test
```

Test coverage includes 42 tests across 20 test suites:
- Input validation constraints (amounts, enums, dates, length limits).
- Multi-tenant isolation and RLS security contract.
- Monday–Sunday week boundaries and offsets without timezone skew.
- Month boundaries (including Feb in leap year 2024 and non-leap years).
- Year boundaries for all 12 calendar months.
- Comparative period percentage calculation & zero denominator handling.
- Category share percentages and top category identification.
- CSV sanitization, quote escaping, and formula injection mitigation.
- Indian numbering system (Lakhs and Crores) currency formatting.

---

## 💻 Available Scripts

- **Development Server**: `npm run dev`
- **Automated Unit & E2E Tests**: `npm test`
- **Production Build**: `npm run build`
- **Preview Production Build**: `npm run preview`

---

## 📁 Project Architecture

```text
src/
├── lib/
│   └── supabase.js             # Supabase JS client with validation & fallbacks
├── context/
│   └── AuthContext.jsx         # Global AuthProvider, useAuth hook, resendConfirmation
├── services/
│   └── expenseService.js       # Live Supabase CRUD & metric aggregation
├── utils/
│   ├── dateUtils.js            # Calendar boundaries, INR formatting, & validation
│   └── reportUtils.js          # Period boundaries, delta analytics & CSV export
├── components/
│   ├── auth/
│   │   ├── AuthLoadingScreen.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── PublicRoute.jsx
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   ├── Header.jsx          # Interactive search and notifications
│   │   └── Sidebar.jsx         # Responsive navigation & user profile
│   ├── common/
│   │   ├── AddExpenseModal.jsx  # Expense create/edit modal with validation
│   │   ├── DemoNotice.jsx       # Real-time DB & RLS status badge
│   │   └── StatCard.jsx         # KPI summary card
│   ├── dashboard/
│   │   ├── BudgetProgress.jsx   # Live budget gauge
│   │   ├── CategoryBreakdownChart.jsx # Live category donut chart
│   │   ├── RecentExpenses.jsx   # Live recent transactions table
│   │   └── WeeklySpendingChart.jsx # Live weekly daily bar chart
│   └── reports/
│       ├── ReportCategoryTable.jsx # Category breakdown table & average metrics
│       └── ReportTimelineChart.jsx # Multi-period timeline bar chart
└── pages/
    ├── DashboardPage.jsx       # Live dashboard overview (Lazy loaded)
    ├── ExpensesPage.jsx        # Live expense ledger & filter engine (Lazy loaded)
    ├── LoginPage.jsx           # Sign in view with email confirmation support
    ├── ReportsPage.jsx         # Advanced financial reports & analytics (Lazy loaded)
    ├── ResetPasswordPage.jsx   # Password recovery view (Lazy loaded)
    ├── SettingsPage.jsx        # Account settings & preferences (Lazy loaded)
    └── SignupPage.jsx          # Registration view (Lazy loaded)
```

# PaisaTrack — Personal Expense Tracker & Budget Analytics

PaisaTrack is a modern, high-performance personal expense tracking web application built with **React 19**, **Vite 6**, **React Router 7**, **Recharts**, and **Supabase Authentication**.

---

## 🛠️ Prerequisites & System Requirements

- **Node.js**: v18.0.0 or higher (Tested on Node v25.4.0)
- **npm**: v9.0.0 or higher (Tested on npm 11.7.0)
- **Git**: For version control

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd daksh_kharch
npm install
```

### 2. Configure Supabase Authentication

1. Navigate to [Supabase](https://supabase.com/) and create a free project.
2. In your Supabase project dashboard, navigate to **Project Settings** -> **API**.
3. Locate:
   - **Project URL** (e.g. `https://your-project-id.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key (e.g. `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Create your local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

5. Populate `.env` with your project credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

> ⚠️ **Security Notice:** Never commit your `.env` file or expose secret service-role keys in client-side code. The `anon` key is safe for client browser consumption.

### 3. Start Development Server

```bash
npm run dev
```

Open your browser and visit: `http://localhost:5173`

---

## 🔒 Authentication Flow & Testing Guide

### 1. User Sign Up (`/signup`)
- Visit `/signup`.
- Enter your Full Name, Email, and a password (minimum 6 characters).
- **Email Confirmation**: If *Confirm Email* is enabled in your Supabase Auth Settings (Authentication -> Providers -> Email), check your inbox for the confirmation email before logging in.
- **Auto-Confirm**: If email confirmation is disabled in Supabase development mode, you will immediately be logged in and redirected to the `/` dashboard.

### 2. User Sign In (`/login`)
- Visit `/login`.
- Enter your registered email and password.
- Upon successful authentication, your session is securely persisted and you will be redirected to the dashboard.

### 3. Protected Route Navigation
- Protected routes include: `/` (Dashboard), `/expenses` (Ledger), `/reports` (Analytics), and `/settings` (Settings).
- If unauthenticated, navigating directly to these URLs safely redirects to `/login`, preserving your destination in navigation state.

### 4. Password Recovery & Reset (`/reset-password`)
- Click **Forgot password?** on the `/login` screen.
- Enter your registered email address to receive password reset instructions.
- Follow the email link back to the application to set and confirm a new password.

### 5. Secure Sign Out
- Click the **Sign Out** button in the sidebar profile section or top-right header menu.
- Supabase session tokens are cleared, and you are redirected back to the `/login` screen.

---

## 🎨 Design System & Palette

- **Background**: `#F7F8F5`
- **Surface**: `#FFFFFF`
- **Primary**: `#245C45`
- **Secondary**: `#DCE9DF`
- **Text**: `#202923`
- **Muted Text**: `#727B73`
- **Accent**: `#D8B86A`
- **Border**: `#E7EBE5`

---

## 🔍 Troubleshooting & Common Errors

| Issue | Root Cause | Resolution |
|---|---|---|
| **"Supabase Setup Required" Screen** | Missing or placeholder `.env` variables | Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined in `.env` and restart Vite dev server (`npm run dev`). |
| **"Invalid login credentials"** | Incorrect email/password or email not yet verified | Verify email confirmation status in Supabase Dashboard -> Authentication -> Users. |
| **"Auth session missing" after refresh** | Browser cookie/localStorage blocked | Ensure browser allows third-party storage or standard localStorage permissions for session synchronization. |

---

## 📦 Project Architecture

```text
src/
├── lib/
│   └── supabase.js            # Supabase JS client with validation & safe fallbacks
├── context/
│   └── AuthContext.jsx        # Global AuthProvider, session lifecycle & useAuth hook
├── components/
│   ├── auth/
│   │   ├── AuthLoadingScreen.jsx   # Polished session hydration loading screen
│   │   ├── ProtectedRoute.jsx      # Route guard with setup & session checks
│   │   └── PublicRoute.jsx         # Guard for unauthenticated routes
│   ├── layout/
│   │   ├── AppLayout.jsx           # Main shared shell
│   │   ├── Header.jsx              # Header with user avatar and menu
│   │   └── Sidebar.jsx             # Sidebar with active route and user logout
│   ├── common/
│   │   ├── AddExpenseModal.jsx     # Expense creation modal (Phase 1/2 UI preview)
│   │   ├── DemoNotice.jsx          # Live auth state & preview disclaimer
│   │   └── StatCard.jsx            # KPI summary card
│   └── dashboard/
│       ├── BudgetProgress.jsx      # Budget gauge
│       ├── CategoryBreakdownChart.jsx # Donut chart
│       ├── RecentExpenses.jsx      # Transaction table
│       └── WeeklySpendingChart.jsx # Weekly bar chart
└── pages/
    ├── Auth.css               # Shared authentication styles
    ├── DashboardPage.jsx      # Main dashboard view
    ├── ExpensesPage.jsx       # Expense ledger view
    ├── LoginPage.jsx          # Supabase Sign In view
    ├── ReportsPage.jsx        # Reports & analytics view
    ├── ResetPasswordPage.jsx  # Password recovery & reset view
    ├── SettingsPage.jsx       # Account & currency settings
    └── SignupPage.jsx         # Supabase registration view
```

---

## 🛠️ Verification & Build Commands

- Development: `npm run dev`
- Production Build: `npm run build`
- Preview Build: `npm run preview`

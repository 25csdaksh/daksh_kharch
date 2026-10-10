/**
 * PaisaTrack Mock Preview Data
 * 
 * NOTE: This is demonstration data only for UI preview purposes.
 * No data is fetched from or persisted to a backend database in Phase 1.
 */

export const DEMO_METADATA = {
  isDemo: true,
  lastUpdated: 'Just now (Demo Session)',
  currency: '₹',
  user: {
    name: 'Daksh Sharma',
    email: 'daksh@example.com',
    avatar: 'DS',
    role: 'Personal Plan'
  }
};

export const SUMMARY_STATS = {
  spentToday: {
    amount: 850,
    changePercentage: -12.5,
    comparisonText: 'vs yesterday (₹970)'
  },
  spentThisWeek: {
    amount: 5420,
    changePercentage: 4.8,
    comparisonText: 'vs last week (₹5,170)'
  },
  spentThisMonth: {
    amount: 24800,
    changePercentage: -2.1,
    comparisonText: 'vs last month same day'
  },
  monthlyBudget: {
    totalBudget: 45000,
    spentAmount: 24800,
    remainingAmount: 20200,
    spentPercentage: 55.1
  }
};

export const WEEKLY_SPENDING_DATA = [
  { day: 'Mon', amount: 920, budget: 1500 },
  { day: 'Tue', amount: 1450, budget: 1500 },
  { day: 'Wed', amount: 680, budget: 1500 },
  { day: 'Thu', amount: 850, budget: 1500 },
  { day: 'Fri', amount: 1120, budget: 1500 },
  { day: 'Sat', amount: 2100, budget: 1500 },
  { day: 'Sun', amount: 400, budget: 1500 }
];

export const CATEGORY_BREAKDOWN_DATA = [
  { name: 'Food', value: 9200, color: '#10B981', percentage: 37 },
  { name: 'Bills', value: 6500, color: '#EF4444', percentage: 26 },
  { name: 'Transport', value: 3400, color: '#2563EB', percentage: 14 },
  { name: 'Entertainment', value: 2800, color: '#F59E0B', percentage: 11 },
  { name: 'Healthcare', value: 1800, color: '#06B6D4', percentage: 7 },
  { name: 'Shopping', value: 1100, color: '#EC4899', percentage: 5 }
];

export const RECENT_EXPENSES = [
  {
    id: 'exp-1',
    title: 'Whole Foods Market',
    category: 'Food',
    date: 'Today, 2:45 PM',
    amount: 850,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'exp-2',
    title: 'Metro Transit Card Recharge',
    category: 'Transport',
    date: 'Yesterday, 9:10 AM',
    amount: 500,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'exp-3',
    title: 'Blue Tokai Coffee Roasters',
    category: 'Entertainment',
    date: 'Oct 07, 4:30 PM',
    amount: 320,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'exp-4',
    title: 'Electricity & Utility Bill',
    category: 'Bills',
    date: 'Oct 05, 11:15 AM',
    amount: 2150,
    paymentMethod: 'Bank Transfer',
    status: 'Completed'
  },
  {
    id: 'exp-5',
    title: 'Pharmacy & Health Supplies',
    category: 'Healthcare',
    date: 'Oct 04, 6:00 PM',
    amount: 680,
    paymentMethod: 'Card',
    status: 'Completed'
  }
];

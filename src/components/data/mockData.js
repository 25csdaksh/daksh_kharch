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
  { name: 'Groceries & Food', value: 9200, color: '#245C45', percentage: 37 },
  { name: 'Housing & Utilities', value: 6500, color: '#407B63', percentage: 26 },
  { name: 'Transportation', value: 3400, color: '#669C85', percentage: 14 },
  { name: 'Entertainment & Leisure', value: 2800, color: '#D8B86A', percentage: 11 },
  { name: 'Healthcare & Fitness', value: 1800, color: '#88B7A4', percentage: 7 },
  { name: 'Other Discretionary', value: 1100, color: '#BACEC4', percentage: 5 }
];

export const RECENT_EXPENSES = [
  {
    id: 'exp-1',
    title: 'Whole Foods Market',
    category: 'Groceries & Food',
    date: 'Today, 2:45 PM',
    amount: 850,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'exp-2',
    title: 'Metro Transit Card Recharge',
    category: 'Transportation',
    date: 'Yesterday, 9:10 AM',
    amount: 500,
    paymentMethod: 'Debit Card',
    status: 'Completed'
  },
  {
    id: 'exp-3',
    title: 'Blue Tokai Coffee Roasters',
    category: 'Entertainment & Leisure',
    date: 'Oct 07, 4:30 PM',
    amount: 320,
    paymentMethod: 'UPI',
    status: 'Completed'
  },
  {
    id: 'exp-4',
    title: 'Electricity & Utility Bill',
    category: 'Housing & Utilities',
    date: 'Oct 05, 11:15 AM',
    amount: 2150,
    paymentMethod: 'Net Banking',
    status: 'Completed'
  },
  {
    id: 'exp-5',
    title: 'Pharmacy & Health Supplies',
    category: 'Healthcare & Fitness',
    date: 'Oct 04, 6:00 PM',
    amount: 680,
    paymentMethod: 'Credit Card',
    status: 'Completed'
  }
];

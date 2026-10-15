import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import SearchBar from '../components/search/SearchBar';
import SmartFilterDrawer from '../components/search/SmartFilterDrawer';
import TransactionList from '../components/search/TransactionList';
import AddExpenseModal from '../components/common/AddExpenseModal';
import { searchTransactions } from '../services/searchService';
import { getAccounts } from '../services/accountService';
import {
  filtersToSearchParams,
  searchParamsToFilters
} from '../utils/filterUtils';
import { formatCurrencyINR } from '../utils/dateUtils';
import './SearchPage.css';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState(() => searchParamsToFilters(searchParams));
  const [accounts, setAccounts] = useState([]);

  // Results & Pagination state
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [limit] = useState(40);
  const [offset, setOffset] = useState(0);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalIncomes: 0,
    totalTransfers: 0,
    netCashFlow: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Expense modal state if clicked
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load accounts for filter dropdown
  useEffect(() => {
    getAccounts({ includeArchived: true })
      .then((data) => setAccounts(data || []))
      .catch((err) => console.warn('Could not load accounts in SearchPage:', err));
  }, []);

  // Synchronize state with URL search params
  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setOffset(0);
    const newParams = filtersToSearchParams(newFilters);
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    const blankFilters = {
      query: '',
      datePreset: 'all',
      startDate: '',
      endDate: '',
      type: 'all',
      category: 'all',
      accountId: '',
      paymentMethod: 'all',
      minAmount: '',
      maxAmount: '',
      isRecurring: false,
      isSplit: false
    };
    updateFilters(blankFilters);
  }, [updateFilters]);

  // Execute Search query
  const executeSearch = useCallback(async (isLoadMore = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const targetOffset = isLoadMore ? offset : 0;

      const result = await searchTransactions({
        query: filters.query,
        datePreset: filters.datePreset,
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: filters.type,
        category: filters.category,
        accountId: filters.accountId,
        paymentMethod: filters.paymentMethod,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        isRecurring: filters.isRecurring,
        isSplit: filters.isSplit,
        limit,
        offset: targetOffset
      });

      if (isLoadMore) {
        setTransactions((prev) => [...prev, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }

      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setSummary(result.summary);
    } catch (err) {
      console.error('Search query error:', err);
      setError(err.message || 'Failed to search transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, offset, limit]);

  // Trigger search whenever filters change
  useEffect(() => {
    executeSearch(false);
  }, [filters, executeSearch]);

  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    // Execute search with next offset
    searchTransactions({
      ...filters,
      limit,
      offset: nextOffset
    }).then((result) => {
      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
    }).catch(console.error);
  };

  const handleSelectTransaction = (tx) => {
    if (tx.type === 'expense') {
      setEditingExpense({
        id: tx.id,
        amount: tx.amount,
        category: tx.category,
        payment_method: tx.paymentMethod,
        expense_date: tx.date,
        description: tx.description,
        account_id: tx.account?.id || ''
      });
      setIsEditModalOpen(true);
    }
  };

  return (
    <div className="search-page-container">
      <div className="search-header-titles">
        <h1>Transaction Search & Smart Filters</h1>
        <p>Instant multi-attribute search across expenses, incomes, and inter-account transfers</p>
      </div>

      {/* Main Search Input */}
      <SearchBar
        value={filters.query}
        onChange={(q) => updateFilters({ ...filters, query: q })}
        onClear={() => updateFilters({ ...filters, query: '' })}
        isLoading={isLoading}
      />

      {/* Smart Filter Drawer */}
      <SmartFilterDrawer
        filters={filters}
        onChange={updateFilters}
        onReset={handleResetFilters}
        accounts={accounts}
      />

      {/* Metrics Summary Bar */}
      <div className="search-metrics-summary-bar">
        <div className="search-metric-item">
          <span className="metric-label">Matching Records</span>
          <span className="metric-value">{totalCount}</span>
        </div>

        {(filters.type === 'all' || filters.type === 'expense') && (
          <div className="search-metric-item">
            <span className="metric-label">Total Expenses</span>
            <span className="metric-value expense">
              {formatCurrencyINR(summary.totalExpenses)}
            </span>
          </div>
        )}

        {(filters.type === 'all' || filters.type === 'income') && (
          <div className="search-metric-item">
            <span className="metric-label">Total Incomes</span>
            <span className="metric-value income">
              {formatCurrencyINR(summary.totalIncomes)}
            </span>
          </div>
        )}

        {filters.type === 'all' && (
          <div className="search-metric-item">
            <span className="metric-label">Net Cash Flow</span>
            <span className={`metric-value ${summary.netCashFlow >= 0 ? 'income' : 'expense'}`}>
              {formatCurrencyINR(summary.netCashFlow)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="modal-error-alert" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transaction Results List */}
      <TransactionList
        transactions={transactions}
        query={filters.query}
        totalCount={totalCount}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        isLoading={isLoading}
        onSelectTransaction={handleSelectTransaction}
      />

      {/* Edit Expense Modal */}
      {isEditModalOpen && (
        <AddExpenseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          expenseToEdit={editingExpense}
          onSuccess={() => executeSearch(false)}
        />
      )}
    </div>
  );
}

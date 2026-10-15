import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  PlusCircle,
  ArrowRightLeft,
  TrendingUp,
  CreditCard,
  Landmark,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  getAccountsSummary,
  getTransfers,
  archiveAccount,
  unarchiveAccount,
  deleteAccount,
  deleteTransfer
} from '../services/accountService';
import { formatCurrencyINR, formatDateDisplay } from '../utils/dateUtils';
import { isLiabilityAccount } from '../utils/accountUtils';
import AccountCard from '../components/accounts/AccountCard';
import AccountModal from '../components/accounts/AccountModal';
import TransferModal from '../components/accounts/TransferModal';
import IncomeModal from '../components/accounts/IncomeModal';
import AccountDetailModal from '../components/accounts/AccountDetailModal';
import './AccountsPage.css';

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [data, setData] = useState({
    accounts: [],
    summary: { totalLiquidAssets: 0, totalCreditLiabilities: 0, netWorth: 0 },
    unassignedExpensesTotal: 0,
    unassignedExpensesCount: 0
  });
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceAccount, setTransferSourceAccount] = useState(null);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeTargetAccount, setIncomeTargetAccount] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailAccount, setSelectedDetailAccount] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [summaryData, transferData] = await Promise.all([
        getAccountsSummary({ includeArchived: true }),
        getTransfers({ limit: 10 })
      ]);
      setData(summaryData);
      setRecentTransfers(transferData?.transfers || []);
    } catch (err) {
      console.error('Failed to load accounts summary:', err);
      setError(err.message || 'Failed to load accounts and wallets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleAccountChange = () => {
      fetchData();
    };

    window.addEventListener('account:changed', handleAccountChange);
    return () => {
      window.removeEventListener('account:changed', handleAccountChange);
    };
  }, [fetchData]);

  // Handlers
  const handleOpenCreateAccount = () => {
    setAccountToEdit(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (acc) => {
    setAccountToEdit(acc);
    setIsAccountModalOpen(true);
  };

  const handleOpenTransfer = (srcAcc = null) => {
    setTransferSourceAccount(srcAcc);
    setIsTransferModalOpen(true);
  };

  const handleOpenIncome = (tgtAcc = null) => {
    setIncomeTargetAccount(tgtAcc);
    setIsIncomeModalOpen(true);
  };

  const handleViewDetail = (acc) => {
    setSelectedDetailAccount(acc);
    setIsDetailModalOpen(true);
  };

  const handleArchive = async (acc) => {
    if (window.confirm(`Archive "${acc.name}"? It will be hidden from active lists but all transaction records will be preserved.`)) {
      try {
        await archiveAccount(acc.id);
        fetchData();
      } catch (err) {
        alert(err.message || 'Failed to archive account.');
      }
    }
  };

  const handleUnarchive = async (acc) => {
    try {
      await unarchiveAccount(acc.id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to restore account.');
    }
  };

  const handleDelete = async (acc) => {
    if (window.confirm(`Are you sure you want to permanently delete "${acc.name}"? This action cannot be undone.`)) {
      try {
        await deleteAccount(acc.id);
        fetchData();
      } catch (err) {
        alert(err.message || 'Could not delete account.');
      }
    }
  };

  const handleDeleteTransfer = async (tId) => {
    if (window.confirm('Delete this transfer record? Account balances will be reverted.')) {
      try {
        await deleteTransfer(tId);
        fetchData();
      } catch (err) {
        alert(err.message || 'Could not delete transfer.');
      }
    }
  };

  const filteredAccounts = data.accounts.filter((a) =>
    activeTab === 'active' ? !a.is_archived : a.is_archived
  );

  const assetAccounts = filteredAccounts.filter((a) => !isLiabilityAccount(a.type));
  const liabilityAccounts = filteredAccounts.filter((a) => isLiabilityAccount(a.type));

  return (
    <div className="accounts-page-container">
      {/* Page Header */}
      <div className="accounts-header-section">
        <div className="accounts-header-titles">
          <h1>Wallets & Accounts</h1>
          <p>Multi-account management, liquid asset tracking, and inter-account transfers</p>
        </div>

        <div className="accounts-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenTransfer()}
            disabled={data.accounts.filter((a) => !a.is_archived).length < 2}
            title={data.accounts.length < 2 ? 'Need at least 2 accounts to transfer' : 'Transfer money'}
          >
            <ArrowRightLeft size={16} />
            <span>Transfer</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenIncome()}
            title="Add income or deposit"
          >
            <TrendingUp size={16} />
            <span>Add Income</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateAccount}
          >
            <PlusCircle size={16} />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="modal-error-alert" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ marginLeft: 'auto' }}
            onClick={fetchData}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards: Net Worth, Liquid Assets, Credit Liabilities */}
      <div className="accounts-kpi-grid">
        <div className="account-kpi-card net-worth">
          <div>
            <div className="kpi-title">Net Financial Worth</div>
            <div className="kpi-amount">
              {formatCurrencyINR(data.summary.netWorth)}
            </div>
            <div className="kpi-subtext">
              Liquid Assets minus Credit Liabilities
            </div>
          </div>
          <div className="kpi-icon-pill emerald" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="account-kpi-card liquid-assets">
          <div>
            <div className="kpi-title">Total Liquid Assets</div>
            <div className="kpi-amount">
              {formatCurrencyINR(data.summary.totalLiquidAssets)}
            </div>
            <div className="kpi-subtext">
              Cash in Hand + Bank Accounts + UPI Wallets
            </div>
          </div>
          <div className="kpi-icon-pill blue" aria-hidden="true">
            <Landmark size={22} />
          </div>
        </div>

        <div className="account-kpi-card liabilities">
          <div>
            <div className="kpi-title">Credit Card Liabilities</div>
            <div className="kpi-amount liability">
              {formatCurrencyINR(data.summary.totalCreditLiabilities)}
            </div>
            <div className="kpi-subtext">
              Outstanding Unpaid Credit Card Balances
            </div>
          </div>
          <div className="kpi-icon-pill red" aria-hidden="true">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Historical unassigned transactions banner */}
      {data.unassignedExpensesCount > 0 && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            color: '#B45309',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.5rem'
          }}
        >
          <Info size={16} className="flex-shrink-0" />
          <span>
            You have <strong>{data.unassignedExpensesCount}</strong> historical expense(s) totaling{' '}
            <strong>{formatCurrencyINR(data.unassignedExpensesTotal)}</strong> not assigned to any specific wallet. You can link them to an account anytime from the Expense Ledger.
          </span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="accounts-tabs-row">
        <div className="tab-pill-group">
          <button
            type="button"
            className={`tab-pill-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Accounts ({data.accounts.filter((a) => !a.is_archived).length})
          </button>
          <button
            type="button"
            className={`tab-pill-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            Archived ({data.accounts.filter((a) => a.is_archived).length})
          </button>
        </div>

        <button
          type="button"
          className="btn-icon-only"
          onClick={fetchData}
          title="Refresh Accounts"
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
        </button>
      </div>

      {/* Empty State */}
      {filteredAccounts.length === 0 && (
        <div className="accounts-empty-state">
          <div className="empty-icon-circle" aria-hidden="true">
            <Wallet size={32} />
          </div>
          <h3>{activeTab === 'active' ? 'No Accounts Created Yet' : 'No Archived Accounts'}</h3>
          <p>
            {activeTab === 'active'
              ? 'Create your first cash wallet, bank account, or credit card to track balances and transfer money.'
              : 'Accounts you archive will appear here safely without deleting any financial records.'}
          </p>
          {activeTab === 'active' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateAccount}
            >
              <PlusCircle size={16} />
              <span>Create Your First Account</span>
            </button>
          )}
        </div>
      )}

      {/* Liquid Assets / Wallets Grid */}
      {assetAccounts.length > 0 && (
        <>
          <div className="section-group-title">
            <Landmark size={18} className="text-emerald" />
            <span>Liquid Assets & Wallets ({assetAccounts.length})</span>
          </div>
          <div className="accounts-grid">
            {assetAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onTransfer={() => handleOpenTransfer(acc)}
                onViewHistory={() => handleViewDetail(acc)}
                onEdit={() => handleEditAccount(acc)}
                onArchive={() => handleArchive(acc)}
                onUnarchive={() => handleUnarchive(acc)}
                onDelete={() => handleDelete(acc)}
              />
            ))}
          </div>
        </>
      )}

      {/* Credit Cards / Liabilities Grid */}
      {liabilityAccounts.length > 0 && (
        <>
          <div className="section-group-title">
            <CreditCard size={18} className="text-danger" />
            <span>Credit Cards & Liabilities ({liabilityAccounts.length})</span>
          </div>
          <div className="accounts-grid">
            {liabilityAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onTransfer={() => handleOpenTransfer(acc)}
                onViewHistory={() => handleViewDetail(acc)}
                onEdit={() => handleEditAccount(acc)}
                onArchive={() => handleArchive(acc)}
                onUnarchive={() => handleUnarchive(acc)}
                onDelete={() => handleDelete(acc)}
              />
            ))}
          </div>
        </>
      )}

      {/* Recent Inter-Account Transfers Feed */}
      {recentTransfers.length > 0 && (
        <div className="transfers-section-card">
          <div className="transfers-header">
            <h3>
              <ArrowRightLeft size={18} className="text-emerald" />
              <span>Recent Inter-Account Transfers</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Balance adjustments only • Not counted as expenses
            </span>
          </div>

          <div className="transfers-table-wrapper">
            <table className="transfers-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source Account</th>
                  <th></th>
                  <th>Destination Account</th>
                  <th>Amount</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTransfers.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDateDisplay(t.transfer_date)}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{t.source_account?.name || 'Account'}</span>
                    </td>
                    <td style={{ color: '#064E3B', width: '24px' }}>
                      <ArrowRight size={14} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{t.destination_account?.name || 'Account'}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatCurrencyINR(t.amount)}
                    </td>
                    <td style={{ color: '#64748B' }}>{t.note || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-icon-only danger"
                        onClick={() => handleDeleteTransfer(t.id)}
                        title="Delete and revert transfer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accountToEdit={accountToEdit}
        onSuccess={fetchData}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={data.accounts}
        initialSourceAccount={transferSourceAccount}
        onSuccess={fetchData}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        accounts={data.accounts}
        initialAccount={incomeTargetAccount}
        onSuccess={fetchData}
      />

      <AccountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        account={selectedDetailAccount}
      />
    </div>
  );
}

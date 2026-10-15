import React from 'react';
import {
  Coins,
  Landmark,
  Smartphone,
  PiggyBank,
  CreditCard,
  Wallet,
  ArrowRightLeft,
  History,
  Edit3,
  Archive,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import { isLiabilityAccount } from '../../utils/accountUtils';
import './AccountCard.css';

function getAccountIcon(iconName, type) {
  switch (iconName || type) {
    case 'cash':
    case 'Coins':
      return <Coins size={22} />;
    case 'bank':
    case 'Landmark':
      return <Landmark size={22} />;
    case 'wallet':
    case 'Smartphone':
      return <Smartphone size={22} />;
    case 'savings':
    case 'PiggyBank':
      return <PiggyBank size={22} />;
    case 'credit_card':
    case 'CreditCard':
      return <CreditCard size={22} />;
    default:
      return <Wallet size={22} />;
  }
}

function getTypeLabel(type) {
  switch (type) {
    case 'cash':
      return 'Cash';
    case 'bank':
      return 'Bank Account';
    case 'wallet':
      return 'UPI Wallet';
    case 'savings':
      return 'Savings';
    case 'credit_card':
      return 'Credit Card (Debt)';
    default:
      return 'Custom Account';
  }
}

export default function AccountCard({
  account,
  onTransfer,
  onViewHistory,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete
}) {
  const isCredit = isLiabilityAccount(account.type);
  const computed = account.computed || {};

  // For credit cards, display outstanding unpaid debt. For asset accounts, display current liquid balance.
  const displayAmount = isCredit
    ? computed.outstandingDebt ?? account.opening_balance
    : computed.balance ?? account.opening_balance;

  return (
    <div className={`account-card ${account.is_archived ? 'archived' : ''}`}>
      <div
        className="account-card-accent-bar"
        style={{ backgroundColor: account.color || '#10B981' }}
        aria-hidden="true"
      />

      <div className="account-card-header">
        <div className="account-card-info">
          <div
            className="account-icon-box"
            style={{ backgroundColor: account.color || '#10B981' }}
            aria-hidden="true"
          >
            {getAccountIcon(account.icon, account.type)}
          </div>
          <div className="account-name-group">
            <h3 className="account-card-title">{account.name}</h3>
            <span
              className={`account-type-badge ${
                account.is_archived
                  ? 'badge-archived'
                  : isCredit
                  ? 'badge-liability'
                  : 'badge-asset'
              }`}
            >
              {account.is_archived ? 'Archived' : getTypeLabel(account.type)}
            </span>
          </div>
        </div>

        <div className="account-header-actions">
          {account.is_archived ? (
            <button
              type="button"
              className="btn-icon-only"
              onClick={() => onUnarchive(account)}
              title="Restore / Unarchive Account"
              aria-label="Restore Account"
            >
              <RotateCcw size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-icon-only"
              onClick={() => onArchive(account)}
              title="Archive Account"
              aria-label="Archive Account"
            >
              <Archive size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="account-card-balance-block">
        <div className="balance-label">
          {isCredit ? 'Outstanding Balance (Debt)' : 'Current Balance'}
        </div>
        <div
          className={`balance-value ${
            isCredit && displayAmount > 0 ? 'negative' : displayAmount < 0 ? 'negative' : ''
          }`}
        >
          {formatCurrencyINR(displayAmount)}
        </div>
        <div className="balance-subtext">
          Opening: {formatCurrencyINR(account.opening_balance)} •{' '}
          {account.transactionCount || 0} transaction(s)
        </div>
      </div>

      <div className="account-card-actions">
        {!account.is_archived && (
          <button
            type="button"
            className="btn-card-action primary-action"
            onClick={() => onTransfer(account)}
            title="Transfer Money"
          >
            <ArrowRightLeft size={14} />
            <span>Transfer</span>
          </button>
        )}

        <button
          type="button"
          className="btn-card-action"
          onClick={() => onViewHistory(account)}
          title="View Transaction History"
        >
          <History size={14} />
          <span>Ledger</span>
        </button>

        <button
          type="button"
          className="btn-icon-only"
          onClick={() => onEdit(account)}
          title="Edit Account Details"
          aria-label="Edit Account"
        >
          <Edit3 size={15} />
        </button>

        <button
          type="button"
          className="btn-icon-only danger"
          onClick={() => onDelete(account)}
          title="Delete Account (Only if unused)"
          aria-label="Delete Account"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

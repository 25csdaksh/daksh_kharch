/**
 * HisabSetu Split Engine
 * Authoritative, decimal-safe financial calculation engine for shared expenses,
 * participant shares, net balances, debt minimization, and settlement audit trails.
 */

/**
 * Converts a rupee float/number or string into integer paise (cents).
 * Avoids IEEE-754 floating-point inaccuracies.
 * @param {number|string} amount
 * @returns {number} Integer paise
 */
export function toPaise(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise back to a 2-decimal rupee float.
 * @param {number} paise
 * @returns {number}
 */
export function fromPaise(paise) {
  return parseFloat((paise / 100).toFixed(2));
}

/**
 * Formats a paise or rupee amount into INR currency string.
 * @param {number} amountInRupees
 * @returns {string} e.g. "₹1,250.00"
 */
export function formatSplitINR(amountInRupees) {
  const safe = Number(amountInRupees) || 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Calculate Equal Split shares.
 * Allocates remainder paise to the first few participants deterministically,
 * ensuring the exact sum of shares equals the total bill down to the last paisa.
 *
 * @param {number} totalAmount - Total bill in rupees
 * @param {Array<string|null>} participantIds - Array of participant IDs (null represents 'You'/owner)
 * @returns {Array<{ participantId: string|null, shareAmount: number, paise: number }>}
 */
export function calculateEqualSplit(totalAmount, participantIds) {
  if (!participantIds || participantIds.length === 0) {
    throw new Error('At least one participant is required for equal split.');
  }
  const totalPaise = toPaise(totalAmount);
  if (totalPaise <= 0) {
    throw new Error('Total amount must be greater than zero.');
  }

  const count = participantIds.length;
  const baseSharePaise = Math.floor(totalPaise / count);
  const remainderPaise = totalPaise % count;

  return participantIds.map((id, index) => {
    // Distribute remainder 1 paisa at a time to early participants
    const sharePaise = baseSharePaise + (index < remainderPaise ? 1 : 0);
    return {
      participantId: id,
      shareAmount: fromPaise(sharePaise),
      paise: sharePaise
    };
  });
}

/**
 * Calculate Percentage Split shares.
 * Validates that percentages sum up to exactly 100%.
 * Allocates remainder paise to the highest percentage participant so the sum is exact.
 *
 * @param {number} totalAmount
 * @param {Array<{ participantId: string|null, percentage: number }>} entries
 * @returns {Array<{ participantId: string|null, shareAmount: number, percentage: number, paise: number }>}
 */
export function calculatePercentageSplit(totalAmount, entries) {
  if (!entries || entries.length === 0) {
    throw new Error('Participant percentage entries are required.');
  }
  const totalPaise = toPaise(totalAmount);
  if (totalPaise <= 0) {
    throw new Error('Total amount must be greater than zero.');
  }

  const percentSum = entries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0);
  // Allow slight floating tolerance for percentages (e.g. 33.333% + 33.333% + 33.334% = 100)
  if (Math.abs(percentSum - 100) > 0.01) {
    throw new Error(`Total percentage must equal 100%. Current sum: ${percentSum.toFixed(2)}%`);
  }

  let allocatedPaise = 0;
  const shares = entries.map((e) => {
    const pct = Number(e.percentage) || 0;
    if (pct < 0) throw new Error('Percentage share cannot be negative.');
    const paise = Math.round((totalPaise * pct) / 100);
    allocatedPaise += paise;
    return {
      participantId: e.participantId,
      percentage: pct,
      paise
    };
  });

  // Adjust difference on the entry with the largest percentage
  const diffPaise = totalPaise - allocatedPaise;
  if (diffPaise !== 0) {
    let largestIdx = 0;
    let maxPct = -1;
    entries.forEach((e, idx) => {
      if ((Number(e.percentage) || 0) > maxPct) {
        maxPct = Number(e.percentage) || 0;
        largestIdx = idx;
      }
    });
    shares[largestIdx].paise += diffPaise;
  }

  return shares.map((s) => ({
    participantId: s.participantId,
    percentage: s.percentage,
    shareAmount: fromPaise(s.paise),
    paise: s.paise
  }));
}

/**
 * Calculate Ratio / Custom Shares Split.
 * Validates shares sum up to total shares and allocates remainder paise.
 *
 * @param {number} totalAmount
 * @param {Array<{ participantId: string|null, shares: number }>} entries
 * @returns {Array<{ participantId: string|null, shareAmount: number, paise: number }>}
 */
export function calculateRatioSplit(totalAmount, entries) {
  if (!entries || entries.length === 0) {
    throw new Error('Participant share entries are required.');
  }
  const totalPaise = toPaise(totalAmount);
  if (totalPaise <= 0) throw new Error('Total amount must be greater than zero.');

  const totalUnits = entries.reduce((sum, e) => sum + (Number(e.shares) || 0), 0);
  if (totalUnits <= 0) throw new Error('Total share units must be greater than zero.');

  let allocatedPaise = 0;
  const rawShares = entries.map((e) => {
    const units = Number(e.shares) || 0;
    if (units < 0) throw new Error('Share units cannot be negative.');
    const paise = Math.floor((totalPaise * units) / totalUnits);
    allocatedPaise += paise;
    return {
      participantId: e.participantId,
      units,
      paise
    };
  });

  let remainder = totalPaise - allocatedPaise;
  let idx = 0;
  while (remainder > 0) {
    rawShares[idx % rawShares.length].paise += 1;
    remainder -= 1;
    idx += 1;
  }

  return rawShares.map((s) => ({
    participantId: s.participantId,
    shareAmount: fromPaise(s.paise),
    paise: s.paise
  }));
}

/**
 * Validates Unequal / Custom monetary shares.
 * Ensures every share is >= 0 and the sum equals totalAmount exactly.
 *
 * @param {number} totalAmount
 * @param {Array<{ participantId: string|null, amount: number }>} entries
 * @returns {{ isValid: boolean, diffPaise: number, totalEntered: number, errors: string[] }}
 */
export function validateCustomMonetarySplit(totalAmount, entries) {
  const errors = [];
  const totalPaise = toPaise(totalAmount);
  if (totalPaise <= 0) errors.push('Total amount must be greater than zero.');

  let sumPaise = 0;
  entries.forEach((e) => {
    const p = toPaise(e.amount);
    if (p < 0) errors.push('Participant share cannot be negative.');
    sumPaise += p;
  });

  const diffPaise = totalPaise - sumPaise;
  if (diffPaise !== 0) {
    errors.push(
      `Allocated shares (${fromPaise(sumPaise)}) do not equal the total bill (${fromPaise(totalPaise)}). Difference: ${fromPaise(Math.abs(diffPaise))}`
    );
  }

  return {
    isValid: errors.length === 0,
    diffPaise,
    totalEntered: fromPaise(sumPaise),
    errors
  };
}

/**
 * Calculates net balance for every participant from shared expenses and settlements.
 *
 * For each shared expense:
 * - Payer paid total_amount.
 * - Each participant i has share_amount.
 * - Payer is owed (total_amount - payer_share) by the group.
 * - Participant i owes payer their share_amount (if i != payer).
 *
 * For each settlement:
 * - Settlement payer pays recipient.
 * - Reduces settlement payer's debt to recipient.
 *
 * @param {Array<Object>} sharedExpenses
 * @param {Array<Object>} settlements
 * @param {string|null} ownerUserId
 * @returns {{
 *   netBalances: Record<string, number>,
 *   pairwiseDebts: Array<{ fromId: string|null, toId: string|null, amount: number }>,
 *   userSummary: { youOwe: number, owedToYou: number, netBalance: number },
 *   isBalanced: boolean
 * }}
 */
export function calculateBalances(sharedExpenses = [], settlements = [], ownerUserId = null) {
  // Map of pairwise debt: debts[debtorId][creditorId] = paise
  const pairwisePaise = {};

  const ensurePair = (debtor, creditor) => {
    const dKey = debtor === null ? 'USER' : String(debtor);
    const cKey = creditor === null ? 'USER' : String(creditor);
    if (!pairwisePaise[dKey]) pairwisePaise[dKey] = {};
    if (pairwisePaise[dKey][cKey] === undefined) pairwisePaise[dKey][cKey] = 0;
    if (!pairwisePaise[cKey]) pairwisePaise[cKey] = {};
    if (pairwisePaise[cKey][dKey] === undefined) pairwisePaise[cKey][dKey] = 0;
  };

  // 1. Process each Shared Expense
  sharedExpenses.forEach((exp) => {
    const payerKey = exp.paid_by_friend_id === null || exp.paid_by_friend_id === undefined
      ? 'USER'
      : String(exp.paid_by_friend_id);

    const shares = exp.shares || [];
    shares.forEach((share) => {
      const participantKey = share.friend_id === null || share.friend_id === undefined
        ? 'USER'
        : String(share.friend_id);

      const sharePaise = toPaise(share.share_amount);

      // If participant is not the payer, participant owes payer their share
      if (participantKey !== payerKey && sharePaise > 0) {
        ensurePair(participantKey, payerKey);
        pairwisePaise[participantKey][payerKey] += sharePaise;
      }
    });
  });

  // 2. Process Settlements
  settlements.forEach((st) => {
    const payerKey = st.payer_friend_id === null || st.payer_friend_id === undefined
      ? 'USER'
      : String(st.payer_friend_id);

    const recipientKey = st.recipient_friend_id === null || st.recipient_friend_id === undefined
      ? 'USER'
      : String(st.recipient_friend_id);

    const amountPaise = toPaise(st.amount);
    if (payerKey !== recipientKey && amountPaise > 0) {
      ensurePair(payerKey, recipientKey);
      // Payer paid recipient, so payer's debt to recipient decreases
      pairwisePaise[payerKey][recipientKey] -= amountPaise;
    }
  });

  // 3. Compute net pairwise debts (netting between two specific people)
  const netPairwiseDebts = [];
  const processedPairs = new Set();
  const allParticipantKeys = Object.keys(pairwisePaise);

  allParticipantKeys.forEach((pA) => {
    allParticipantKeys.forEach((pB) => {
      if (pA === pB) return;
      const pairKey = [pA, pB].sort().join(':::');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const aOwesB = pairwisePaise[pA]?.[pB] || 0;
      const bOwesA = pairwisePaise[pB]?.[pA] || 0;
      const netDebt = aOwesB - bOwesA;

      if (netDebt > 0) {
        netPairwiseDebts.push({
          fromId: pA === 'USER' ? null : pA,
          toId: pB === 'USER' ? null : pB,
          amount: fromPaise(netDebt),
          paise: netDebt
        });
      } else if (netDebt < 0) {
        netPairwiseDebts.push({
          fromId: pB === 'USER' ? null : pB,
          toId: pA === 'USER' ? null : pA,
          amount: fromPaise(Math.abs(netDebt)),
          paise: Math.abs(netDebt)
        });
      }
    });
  });

  // 4. Calculate overall Net Balance per participant
  // Net balance = (total owed to participant) - (total participant owes)
  const netBalancesPaise = {};
  allParticipantKeys.forEach((k) => {
    netBalancesPaise[k] = 0;
  });

  netPairwiseDebts.forEach(({ fromId, toId, paise }) => {
    const dKey = fromId === null ? 'USER' : String(fromId);
    const cKey = toId === null ? 'USER' : String(toId);
    netBalancesPaise[dKey] = (netBalancesPaise[dKey] || 0) - paise;
    netBalancesPaise[cKey] = (netBalancesPaise[cKey] || 0) + paise;
  });

  const netBalances = {};
  let groupSumPaise = 0;
  Object.keys(netBalancesPaise).forEach((k) => {
    const p = netBalancesPaise[k];
    groupSumPaise += p;
    netBalances[k === 'USER' ? 'USER' : k] = fromPaise(p);
  });

  // 5. User-centric summary
  let youOwePaise = 0;
  let owedToYouPaise = 0;

  netPairwiseDebts.forEach(({ fromId, toId, paise }) => {
    if (fromId === null) {
      youOwePaise += paise;
    }
    if (toId === null) {
      owedToYouPaise += paise;
    }
  });

  const netUserPaise = owedToYouPaise - youOwePaise;

  return {
    netBalances,
    pairwiseDebts: netPairwiseDebts,
    userSummary: {
      youOwe: fromPaise(youOwePaise),
      owedToYou: fromPaise(owedToYouPaise),
      netBalance: fromPaise(netUserPaise)
    },
    // Conservation of financial balance: sum across all participants must equal 0
    isBalanced: Math.abs(groupSumPaise) === 0
  };
}

/**
 * Simplified Settlements Algorithm (Greedy Debt Minimization).
 * Takes net balances and computes the minimum number of transactions needed
 * to settle all debts across all participants.
 *
 * @param {Record<string, number>} netBalances - Map of participantId -> net balance in rupees
 * @param {Function} [getNameFn] - Optional resolver function to map participantId to display name
 * @returns {Array<{ fromId: string|null, toId: string|null, fromName: string, toName: string, amount: number, paise: number }>}
 */
export function simplifySettlements(netBalances = {}, getNameFn = (id) => (id === null || id === 'USER' ? 'You' : id)) {
  const debtors = [];
  const creditors = [];

  Object.entries(netBalances).forEach(([id, bal]) => {
    const paise = toPaise(bal);
    const parsedId = id === 'USER' ? null : id;
    if (paise < 0) {
      debtors.push({ id: parsedId, paise: Math.abs(paise) });
    } else if (paise > 0) {
      creditors.push({ id: parsedId, paise });
    }
  });

  // Sort descending by amount for greedy minimization
  debtors.sort((a, b) => b.paise - a.paise);
  creditors.sort((a, b) => b.paise - a.paise);

  const transactions = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settlePaise = Math.min(debtor.paise, creditor.paise);
    if (settlePaise > 0) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        fromName: getNameFn(debtor.id),
        toName: getNameFn(creditor.id),
        amount: fromPaise(settlePaise),
        paise: settlePaise
      });

      debtor.paise -= settlePaise;
      creditor.paise -= settlePaise;
    }

    if (debtor.paise === 0) dIdx++;
    if (creditor.paise === 0) cIdx++;
  }

  return transactions;
}

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Shield, ShieldAlert, CheckCircle, AlertTriangle, Loader2, Send, Info } from 'lucide-react';

export default function DisbursementForm({
  account,
  isAdmin,
  adminAddress,
  remainingBalanceEth,
  contract,
  onTransactionSuccess
}) {
  const [disburseAmount, setDisburseAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const numericAmount = parseFloat(disburseAmount);
  const numericAvailable = parseFloat(remainingBalanceEth || '0');

  // Validations
  const isPositive = !isNaN(numericAmount) && numericAmount > 0;
  const isWithinBalance = isPositive && numericAmount <= numericAvailable;
  const hasPurpose = purpose.trim().length > 0;
  const isValid = isPositive && isWithinBalance && hasPurpose;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'Access Denied: Only the contract administrator can record fund disbursements.'
      });
      return;
    }

    if (!isPositive) {
      setStatusMessage({
        type: 'error',
        text: 'Disbursement amount must be greater than 0 test ETH.'
      });
      return;
    }

    if (!isWithinBalance) {
      setStatusMessage({
        type: 'error',
        text: `Disbursement amount (${numericAmount} ETH) exceeds remaining recorded balance (${numericAvailable} ETH).`
      });
      return;
    }

    if (!hasPurpose) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a description for the disbursement (e.g., "Emergency food supplies").'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const amountWei = ethers.parseEther(disburseAmount.toString());

      // Execute smart contract transaction (governed by onlyAdmin modifier)
      const tx = await contract.recordDisbursement(amountWei, purpose.trim());
      const receipt = await tx.wait();

      setStatusMessage({
        type: 'success',
        text: `Successfully recorded disbursement of ${disburseAmount} test ETH for "${purpose.trim()}"!`,
        txHash: receipt.hash || tx.hash
      });

      // Clear fields
      setDisburseAmount('');
      setPurpose('');

      // Refresh totals and transaction table
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err) {
      console.error('Disbursement error:', err);
      let errorMessage = 'Disbursement failed. ';

      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage += 'Transaction was cancelled in MetaMask.';
      } else if (err.reason) {
        errorMessage += err.reason;
      } else {
        errorMessage += err.message || 'An unexpected error occurred.';
      }

      setStatusMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If connected wallet is NOT the administrator, render access control state
  if (!account || !isAdmin) {
    return (
      <div className="card admin-card">
        <div className="card-header">
          <div className="card-header-title">
            <Shield size={20} color="var(--accent-purple)" />
            <h2 className="card-title">Fund Disbursement (Admin Only)</h2>
          </div>
          <span className="admin-badge">
            <ShieldAlert size={14} />
            Restricted
          </span>
        </div>

        <div className="non-admin-notice">
          <ShieldAlert size={36} color="var(--accent-purple)" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Administrator Controls Protected
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            Fund disbursement recording is governed by the smart contract's{' '}
            <code>onlyAdmin</code> modifier and is accessible only to the contract deployer.
          </p>
          {adminAddress && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Contract Admin Address:
              <br />
              <span className="address-mono">{adminAddress}</span>
            </div>
          )}
          {account && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--warning-amber)' }}>
              (Current connected account: <code>{account.slice(0, 6)}...{account.slice(-4)}</code> is not the admin)
            </p>
          )}
        </div>
      </div>
    );
  }

  // When administrator is connected, render the active disbursement form
  return (
    <div className="card admin-card">
      <div className="card-header">
        <div className="card-header-title">
          <Shield size={20} color="var(--accent-purple)" />
          <h2 className="card-title">Record Fund Disbursement</h2>
        </div>
        <span className="admin-badge">
          <Shield size={14} />
          Admin Authorized
        </span>
      </div>

      {/* College Project Prototype Limitation Note */}
      <div className="disclaimer-box" role="note">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Audit-Only Prototype:</strong> In this prototype, disbursements are recorded on the blockchain for transparent auditing and balance deduction. They do not transfer cryptocurrency to external recipient wallets.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="disburse-amount" className="form-label">
            Disbursement Amount
          </label>
          <div className="input-wrapper">
            <input
              id="disburse-amount"
              type="number"
              step="any"
              min="0.0001"
              max={numericAvailable}
              placeholder="e.g. 0.25"
              value={disburseAmount}
              onChange={(e) => {
                setDisburseAmount(e.target.value);
                if (statusMessage) setStatusMessage(null);
              }}
              disabled={isSubmitting}
              className="form-input"
              required
            />
            <span className="input-suffix">test ETH</span>
          </div>
          <p className="form-hint">
            Available recorded balance: <strong>{remainingBalanceEth} test ETH</strong>
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="disburse-purpose" className="form-label">
            Disbursement Purpose / Description
          </label>
          <input
            id="disburse-purpose"
            type="text"
            placeholder="e.g. Emergency food supplies & water purification"
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value);
              if (statusMessage) setStatusMessage(null);
            }}
            disabled={isSubmitting}
            className="form-input"
            required
            maxLength={120}
          />
          <p className="form-hint">
            This purpose is permanently saved on-chain in the smart contract's audit log.
          </p>
        </div>

        {/* Validation Warning if Exceeds */}
        {isPositive && !isWithinBalance && (
          <div className="alert-banner warning" style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
            Amount exceeds the remaining balance of {remainingBalanceEth} ETH.
          </div>
        )}

        <button
          type="submit"
          className="btn btn-success btn-full"
          disabled={isSubmitting || !isValid}
          id="submit-disbursement-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spinner" />
              Recording on Blockchain...
            </>
          ) : (
            <>
              <Send size={18} />
              Record Disbursement on Blockchain
            </>
          )}
        </button>

        {statusMessage && (
          <div className={`form-feedback ${statusMessage.type}`} role="alert">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              {statusMessage.type === 'success' ? (
                <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <p><strong>{statusMessage.text}</strong></p>
                {statusMessage.txHash && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Transaction Hash (Local Blockchain):
                    </span>
                    <br />
                    <span className="tx-hash-link">{statusMessage.txHash}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

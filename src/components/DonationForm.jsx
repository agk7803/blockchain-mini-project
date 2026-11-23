import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Heart, Wallet, CheckCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';

export default function DonationForm({ 
  account, 
  contract, 
  onConnectWallet, 
  onTransactionSuccess 
}) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text, txHash }

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    if (statusMessage) setStatusMessage(null);
  };

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) {
      onConnectWallet();
      return;
    }

    if (!isValidAmount) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid positive donation amount (greater than 0 test ETH).'
      });
      return;
    }

    if (!contract) {
      setStatusMessage({
        type: 'error',
        text: 'Smart contract connection is not ready. Please verify your local node is running.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const weiValue = ethers.parseEther(amount.toString());

      // Trigger MetaMask payment transaction to the payable donate() function
      const tx = await contract.donate({ value: weiValue });
      
      // Wait for 1 confirmation block
      const receipt = await tx.wait();

      setStatusMessage({
        type: 'success',
        text: `Donation of ${amount} test ETH was successfully confirmed on-chain!`,
        txHash: receipt.hash || tx.hash
      });

      // Clear form input
      setAmount('');

      // Notify parent to refresh statistics & transaction events
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err) {
      console.error('Donation error:', err);
      let userFriendlyError = 'Transaction failed. ';

      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        userFriendlyError += 'User cancelled the transaction in MetaMask.';
      } else if (err.reason) {
        userFriendlyError += err.reason;
      } else if (err.message && err.message.includes('insufficient funds')) {
        userFriendlyError += 'Insufficient test ETH balance in your wallet.';
      } else {
        userFriendlyError += err.message || 'An unexpected error occurred.';
      }

      setStatusMessage({
        type: 'error',
        text: userFriendlyError
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-title">
          <Heart size={20} color="var(--primary-blue)" />
          <h2 className="card-title">Make a Donation</h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Payable Smart Contract
        </span>
      </div>

      {!account ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Connect your MetaMask wallet to contribute test ETH to the disaster relief effort.
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onConnectWallet}
            id="connect-wallet-donate-btn"
          >
            <Wallet size={18} />
            Connect MetaMask to Donate
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="donation-amount" className="form-label">
              Donation Amount
            </label>
            <div className="input-wrapper">
              <input
                id="donation-amount"
                type="number"
                step="any"
                min="0.0001"
                placeholder="e.g. 0.5"
                value={amount}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                className="form-input"
                required
              />
              <span className="input-suffix">test ETH</span>
            </div>
            <p className="form-hint">
              Local Hardhat network only. Never use real cryptocurrency.
            </p>
          </div>

          {/* Amount Confirmation Preview */}
          {isValidAmount && (
            <div className="preview-box">
              <div className="preview-row">
                <span className="preview-label">Destination Campaign:</span>
                <span className="preview-val">Disaster Relief Fund</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Amount to Submit:</span>
                <span className="preview-val">{amount} test ETH</span>
              </div>
              <div className="preview-row">
                <span className="preview-label">Donor Wallet:</span>
                <span className="preview-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting || !isValidAmount}
            id="submit-donation-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spinner" />
                Confirming Transaction...
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Confirm & Donate {isValidAmount ? `${amount} ETH` : ''}
              </>
            )}
          </button>

          {/* Success or Error Feedback Message */}
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
      )}
    </div>
  );
}

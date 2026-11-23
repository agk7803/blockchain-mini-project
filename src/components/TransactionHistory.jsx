import React from 'react';
import { History, ArrowDownLeft, ArrowUpRight, Copy, Check, ExternalLink, Inbox } from 'lucide-react';

export default function TransactionHistory({ transactions, isLoading }) {
  const [copiedHash, setCopiedHash] = React.useState(null);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatHash = (h) => {
    if (!h) return '';
    return `${h.slice(0, 10)}...${h.slice(-8)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-title">
          <History size={20} color="var(--primary-blue)" />
          <h2 className="card-title">Blockchain Transaction Audit Log</h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {transactions.length} On-Chain {transactions.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <p>Syncing verified transactions from Hardhat local blockchain...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <Inbox size={40} className="empty-state-icon" />
          <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            No Transactions Recorded Yet
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            Make a donation or disburse funds above to generate immutable blockchain records.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="tx-table" aria-label="Blockchain Transactions Table">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Participant Address</th>
                <th scope="col">Amount (ETH)</th>
                <th scope="col">Description</th>
                <th scope="col">Time</th>
                <th scope="col">Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const isDonation = tx.type === 'Donation';
                return (
                  <tr key={tx.hash ? `${tx.hash}-${idx}` : idx}>
                    {/* Transaction Type */}
                    <td>
                      <span className={`badge ${isDonation ? 'badge-donation' : 'badge-disbursement'}`}>
                        {isDonation ? (
                          <ArrowDownLeft size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}
                        {tx.type}
                      </span>
                    </td>

                    {/* Participant Address */}
                    <td>
                      <span className="address-mono" title={tx.address}>
                        {formatAddress(tx.address)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{ fontWeight: 600, color: isDonation ? 'var(--accent-green)' : 'var(--accent-purple)' }}>
                      {isDonation ? '+' : '-'}{tx.amount} test ETH
                    </td>

                    {/* Description */}
                    <td style={{ maxWidth: '280px', color: 'var(--text-secondary)' }}>
                      {tx.description}
                    </td>

                    {/* Timestamp */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.timestamp)}
                    </td>

                    {/* Transaction Hash */}
                    <td>
                      <button
                        type="button"
                        onClick={() => handleCopy(tx.hash)}
                        className="hash-mono"
                        style={{ border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Click to copy full transaction hash"
                      >
                        {formatHash(tx.hash)}
                        {copiedHash === tx.hash ? (
                          <Check size={12} color="var(--accent-green)" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

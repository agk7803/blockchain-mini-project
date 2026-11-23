import React from 'react';
import { 
  HeartHandshake, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Scale, 
  ShieldCheck, 
  Layers, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Dashboard({ 
  stats, 
  networkStatus, 
  contractAddress, 
  onSwitchNetwork 
}) {
  const {
    totalDonations = '0.0000',
    totalDisbursements = '0.0000',
    remainingBalance = '0.0000',
    donationCount = 0,
    disbursementCount = 0,
    campaignName = 'Disaster Relief Fund',
    campaignDescription = 'Support emergency relief supplies and essential resources.',
    isCampaignActive = true,
  } = stats;

  return (
    <section aria-labelledby="dashboard-summary">
      {/* Network Warning Banner if Wrong Network */}
      {networkStatus && !networkStatus.isSupported && (
        <div className="alert-banner warning" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>
              <strong>Incorrect Network:</strong> You are currently on{' '}
              {networkStatus.name} (Chain ID: {networkStatus.chainId}). Please switch to the local Hardhat network (Chain ID: 31337).
            </span>
          </div>
          {onSwitchNetwork && (
            <button className="btn btn-warning btn-sm" onClick={onSwitchNetwork}>
              Switch to Hardhat (31337)
            </button>
          )}
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="metrics-grid">
        {/* Total Donations */}
        <div className="metric-card">
          <div className="metric-content">
            <span className="metric-label">Total Donations</span>
            <div className="metric-value">
              {totalDonations} <span className="metric-unit">test ETH</span>
            </div>
            <span className="metric-subtext">
              {donationCount} verified {donationCount === 1 ? 'donation' : 'donations'}
            </span>
          </div>
          <div className="metric-icon-box blue" aria-hidden="true">
            <ArrowDownLeft size={22} />
          </div>
        </div>

        {/* Total Funds Disbursed */}
        <div className="metric-card">
          <div className="metric-content">
            <span className="metric-label">Funds Disbursed</span>
            <div className="metric-value">
              {totalDisbursements} <span className="metric-unit">test ETH</span>
            </div>
            <span className="metric-subtext">
              {disbursementCount} recorded {disbursementCount === 1 ? 'disbursement' : 'disbursements'}
            </span>
          </div>
          <div className="metric-icon-box purple" aria-hidden="true">
            <ArrowUpRight size={22} />
          </div>
        </div>

        {/* Remaining Recorded Balance */}
        <div className="metric-card">
          <div className="metric-content">
            <span className="metric-label">Remaining Balance</span>
            <div className="metric-value">
              {remainingBalance} <span className="metric-unit">test ETH</span>
            </div>
            <span className="metric-subtext">Available for relief aid</span>
          </div>
          <div className="metric-icon-box green" aria-hidden="true">
            <Scale size={22} />
          </div>
        </div>

        {/* Number of Donations / Status */}
        <div className="metric-card">
          <div className="metric-content">
            <span className="metric-label">Donation Count</span>
            <div className="metric-value">{donationCount}</div>
            <span className="metric-subtext">Smart contract auditable</span>
          </div>
          <div className="metric-icon-box slate" aria-hidden="true">
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* Campaign Details Card */}
      <div className="card campaign-card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <div className="card-header-title">
            <HeartHandshake size={22} color="var(--primary-blue)" />
            <h2 className="card-title">{campaignName}</h2>
          </div>
          <span className="campaign-tag">
            <CheckCircle2 size={14} />
            {isCampaignActive ? 'Campaign Active' : 'Completed'}
          </span>
        </div>

        <p className="campaign-desc">{campaignDescription}</p>

        <div className="campaign-stats-grid">
          <div className="campaign-stat-item">
            <span className="campaign-stat-label">Total Funds Raised</span>
            <span className="campaign-stat-val">{totalDonations} test ETH</span>
          </div>
          <div className="campaign-stat-item">
            <span className="campaign-stat-label">Current Unspent Balance</span>
            <span className="campaign-stat-val">{remainingBalance} test ETH</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={16} color="var(--accent-green)" />
          <span>Transparent on-chain allocation tracked by Solidity smart contract</span>
        </div>
      </div>
    </section>
  );
}

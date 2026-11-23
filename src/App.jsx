import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  HeartHandshake, 
  Wallet, 
  Shield, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  X,
  RotateCw
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import DonationForm from './components/DonationForm';
import DisbursementForm from './components/DisbursementForm';
import TransactionHistory from './components/TransactionHistory';

import contractConfig from './contractConfig.json';

const HARDHAT_CHAIN_ID = 31337;
const HARDHAT_HEX_CHAIN_ID = '0x7a69';
const LOCAL_RPC_URL = 'http://127.0.0.1:8545';

/**
 * Safely resolve injected provider supporting standard window.ethereum,
 * multi-wallet setups (window.ethereum.providers array), and delayed injection.
 */
const getMetaMaskProvider = () => {
  if (typeof window === 'undefined') return null;

  // 1. Multiple providers array (EIP-5749 or multi-wallet extension setup)
  if (window.ethereum?.providers?.length) {
    const metaMask = window.ethereum.providers.find((p) => p.isMetaMask);
    if (metaMask) return metaMask;
    return window.ethereum.providers[0];
  }

  // 2. Direct window.ethereum
  if (window.ethereum) {
    return window.ethereum;
  }

  return null;
};

const detectMetaMaskProvider = async (timeoutMs = 600) => {
  const existing = getMetaMaskProvider();
  if (existing) return existing;

  return new Promise((resolve) => {
    let resolved = false;

    const onInit = () => {
      if (resolved) return;
      resolved = true;
      resolve(getMetaMaskProvider());
    };

    const onAnnounce = (e) => {
      if (e.detail?.provider) {
        if (resolved) return;
        resolved = true;
        resolve(e.detail.provider);
      }
    };

    window.addEventListener('ethereum#initialized', onInit, { once: true });
    window.addEventListener('eip6963:announceProvider', onAnnounce, { once: true });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(getMetaMaskProvider());
      }
    }, timeoutMs);
  });
};

export default function App() {
  const [account, setAccount] = useState(null);
  const [adminAddress, setAdminAddress] = useState(contractConfig.admin || '');
  const [networkStatus, setNetworkStatus] = useState({
    name: 'Checking...',
    chainId: null,
    isSupported: true,
  });

  const [stats, setStats] = useState({
    totalDonations: '0.0000',
    totalDisbursements: '0.0000',
    remainingBalance: '0.0000',
    donationCount: 0,
    disbursementCount: 0,
    campaignName: 'Disaster Relief Fund',
    campaignDescription: 'Support emergency relief supplies and essential resources.',
    isCampaignActive: true,
  });

  const [transactions, setTransactions] = useState([]);
  const [contractInstance, setContractInstance] = useState(null);
  const [readProvider, setReadProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nodeError, setNodeError] = useState(null);
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);

  // Helper to shorten Ethereum addresses
  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isAdmin = Boolean(
    account && adminAddress && account.toLowerCase() === adminAddress.toLowerCase()
  );

  /**
   * Initialize Read-Only Provider & Contract
   */
  const getReadContract = useCallback(() => {
    try {
      const provider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
      return new ethers.Contract(contractConfig.address, contractConfig.abi, provider);
    } catch (e) {
      console.warn('Could not initialize JsonRpcProvider:', e);
      return null;
    }
  }, []);

  /**
   * Fetch current stats and transaction history directly from the smart contract.
   * Reads from local JsonRpcProvider so stats and history are always accurate
   * even if the user's wallet is currently on Mainnet or another network.
   */
  const loadBlockchainData = useCallback(async () => {
    const contract = getReadContract();
    if (!contract || !contractConfig.address) {
      setIsLoading(false);
      return;
    }

    try {
      setNodeError(null);

      // 1. Fetch Contract Financial & Campaign Summary from local Hardhat node
      const summary = await contract.getSummary();
      const [
        cName,
        cDesc,
        cActive,
        totDonations,
        totDisbursements,
        remBalance,
        donCount,
        disbCount,
        adminAddr,
      ] = summary;

      setAdminAddress(adminAddr);
      setStats({
        campaignName: cName,
        campaignDescription: cDesc,
        isCampaignActive: cActive,
        totalDonations: parseFloat(ethers.formatEther(totDonations)).toFixed(4),
        totalDisbursements: parseFloat(ethers.formatEther(totDisbursements)).toFixed(4),
        remainingBalance: parseFloat(ethers.formatEther(remBalance)).toFixed(4),
        donationCount: Number(donCount),
        disbursementCount: Number(disbCount),
      });

      // 2. Fetch Events from Local Blockchain
      const donationFilter = contract.filters.DonationReceived();
      const disbursementFilter = contract.filters.FundsDisbursed();

      const [donationEvents, disbursementEvents] = await Promise.all([
        contract.queryFilter(donationFilter, 0, 'latest'),
        contract.queryFilter(disbursementFilter, 0, 'latest'),
      ]);

      const formattedDonations = donationEvents.map((evt) => ({
        type: 'Donation',
        address: evt.args[0],
        amount: parseFloat(ethers.formatEther(evt.args[1])).toFixed(4),
        description: 'Disaster Relief Fund Donation',
        timestamp: Number(evt.args[2]),
        hash: evt.transactionHash,
        blockNumber: evt.blockNumber,
      }));

      const formattedDisbursements = disbursementEvents.map((evt) => ({
        type: 'Disbursement',
        address: evt.args[0],
        amount: parseFloat(ethers.formatEther(evt.args[1])).toFixed(4),
        description: evt.args[2] || 'Emergency Supplies Disbursement',
        timestamp: Number(evt.args[3]),
        hash: evt.transactionHash,
        blockNumber: evt.blockNumber,
      }));

      // Combine and order newest transactions first
      const allTx = [...formattedDonations, ...formattedDisbursements].sort((a, b) => {
        if (b.timestamp !== a.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return b.blockNumber - a.blockNumber;
      });

      setTransactions(allTx);
    } catch (err) {
      console.error('Failed to query local node at 8545:', err);
      setNodeError(
        'Unable to query local Hardhat node. Please confirm "npm run node" is running on port 8545.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [getReadContract]);

  /**
   * Connect MetaMask or Injected Wallet
   */
  const connectWallet = async () => {
    const provider = await detectMetaMaskProvider();
    if (!provider) {
      setShowMetaMaskModal(true);
      return;
    }
    setShowMetaMaskModal(false);

    try {
      const browserProvider = new ethers.BrowserProvider(provider);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const network = await browserProvider.getNetwork();
        const chainId = Number(network.chainId);
        const isSupported = chainId === HARDHAT_CHAIN_ID;
        
        setNetworkStatus({
          name: isSupported ? 'Hardhat Localhost' : network.name || `Chain ${chainId}`,
          chainId: chainId,
          isSupported: isSupported,
        });

        if (isSupported) {
          const signer = await browserProvider.getSigner();
          const contractWithSigner = new ethers.Contract(
            contractConfig.address,
            contractConfig.abi,
            signer
          );
          setContractInstance(contractWithSigner);
        } else {
          setContractInstance(null);
        }

        await loadBlockchainData();
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
    }
  };

  /**
   * Switch Network to Hardhat 31337 in MetaMask / Injected Wallet
   */
  const switchToHardhatNetwork = async () => {
    const provider = getMetaMaskProvider();
    if (!provider) {
      setShowMetaMaskModal(true);
      return;
    }
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_HEX_CHAIN_ID }],
      });
    } catch (switchError) {
      // Chain not added or custom error code
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: HARDHAT_HEX_CHAIN_ID,
              chainName: 'Hardhat Localhost 8545',
              rpcUrls: [LOCAL_RPC_URL],
              nativeCurrency: {
                name: 'Test ETH',
                symbol: 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        console.error('Failed to add Hardhat network:', addError);
      }
    }
  };

  /**
   * Setup Wallet & Event Listeners
   */
  useEffect(() => {
    // Initial fetch using JSON-RPC directly
    loadBlockchainData();

    const attachProvider = (provider) => {
      if (!provider) return null;
      const browserProvider = new ethers.BrowserProvider(provider);

      // Check if already connected
      browserProvider.send('eth_accounts', []).then(async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const network = await browserProvider.getNetwork();
          const chainId = Number(network.chainId);
          const isSupported = chainId === HARDHAT_CHAIN_ID;
          
          setNetworkStatus({
            name: isSupported ? 'Hardhat Localhost' : network.name || `Chain ${chainId}`,
            chainId: chainId,
            isSupported: isSupported,
          });

          if (isSupported) {
            const signer = await browserProvider.getSigner();
            const contractWithSigner = new ethers.Contract(
              contractConfig.address,
              contractConfig.abi,
              signer
            );
            setContractInstance(contractWithSigner);
          } else {
            setContractInstance(null);
          }

          loadBlockchainData();
        } else {
          setNetworkStatus({
            name: 'Disconnected',
            chainId: null,
            isSupported: true,
          });
        }
      }).catch(console.warn);

      // Account Change Listener
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount(null);
          setContractInstance(null);
          loadBlockchainData();
        }
      };

      // Chain Change Listener
      const handleChainChanged = () => {
        window.location.reload();
      };

      if (provider.on) {
        provider.on('accountsChanged', handleAccountsChanged);
        provider.on('chainChanged', handleChainChanged);
      }

      return () => {
        if (provider.removeListener) {
          provider.removeListener('accountsChanged', handleAccountsChanged);
          provider.removeListener('chainChanged', handleChainChanged);
        }
      };
    };

    let detach = null;
    const initialProvider = getMetaMaskProvider();
    if (initialProvider) {
      detach = attachProvider(initialProvider);
    } else {
      const onInit = () => {
        const delayed = getMetaMaskProvider();
        if (delayed) {
          detach = attachProvider(delayed);
        }
      };
      window.addEventListener('ethereum#initialized', onInit, { once: true });
    }

    return () => {
      if (detach) detach();
    };
  }, [loadBlockchainData]);

  return (
    <div className="app-container">
      {/* Top Header & Navigation */}
      <header className="navbar">
        <div className="brand-section">
          <div className="brand-icon" aria-hidden="true">
            <HeartHandshake size={24} />
          </div>
          <div className="brand-titles">
            <h1>Donation Tracker</h1>
            <p>Blockchain Transparency & Disbursement Audit System</p>
          </div>
        </div>

        <div className="nav-actions">
          {/* Network Status Badge */}
          <div 
            className={`network-badge ${
              !account ? 'disconnected' : networkStatus.isSupported ? 'connected' : 'wrong-network'
            }`}
            title="Blockchain Network Status"
          >
            <span className="status-dot"></span>
            <span>
              {!account 
                ? 'Wallet Disconnected' 
                : networkStatus.isSupported 
                  ? 'Hardhat (31337)' 
                  : `Wrong Net (${networkStatus.chainId})`}
            </span>
          </div>

          {/* Connected Account & Administrator Indicator */}
          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isAdmin && (
                <span className="admin-badge" title="Contract Deployer & Administrator">
                  <Shield size={13} />
                  Admin
                </span>
              )}
              <span className="address-mono" title={account}>
                {shortenAddress(account)}
              </span>
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-sm"
              onClick={connectWallet}
              id="header-connect-wallet-btn"
            >
              <Wallet size={16} />
              Connect MetaMask
            </button>
          )}

          {/* Manual Refresh Button */}
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => loadBlockchainData()}
            title="Sync latest blockchain data"
            aria-label="Refresh blockchain data"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Global Node Warning if Localhost RPC Fails */}
      {nodeError && (
        <div className="alert-banner danger" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>{nodeError}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main>
        {/* Core Financial Totals & Campaign Details */}
        <Dashboard
          stats={stats}
          networkStatus={networkStatus}
          contractAddress={contractConfig.address}
          onSwitchNetwork={switchToHardhatNetwork}
        />

        {/* Action Grid: Donation Form + Admin Disbursement Form */}
        <div className="main-grid">
          <DonationForm
            account={account}
            contract={contractInstance}
            onConnectWallet={connectWallet}
            onTransactionSuccess={() => loadBlockchainData()}
          />

          <DisbursementForm
            account={account}
            isAdmin={isAdmin}
            adminAddress={adminAddress}
            remainingBalanceEth={stats.remainingBalance}
            contract={contractInstance}
            onTransactionSuccess={() => loadBlockchainData()}
          />
        </div>

        {/* Smart-Contract Verified Transaction Audit Log */}
        <TransactionHistory 
          transactions={transactions} 
          isLoading={isLoading} 
        />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          <span>🎓 College Mini-Project: Blockchain-Based Donation Tracking System</span>
        </div>
        <div className="footer-contract-info">
          <span>Smart Contract: </span>
          <code>{contractConfig.address || 'Deploying...'}</code>
        </div>
      </footer>

      {/* MetaMask Troubleshooting Guidance Modal */}
      {showMetaMaskModal && (
        <div className="modal-backdrop" onClick={() => setShowMetaMaskModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-title-icon">
                  <AlertCircle size={20} />
                </div>
                <h3 className="modal-title">MetaMask Not Detected on This Tab</h3>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowMetaMaskModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-intro">
                You have MetaMask installed, but your browser has not injected <code>window.ethereum</code> into this tab. Please check these common causes:
              </p>

              <div className="troubleshoot-list">
                <div className="troubleshoot-item">
                  <span className="troubleshoot-num">1</span>
                  <div className="troubleshoot-content">
                    <h4>Refresh This Tab (Most Common)</h4>
                    <p>
                      If you installed MetaMask while this tab was already open, Chrome extensions do not inject into pre-existing tabs. Press <kbd>Cmd + Shift + R</kbd> (Mac) or click <strong>Reload Tab</strong> below.
                    </p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <span className="troubleshoot-num">2</span>
                  <div className="troubleshoot-content">
                    <h4>Check Extension Site Access Permissions</h4>
                    <p>
                      In Chrome/Brave toolbar, click the <strong>Extensions puzzle icon (🧩)</strong> → click <strong>MetaMask</strong> (or three dots → <em>Site access</em>) → ensure it is set to <strong>"On all sites"</strong>.
                    </p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <span className="troubleshoot-num">3</span>
                  <div className="troubleshoot-content">
                    <h4>Check You Are in the Right Browser</h4>
                    <p>
                      On Mac, clicking links often opens <strong>Safari</strong> by default. If your MetaMask extension is installed in <strong>Chrome</strong> or <strong>Brave</strong>, copy <code>http://localhost:5174</code> into that browser.
                    </p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <span className="troubleshoot-num">4</span>
                  <div className="troubleshoot-content">
                    <h4>Unlock Your MetaMask Wallet</h4>
                    <p>
                      Click the orange MetaMask fox icon in your browser toolbar and enter your password if your wallet is currently locked.
                    </p>
                  </div>
                </div>

                <div className="troubleshoot-item">
                  <span className="troubleshoot-num">5</span>
                  <div className="troubleshoot-content">
                    <h4>Incognito / Private Browsing</h4>
                    <p>
                      If this is an Incognito window, extensions are disabled by default. Open <code>chrome://extensions</code>, click MetaMask <em>Details</em>, and enable <strong>"Allow in Incognito"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => window.location.reload()}
              >
                <RotateCw size={15} />
                Reload Tab
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={connectWallet}
              >
                <Wallet size={15} />
                Re-check & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

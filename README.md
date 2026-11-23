# Blockchain-Based Donation Tracking System

> **College Mini-Project**: A decentralized, transparent smart-contract application that records public charity donations and governs fund disbursements on the Ethereum blockchain.

---

## 1. Project Overview & Objective

Traditional donation systems often suffer from a lack of transparency regarding where public funds go after they are collected. This project demonstrates how blockchain technology solves that problem by:

1. **Recording Donations Immutably:** Every contribution in test ETH is stored as an on-chain transaction with an irreversible receipt and event log.
2. **Administrator-Controlled Disbursement Records:** Only the designated contract deployer (the administrator) has permission to record fund disbursements, governed directly by Solidity smart-contract logic (`onlyAdmin` modifier).
3. **Auditable Real-Time Metrics:** Remaining balance, total funds collected, and disbursements are calculated directly from smart-contract storage and verifiable by anyone.
4. **Transparent Audit Log:** Every donation and disbursement emits an indexed blockchain event, forming a tamper-proof audit trail with genuine transaction hashes.

---

## 2. Technology Stack

- **Smart Contract / Blockchain:** Solidity `^0.8.20`
- **Development Environment:** Hardhat (Local node with Chain ID `31337`)
- **Frontend Framework:** React 19 with Vite
- **Styling:** Vanilla CSS (Modern clean dashboard design with accessible typography and responsive grid)
- **Web3 Integration:** Ethers.js v6
- **Wallet Support:** MetaMask browser extension
- **Testing:** Mocha & Chai via Hardhat Test Runner

---

## 3. Architecture & Transaction Flow

### High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite UI                      │
│   (Dashboard, DonationForm, DisbursementForm, Log)     │
└──────────────────────────┬─────────────────────────────┘
                           │
             Ethers.js (BrowserProvider / JsonRpcProvider)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               MetaMask Browser Extension               │
│               (Localhost 8545 / Chain 31337)           │
└──────────────────────────┬─────────────────────────────┘
                           │
             JSON-RPC over HTTP / WebSocket
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Local Hardhat EVM Node (8545)               │
│    ┌──────────────────────────────────────────────┐    │
│    │             DonationTracker.sol              │    │
│    │  • donate() [payable]                        │    │
│    │  • recordDisbursement() [onlyAdmin]          │    │
│    │  • getRemainingBalance()                     │    │
│    │  • Events: DonationReceived, FundsDisbursed  │    │
│    └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

### Transaction Flows

#### A. Donation Flow
1. User connects MetaMask to the local Hardhat network (`Chain ID 31337`).
2. User inputs a donation amount (e.g. `1.0` test ETH) and reviews the live confirmation preview.
3. Clicking **Confirm & Donate** invokes the `donate()` payable function in `DonationTracker.sol`.
4. MetaMask requests user signature and broadcasts the transaction.
5. The smart contract validates `msg.value > 0`, updates `totalDonations`, increments `donationCount`, adds a record to the `donations` array, and emits `DonationReceived`.
6. The frontend receives the mined receipt, displays the transaction hash, and refreshes the dashboard metrics.

#### B. Disbursement Flow (Administrator Only)
1. The contract deployer connects with Account #0 (the administrator address).
2. The UI checks `account.toLowerCase() === admin.toLowerCase()`. If non-admin, the controls are disabled and locked with an access-denied indicator.
3. The administrator enters the amount and description (e.g., `"Emergency food supplies"`).
4. Client and contract validate: `amount > 0` and `amount <= remainingBalance`.
5. The administrator submits the transaction, invoking `recordDisbursement(amount, purpose)` under the `onlyAdmin` modifier.
6. The contract deducts the balance, updates `totalDisbursements`, stores the purpose, and emits `FundsDisbursed`.
7. The table instantly displays the new disbursement event.

---

## 4. Project Structure

```
donation-tracker/
├── contracts/
│   └── DonationTracker.sol     # Smart contract with donation & admin disbursement logic
├── scripts/
│   ├── deploy.cjs              # Deployment script that auto-generates contractConfig.json
│   └── deploy.js               # Runner helper
├── test/
│   ├── DonationTracker.cjs     # 11 unit tests covering all requirements
│   └── DonationTracker.js      # Test runner helper
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx           # Financial metrics and active campaign card
│   │   ├── DonationForm.jsx        # MetaMask payable donation form & validation
│   │   ├── DisbursementForm.jsx    # Admin-restricted disbursement recording form
│   │   └── TransactionHistory.jsx  # Event-driven blockchain audit table
│   ├── contractConfig.json     # Auto-generated contract address, admin, and ABI
│   ├── App.jsx                 # Main state coordinator & Web3 provider management
│   ├── main.jsx                # React root mount
│   └── style.css               # Clean, professional dashboard CSS
├── hardhat.config.cjs          # Hardhat network configuration
├── index.html                  # HTML5 entry with metadata
├── vite.config.js              # Vite bundler configuration
├── package.json                # Project dependencies and convenience scripts
└── README.md                   # Setup and execution guide
```

---

## 5. Step-by-Step Setup & Execution

### Prerequisites
- Node.js (v18 or higher)
- Google Chrome, Brave, or Firefox with the [MetaMask extension](https://metamask.io/) installed

---

### Step 1: Install Dependencies
Open a terminal in the `donation-tracker` directory and run:
```bash
cd donation-tracker
npm install
```

---

### Step 2: Run Smart Contract Tests
Run the automated test suite to verify smart-contract functionality:
```bash
npm test
```
*All 11 tests should pass (validations, admin restrictions, balance limits, event emissions).*

---

### Step 3: Start the Local Hardhat Blockchain
Open a dedicated terminal window and run:
```bash
npm run node
```
This starts a local Ethereum node at `http://127.0.0.1:8545` with **Chain ID 31337** and generates 20 pre-funded test accounts with 10,000 test ETH each.

> **Keep this terminal window running in the background.**

---

### Step 4: Deploy the Smart Contract
Open a **second** terminal window and run:
```bash
npm run deploy
```
This command:
1. Deploys `DonationTracker.sol` using Account #0 as the administrator.
2. Automatically extracts the contract address and ABI.
3. Automatically writes them to `src/contractConfig.json`.

*Note: Whenever you restart `npm run node`, re-run `npm run deploy` to update the contract address.*

---

### Step 5: Start the React Development Server
In the second terminal window, start the frontend:
```bash
npm run dev
```
Open your browser at:
```
http://localhost:5173
```

---

### Step 6: Configure MetaMask for Local Hardhat Network

1. Open the MetaMask browser extension.
2. Click the network selector in the top-left and choose **Add Network** ➔ **Add a network manually**.
3. Fill in the following network details:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to `Hardhat Localhost`.

#### Import the Pre-funded Test Accounts:
- **Administrator Account (Deployer):**
  - In MetaMask: Click Account Icon ➔ **Import Account**.
  - Enter Private Key:
    `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
  - *This account will have administrator access to record disbursements.*
- **Donor Account (Account #1):**
  - Click Account Icon ➔ **Import Account**.
  - Enter Private Key:
    `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
  - *Use this account to make donations as a standard user.*

---

## 6. Verification & Demonstration Checklist

| Feature | Action to Demonstrate | Expected Result |
| :--- | :--- | :--- |
| **Metamask Connection** | Click "Connect MetaMask" | Header shows connected address & Hardhat (31337) status |
| **Live Contract Totals** | View Dashboard summary cards | Real numbers fetched from contract (0 ETH initially) |
| **Make a Donation** | Enter `1.5` ETH with Donor account and click Donate | MetaMask prompts confirmation; on success, tx hash is displayed |
| **Balance Update** | Observe Dashboard metrics | Total Donations: `1.5000 ETH`, Remaining Balance: `1.5000 ETH` |
| **Access Control** | Check Disbursement Form with Donor account | Displays "Administrator Access Restricted" card |
| **Admin Disbursement** | Switch MetaMask to Account #0 (Deployer) | Admin form unlocks with purple badge; enter `0.5` ETH & note |
| **Disbursement Limit** | Attempt to disburse `10` ETH | Form rejects amount exceeding the remaining balance |
| **Audit Trail Table** | Check bottom table | Both Donation and Disbursement appear with real tx hashes |

---

## 7. College Project Viva / Defense FAQ

**Q1: Why use Ethereum smart contracts instead of a standard MySQL / MongoDB database?**  
*Answer:* A centralized database can be altered by any system administrator with write permissions. A smart contract on the blockchain guarantees immutability and transparency: neither donors nor administrators can forge past donation records or alter the disbursed amounts.

**Q2: How is access control enforced for fund disbursements?**  
*Answer:* We use Solidity's `modifier onlyAdmin()` which checks `require(msg.sender == admin)`. Even if someone bypasses the React frontend and sends a raw transaction, the Ethereum Virtual Machine (EVM) will revert the call.

**Q3: How do we prevent withdrawing or disbursing more funds than available?**  
*Answer:* The function `recordDisbursement` validates `require(getRemainingBalance() >= _amount)` where `getRemainingBalance()` returns `totalDonations - totalDisbursements`.

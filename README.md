# RemitFlow

A premium, production-ready decentralized cross-border remittance dashboard powered by the Stellar Network and Soroban Smart Contracts. RemitFlow features real-time status tracking, automated compliance limit validation, and embedded user analytics/telemetry.

---

## 1. Project Information

### Project Name
**RemitFlow** (Stellar Remittance Portal)

### Project Overview
RemitFlow is a next-generation decentralized remittance platform. It allows users to send funds globally securely through smart-contract-governed escrows. It ensures safety by locking funds in escrow until both parties are ready, and automatically checks compliance (like maximum allowed transfer limits) transparently on-chain.

### Problem Statement
Traditional cross-border remittance systems are:
- **Opaque**: Senders have no clear status tracking once funds leave their accounts.
- **Slow & Expensive**: Intermediary banks add substantial fees and delay processing times.
- **Centrally Audited**: Compliance validation is done behind closed doors, leading to unexpected holds or rejected transactions.

### Solution Overview
RemitFlow solves these problems using:
- **Instant Finality & Low Fees**: Leveraging the Stellar network to settle payments in seconds for fractions of a cent.
- **On-chain Escrows**: Ensuring funds are locked securely and can only be released upon recipient payout confirmation.
- **Automated Compliance Check**: Inter-contract calls verify compliance parameters before locking funds.
- **Live Status Tracker**: A dynamic frontend interface showing transaction status from "Sent" to "Released" via a premium stepper.

### Key Features
- **Wallet Connection**: Dynamic authentication via Stellar Wallets Kit (Freighter, etc.).
- **Live Transaction Stepper**: Real-time visual tracking of transactions (Sent -> Compliance Check -> Escrow Locked -> Released).
- **Compliance Guard**: Automatic rejection of deposits exceeding on-chain limits.
- **Recent Activity Feed**: Real-time ingestion of Stellar Testnet contract events.
- **Analytics & Telemetry**: Built-in tracking of wallet connections, transaction times, and errors.

---

## 2. Technology Stack

| Component | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React (v19), Vite (v6), TailwindCSS (v4), Vanilla CSS, Lucide Icons |
| **Smart Contracts** | Soroban Rust SDK, WebAssembly (Wasm) target |
| **Web3 Libraries** | `@stellar/stellar-sdk` (v16.0.1), `@creit.tech/stellar-wallets-kit` |
| **Telemetry & Quality** | Custom client-side analytics (localStorage-backed) & Error monitoring |

---

## 3. Architecture

### System Architecture Diagram
```
[ Sender Wallet ] 
       │  (Initiates Transfer & Signs XDR)
       ▼
[ React Frontend (RemitFlow App) ]
       │  (Invokes Deposit transaction via RPC)
       ▼
[ RemittanceEscrow Smart Contract ] ───(Inter-contract call)───► [ ComplianceCheck Contract ]
       │                                                                │
       │ (Verifies amount <= limit) ◄───────────────────────────────────┘
       ▼
[ Escrow Locked (Status: Pending) ] ◄─── (Wait for Recipient/Anchor Payout Confirmation)
       │
       ▼ (Release funds)
[ Recipient Wallet (Status: Released) ]
```

### Smart Contract Architecture
- **`compliance_check`**: Implements basic compliance limits. Exposes `get_limit`, `set_limit`, and `check_compliance(address, amount)` to ensure transparency.
- **`remittance_escrow`**: Manages the lifecycle of the remittance. Invokes the compliance contract, locks funds in escrow, and releases them upon recipient confirmation.

### Folder Project Structure
```
RemitFlow/
├── contract/                   # Soroban Rust Smart Contracts
│   ├── src/
│   │   ├── compliance_check/   # Compliance contract logic
│   │   └── remittance_escrow/   # Escrow & deposit logic
│   └── Cargo.toml
├── frontend/                   # React Frontend Application
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   │   ├── analytics.js    # In-app event tracker
│   │   │   └── monitoring.js   # Client-side exception & metric catcher
│   │   ├── App.jsx             # Main dashboard
│   │   ├── globals.css         # Styling system
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## 4. Setup and Installation

### Prerequisites
- Node.js (v18.0.0+)
- Rust (v1.75.0+) with `wasm32-unknown-unknown` target
- Stellar CLI (`stellar`) installed globally

### Environment Variables
No custom `.env` is required for local dev, as RPC addresses are preconfigured to connect to the Stellar Testnet:
- **Soroban Testnet RPC**: `https://soroban-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`

### Installation Steps
1. Clone the repository and navigate to the project directory.
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

### Run Locally Instructions
1. Run the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173` in your browser.
3. Install the **Freighter Wallet** browser extension and set it to **Testnet** mode.

---

## 5. Deployment Details

- **ComplianceCheck Contract Address**: `CALNW7TNPWLDZKMWZDTVTDG4XEOOPFNCRVCNG5X64SVKZSGH462C3JIR`
- **RemittanceEscrow Contract Address**: `CD2PM3DDYTWBM3W5LZ4HYK42SIQ4DDMZRKGZOBI7LU7VT55NK372BALY`
- **Example Initialization Tx (Testnet)**: `https://stellar.expert/explorer/testnet/tx/5100ad25fcba0a843a31b11e8de822195c7067c1d74a3409c94f3af3f650a0ac`
- **Stellar Network**: Testnet
- **Live Demo Link**: [remitflow-six.vercel.app](https://remitflow-six.vercel.app/)

---

## 6. Usage Guide

### How to Create/Connect a Wallet
1. Open your browser and install the **Freighter** extension.
2. Create or import an account. Use the Stellar Friendbot to fund it with Testnet XLM.
3. Click the **Connect Wallet** button on the top right of the RemitFlow dashboard.
4. Approve the connection request in the Freighter popup.

### User Flow Explanation
1. **Send Funds**:
   - Enter the recipient's Stellar address.
   - Enter the amount of XLM to send.
   - Click **Send Funds →**. 
   - Confirm the Freighter transaction. The stepper will transition: `Sent` -> `Compliance Check` -> `Escrow Locked`.
2. **Release Funds**:
   - The recipient connects their wallet to the dashboard.
   - Under **Transfer History**, they will see their pending transfers with a **Confirm Payout** button.
   - Clicking it signs a release transaction, updating the status to `Released` and moving the XLM to the recipient's wallet.

---

## 7. Monitoring and Analytics

### Monitoring Tools Used
- **Custom Global Error Catchers**: Active listeners for `error` and `unhandledrejection` events.
- **Latency Tracker**: Logs execution time for wallet authentication and smart contract calls.

### Analytics Setup Details
- **Events Tracked**: Wallet connection, disconnect, deposit start/success/failure, and release transactions.
- **Storage**: Events are securely stored in the browser's `localStorage` and outputted to the developer console for monitoring and debug audits.

---

## 8. Level 5: Live Demo & Evidence

- **Deployed URL**: [remitflow-six.vercel.app](https://remitflow-six.vercel.app/)
- **Demo Video**: [https://youtu.be/HDG9Dxlza0Y](https://youtu.be/HDG9Dxlza0Y)
- **Pitch Deck**: [docs/RemitFlow_PitchDeck_2026-06-24.pptx](./docs/RemitFlow_PitchDeck_2026-06-24.pptx)

---

## 9. User Growth Metrics (Level 5)

- **Total Users Onboarded**: 55
- **Real Transactions Processed**: 55+
- **Average User Satisfaction**: 4.5/5
- **User Feedback Form**: [Google Form Link](https://forms.google.com/remitflow)
- **User Feedback Responses (Google Sheets)**: [Google Sheets Link](https://docs.google.com/spreadsheets/d/1TuelK-ZFMOIi77Qr8GRVVRSSe3qIfWj70EPBgrNzUPg/edit?usp=sharing)
- **Feedback Analysis**: [data/UserFeedback_RemitFlow_2026-06-24.xlsx](./data/UserFeedback_RemitFlow_2026-06-24.xlsx)

---

## 10. Product Improvements (Based on Real User Feedback)

Based on feedback from our 55+ users, we identified and implemented the following improvements:
- **Feature 1**: Export payment history as CSV. Allows users to save transaction records locally. — Commit: [8a1b1b2](https://github.com/Abhishek86038/remitflow-level5/commit/8a1b1b2)
- **Feature 2**: Transaction receipt/invoice feature. Provides downloadable `.txt` receipts for accounting. — Commit: [cda682f](https://github.com/Abhishek86038/remitflow-level5/commit/cda682f)
- **Feature 3**: Better error messages and loading states. Addressed UX bugs where users were unsure if transactions were processing. — Commit: [0ac2488](https://github.com/Abhishek86038/remitflow-level5/commit/0ac2488)
- **Feature 4**: Theme Customizer & Presets. Added multi-accent styling options (Cyan, Purple, Emerald, Sapphire) to improve visual satisfaction. — Commit: [e8292a3](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3)
- **Feature 5**: Recipient Address Book. Added quick-save and quick-select contacts to eliminate copy-paste address risks. — Commit: [38db72e](https://github.com/Abhishek86038/remitflow-level5/commit/38db72e)
- **Feature 6**: Live Telemetry & Dev Console. Added a toggleable on-screen log terminal for tracking events and contract exceptions. — Commit: [e8292a3](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3)
- **Feature 7**: History Filters, Search & KPI widgets. Added status check tabs, transaction lookup search, and live volume/success rate trackers. — Commit: [e8292a3](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3)

### 📊 User Feedback & Implementation Tracker

This table maps real user suggestions to their corresponding implementation status and code commits:

| User Name | Wallet Address | Suggested Improvement / Feature | Commit ID / Status |
| :--- | :--- | :--- | :--- |
| **Shweta sharma** | `GCHVOUEDXJRTXLUAZVBSFABIHUT636UAVL7ATZWWUBRO52RR7OP5CBI4` | It's really annoying to keep copying and pasting those long G... Stellar addresses every single time. Can we please get a simple contact book or wallet saver? It would make sending payouts to my frequent contacts way easier and reduce the risk of sending it to a wrong address| [`38db72e`](https://github.com/Abhishek86038/remitflow-level5/commit/38db72e) |
| **Shivani** | `GBKYSKQ7VFVFCAEKEXCOSLZC5RK3EPVDQMLIUQJ3HIUA4TKBOVC7ZQVW` | the escrow contract and limits work perfectly, but i do a lot of transfers weekly and need to keep track for tax purposes. it would be awesome if we could download our transaction history as a CSV file to open in Excel. | [`8a1b1b2`](https://github.com/Abhishek86038/remitflow-level5/commit/8a1b1b2) |
| **Shreya** | `GASTVZNEON3OSJ5R5YOELNWY7O622OYZ74XWOEQJOUAFPFPDBWEM45US` | I'm trying to study how Soroban contracts execute under the hood. Opening browser developer tools to inspect events is a bit tedious. It would be amazing to have a toggleable log terminal or some telemetry feed right on the screen to see contract logs live!I | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **rohit kushwaha** | `GCSDJAMZ4JZWAY4RSF5PJILNZG7AJUUKICEBMUE2HDP56BUW6NLBUB4I` | really love the futuristic glow styling of the app! but can we get a theme switcher? the blue/cyan is cool but a dark purple or emerald green option would look super sick. | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **Ritesh kant** | `GALXUJI5TIYMUNPJT6Y3FEOYDCXSN3TP5KLRC5VRENJUKUNU67MN67WV` | the dashboard looks great, but could you display the network fee and estimated settlement time before we hit send? just a small estimator near the amount field would give peace of mind | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **Rishi Singh** | `GDTA4AJE34CXM4BUTPLQVBJYGOM2JZGGJ5TWH5RC6QZVU5H2KIQA4RZJ` | Pretty solid dApp! My history is getting quite long and it's hard to find specific transactions. A search box or quick filter buttons to separate pending escrows from released ones would be a huge lifesaver. | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **Ranjan mehta** | `GA5WQTVIO6XJWFML7VIOUS3JRWO3EVNA7J7S24K4MCW4OE3HYEAH357Z` | The compliance card shows my maximum limit, but it doesn't track how much I have sent overall. It would be really helpful to have a quick stats counter showing the total volume sent, active escrows, and a success rate so I can manage my monthly limits better. | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **Nitin Kapoor** | `GCADSJWNBJD7MBH5RY5HCYJH2DKMXOYZVJLTGLEOKSDFE2ZJE3ZXG74P` | Sometimes transactions take a few seconds on testnet and it feels like the app is frozen. A visual step-by-step tracker showing 'sent -> compliance checked -> locked in escrow -> released' would make the wait feel much shorter and reassuring. | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |
| **Suraj Kumar** | `GBAKOBGSHZ5PORMNC5OKEGQQ7AVNCKBSYSFN436QNIO7MIEHCDDERZLH` | i noticed there is no easy way to clear my session logs or change wallets without clearing cache. Having a clear session state with instant pop-up notifications (like toasts) when a wallet connects or disconnects successfully would be a great UX polish | [`e8292a3`](https://github.com/Abhishek86038/remitflow-level5/commit/e8292a3) |

---

## 11. Future Roadmap

### Phase 1 (Next 3 months)
- Multi-currency support (convert XLM to other testnet assets).
- Address book feature for saving frequent recipients.
- Batch payment sending capabilities.

### Phase 2 (6-12 months)
- Mainnet deployment.
- Integration with real Stellar Anchors for fiat on-ramp.
- Enterprise features.

### Phase 3 (12-24 months)
- Multi-anchor support.
- Advanced analytics dashboard.
- API for third-party integrations.

---

## 12. Level 5 Final Submission Checklist

✅ **User Growth**
- [x] 50+ real users onboarded with wallet addresses
- [x] Real transaction activity from these users (verifiable on chain)
- [x] Excel sheet with feedback analysis attached to README
- [x] Google Form link provided for new user feedback

✅ **Product Improvements**
- [x] 2-3 new features or major improvements implemented
- [x] Each improvement has a meaningful git commit with description
- [x] Features are based on real user feedback (documented)
- [x] No regressions in existing functionality

✅ **Presentation & Demo**
- [x] Professional pitch deck (10-12 slides)
- [x] 1-2 minute demo video showcasing real product walkthrough
- [x] Both linked in README and submission form

✅ **Technical Standards**
- [x] 20+ meaningful commits across all improvements
- [x] Live deployed application (Vercel/Netlify)
- [x] Updated documentation with roadmap and metrics
- [x] No broken code or missing dependencies

✅ **GitHub & Submission**
- [x] Public repo with all files
- [x] Latest code pushed to main branch
- [x] Excel feedback sheet in `/data/` folder
- [x] README contains all required sections
- [x] Screenshots of user metrics or transaction activity

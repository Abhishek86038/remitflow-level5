const pptxgen = require('pptxgenjs');

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';

// Slide 1: Title
let slide1 = pres.addSlide();
slide1.background = { color: '0A192F' };
slide1.addText('RemitFlow', { x: 1, y: 2, w: 8, fontSize: 64, bold: true, color: '00B4D8', align: 'center' });
slide1.addText('Fast, Cheap, and Transparent Cross-Border Payments', { x: 1, y: 3.5, w: 8, fontSize: 24, color: 'E2E8F0', align: 'center' });
slide1.addText('Team: Abhishek', { x: 1, y: 4.5, w: 8, fontSize: 18, color: '8892B0', align: 'center' });

// Slide 2: Problem Statement
let slide2 = pres.addSlide();
slide2.background = { color: '0A192F' };
slide2.addText('The Problem', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide2.addText('1. Cross-border payments are slow (days to settle).\n2. Fees are exorbitant (often 5-7% of the total amount).\n3. Lack of transparency leaves users anxious about their funds.\n\nMigrant workers and businesses in the Stellar ecosystem need a better way to move money globally.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 3: Market Opportunity
let slide3 = pres.addSlide();
slide3.background = { color: '0A192F' };
slide3.addText('Market Opportunity', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide3.addText('• Global Remittance Market: $800 Billion+ annually.\n• Current solutions lack blockchain integration for end-users.\n• TAM: Millions of underbanked individuals relying on legacy money transfer operators (MTOs).', { x: 0.5, y: 1.5, w: 9, h: 3, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 4: Solution
let slide4 = pres.addSlide();
slide4.background = { color: '0A192F' };
slide4.addText('The Solution', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide4.addText('RemitFlow solves this by leveraging the Stellar network:\n\n• Near-instant settlement (3-5 seconds).\n• Fractions of a cent in transaction fees.\n• Fully transparent, on-chain tracking of funds.\n• Seamless integration with Stellar wallets like Freighter.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 5: Product Features
let slide5 = pres.addSlide();
slide5.background = { color: '0A192F' };
slide5.addText('Product Features', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide5.addText('• Real-time payment categorization and tracking.\n• Compliance limits built into Soroban Smart Contracts.\n• Beautiful, intuitive UI with responsive design.\n• NEW: CSV Export & Printable Transaction Receipts.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 6: Architecture
let slide6 = pres.addSlide();
slide6.background = { color: '0A192F' };
slide6.addText('Technical Architecture', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide6.addText('Frontend: React, Vite, TailwindCSS\nSmart Contracts: Soroban (Rust)\nBlockchain: Stellar Testnet\n\nFlow:\nUser -> Connects Freighter Wallet -> Invokes Deposit Contract -> Funds Escrowed -> Recipient Releases Funds', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 20, color: 'E2E8F0', lineSpacing: 25 });

// Slide 7: User Growth Strategy
let slide7 = pres.addSlide();
slide7.background = { color: '0A192F' };
slide7.addText('User Growth Strategy', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide7.addText('• Engage with Stellar community (Discord, Twitter).\n• Educational content on low-cost remittances.\n• Partner with local university crypto clubs.\n• Beta testing programs for continuous feedback.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 8: Traction / Current Metrics
let slide8 = pres.addSlide();
slide8.background = { color: '0A192F' };
slide8.addText('Traction & Metrics', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide8.addText('We asked users to try RemitFlow on Testnet:\n\n• Total Users Onboarded: 55\n• Transactions Processed: 55+\n• Average User Satisfaction: 4.5 / 5\n• Top Feedback: Added export features and better UI loaders.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', bullet: true, lineSpacing: 30 });

// Slide 9: Future Roadmap
let slide9 = pres.addSlide();
slide9.background = { color: '0A192F' };
slide9.addText('Future Roadmap', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide9.addText('Phase 1 (0-3 Mos): Address book features, multi-currency display.\nPhase 2 (6-12 Mos): Mainnet deployment, real fiat on-ramps via Stellar Anchors.\nPhase 3 (12-24 Mos): Enterprise API integrations, multi-anchor support.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', lineSpacing: 30 });

// Slide 10: Financials / Monetization
let slide10 = pres.addSlide();
slide10.background = { color: '0A192F' };
slide10.addText('Monetization', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8' });
slide10.addText('Revenue Model:\n• Free for basic users.\n• Nominal flat fee (0.1% or $0.50) on premium rapid cross-border settlements.\n• B2B API access for businesses routing global payroll.\n\nCost Structure: Extremely low due to Stellar network efficiency.', { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 22, color: 'E2E8F0', lineSpacing: 30 });

// Slide 11: Call to Action
let slide11 = pres.addSlide();
slide11.background = { color: '0A192F' };
slide11.addText('Join the Future of Payments', { x: 0.5, y: 0.5, w: 9, fontSize: 36, bold: true, color: '00B4D8', align: 'center' });
slide11.addText('Try RemitFlow on Testnet today.\n\nLive Demo: remitflow.vercel.app\nFeedback: forms.google.com/remitflow', { x: 0.5, y: 2.5, w: 9, fontSize: 24, color: 'E2E8F0', align: 'center', lineSpacing: 30 });

// Slide 12: Q&A
let slide12 = pres.addSlide();
slide12.background = { color: '0A192F' };
slide12.addText('Q&A', { x: 1, y: 2.5, w: 8, fontSize: 64, bold: true, color: '00B4D8', align: 'center' });

const dateStr = new Date().toISOString().split('T')[0];
pres.writeFile({ fileName: `docs/RemitFlow_PitchDeck_${dateStr}.pptx` }).then(fileName => {
    console.log(`created file: ${fileName}`);
});

import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Wallet, ArrowRight, ShieldCheck, Lock, CheckCircle, Activity, History, Sparkles, Search, UserPlus, Trash2, Terminal, X, TrendingUp, Percent, Zap, Palette } from 'lucide-react';
import { connectWallet } from './wallet';
import { getLimit } from './complianceContract';
import { deposit, releaseFunds, getTransferHistory } from './escrowContract';
import { getRecentEvents } from './activityFeed';
import { trackEvent } from './utils/analytics';
import { logException, logMetric } from './utils/monitoring';
import './styles/main.css';

function App() {
  const [address, setAddress] = useState('');
  const [limit, setLimit] = useState(0);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTracker, setActiveTracker] = useState(null);
  
  // Remittance Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // New Premium Feature States
  const [devMode, setDevMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [contacts, setContacts] = useState(() => JSON.parse(localStorage.getItem('remitflow_contacts') || '[]'));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [theme, setTheme] = useState(() => localStorage.getItem('remitflow_theme') || 'cyan');

  const themeColors = {
    cyan: { glow: '#00B4D8', neon: '#0077FF' },
    purple: { glow: '#a855f7', neon: '#6366f1' },
    emerald: { glow: '#10b981', neon: '#059669' },
    amber: { glow: '#f59e0b', neon: '#d97706' },
  };

  const themeStyles = {
    textGlow: { color: themeColors[theme].glow },
    bgGlow10: { backgroundColor: `${themeColors[theme].glow}1a` },
    bgGlow20: { backgroundColor: `${themeColors[theme].glow}33` },
    bgGlow5: { backgroundColor: `${themeColors[theme].glow}0d` },
    borderGlow20: { borderColor: `${themeColors[theme].glow}33` },
    borderGlow: { borderColor: themeColors[theme].glow },
    gradientBg: { backgroundImage: `linear-gradient(to right, ${themeColors[theme].glow}, ${themeColors[theme].neon})` },
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('remitflow_theme', newTheme);
    trackEvent('theme_changed', { theme: newTheme });
  };

  const handleSaveContact = () => {
    if (!recipient.startsWith('G') || recipient.length !== 56) {
      return toast.error('Enter a valid Stellar address first to save');
    }
    const namePrompt = prompt('Enter a name for this recipient:');
    if (!namePrompt) return;
    
    if (contacts.some(c => c.address === recipient)) {
      return toast.error('Address already saved');
    }
    
    const newContacts = [...contacts, { name: namePrompt, address: recipient }];
    setContacts(newContacts);
    localStorage.setItem('remitflow_contacts', JSON.stringify(newContacts));
    toast.success(`Saved contact: ${namePrompt}`);
    trackEvent('contact_saved', { name: namePrompt, address: recipient });
  };

  const handleDeleteContact = (addrToDelete, e) => {
    e.stopPropagation();
    const filtered = contacts.filter(c => c.address !== addrToDelete);
    setContacts(filtered);
    localStorage.setItem('remitflow_contacts', JSON.stringify(filtered));
    toast.info('Contact deleted');
  };

  const loadLogs = () => {
    try {
      const raw = localStorage.getItem('remitflow_analytics_events') || '[]';
      setLogs(JSON.parse(raw).reverse());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 2500);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (addr = address) => {
    if (!addr) return;
    const fetchedLimit = await getLimit(addr);
    setLimit(fetchedLimit);
    
    const fetchedHistory = await getTransferHistory(addr);
    setHistory(fetchedHistory);
 
    const fetchedEvents = await getRecentEvents();
    setEvents(fetchedEvents);
  };

  useEffect(() => {
    if (address) {
      loadData(address);
    }
  }, [address]);

  useEffect(() => {
    let interval;
    if (address) {
      interval = setInterval(() => loadData(address), 10000); // Poll every 10s
    }
    return () => clearInterval(interval);
  }, [address]);

  const handleConnect = async () => {
    const startTime = Date.now();
    try {
      const pubKey = await connectWallet();
      setAddress(pubKey);
      toast.success('Wallet connected successfully!');
      trackEvent('wallet_connected', { address: pubKey });
      logMetric('wallet_connection_time', Date.now() - startTime);
    } catch (e) {
      toast.error('Failed to connect wallet: ' + e.message);
      logException(e, { action: 'wallet_connect' });
    }
  };

  const handleDisconnect = async () => {
    try {
      const prevAddress = address;
      setAddress('');
      setHistory([]);
      setLimit(0);
      setActiveTracker(null);
      toast.info('Wallet disconnected');
      trackEvent('wallet_disconnected', { address: prevAddress });
    } catch (e) {
      console.error(e);
      logException(e, { action: 'wallet_disconnect' });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!address) return toast.error('Please connect your wallet first');
    if (!recipient || !amount) return toast.error('Please fill all fields');
    if (recipient === address) return toast.error('Cannot send to your own address');
    if (!recipient.startsWith('G') || recipient.length !== 56) return toast.error('Invalid Stellar recipient address format');
    if (Number(amount) <= 0) return toast.error('Amount must be greater than 0');
    if (Number(amount) > limit) return toast.error(`Amount exceeds compliance limit of ${limit} XLM`);

    const startTime = Date.now();
    try {
      setLoading(true);
      trackEvent('deposit_initiated', { sender: address, recipient, amount });
      
      // Step 0: Sent
      setActiveTracker({
        recipient,
        amount,
        currentStep: 0,
        label: 'Transaction Initiated'
      });
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 1: Compliance Check
      setActiveTracker(prev => ({
        ...prev,
        currentStep: 1,
        label: 'Verifying Compliance & Limits'
      }));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Escrow Lock & Deposit
      setActiveTracker(prev => ({
        ...prev,
        currentStep: 2,
        label: 'Escrow Locking...'
      }));

      const res = await deposit(address, recipient, amount);
      if (res.success) {
        toast.success(`Funds deposited! Hash: ${res.hash.slice(0,10)}...`);
        
        setActiveTracker(prev => ({
          ...prev,
          currentStep: 2,
          label: 'Escrow Locked (XLM Deposited)'
        }));

        trackEvent('deposit_success', { sender: address, recipient, amount, hash: res.hash });
        logMetric('deposit_execution_time', Date.now() - startTime);
        
        setAmount('');
        setRecipient('');
        loadData();

        setTimeout(() => {
          setActiveTracker(null);
        }, 5000);
      }
    } catch (e) {
      setActiveTracker(null);
      trackEvent('deposit_failed', { sender: address, recipient, amount, error: e.message });
      logException(e, { action: 'deposit', sender: address, recipient, amount });
      toast.error(e.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (transferId) => {
    if (!address) return toast.error('Please connect your wallet first');
    const startTime = Date.now();
    try {
      const transferObj = history.find(t => t.id === transferId);
      if (transferObj) {
        setActiveTracker({
          recipient: transferObj.recipient,
          amount: transferObj.amount,
          currentStep: 2,
          label: 'Releasing Escrowed Funds...'
        });
      }

      trackEvent('release_initiated', { recipient: address, transferId });
      const res = await releaseFunds(address, transferId);
      if (res.success) {
        toast.success(`Funds released! Hash: ${res.hash.slice(0,10)}...`);
        
        if (transferObj) {
          setActiveTracker({
            recipient: transferObj.recipient,
            amount: transferObj.amount,
            currentStep: 3,
            label: 'Funds Released successfully'
          });
        }
        
        trackEvent('release_success', { recipient: address, transferId, hash: res.hash });
        logMetric('release_execution_time', Date.now() - startTime);
        loadData();

        setTimeout(() => {
          setActiveTracker(null);
        }, 5000);
      }
    } catch (e) {
      setActiveTracker(null);
      trackEvent('release_failed', { recipient: address, transferId, error: e.message });
      logException(e, { action: 'release', recipient: address, transferId });
      toast.error(e.message || 'Release failed');
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return toast.error('No history to export');
    const headers = ['ID', 'Recipient', 'Amount (XLM)', 'Status'];
    const rows = history.map(t => `${t.id},${t.recipient},${t.amount},${t.status}`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RemitFlow_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('History exported successfully!');
    trackEvent('export_history_csv', { count: history.length });
  };

  const handleDownloadReceipt = (t) => {
    const receiptText = `REMITFLOW TRANSACTION RECEIPT\n---------------------------\nDate: ${new Date().toLocaleString()}\nTransaction ID: ${t.id}\nSender: ${address}\nRecipient: ${t.recipient}\nAmount: ${t.amount} XLM\nStatus: ${t.status}\n\nThank you for using RemitFlow on Stellar Testnet!`;
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `receipt_${t.id}.txt`;
    link.href = url;
    link.click();
    toast.success('Receipt downloaded!');
    trackEvent('download_receipt', { transferId: t.id });
  };

  // Derived dashboard metrics & history filtering
  const filteredHistory = history.filter(t => {
    const matchesSearch = (t.id || '').toString().toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.recipient || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && (t.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const totalVolume = history.reduce((acc, val) => acc + Number(val.amount || 0), 0);

  const successRate = history.length > 0 
    ? Math.round((history.filter(t => t.status === 'Released').length / history.length) * 100) 
    : 100;

  const activeEscrows = history.filter(t => t.status === 'Pending').length;

  const getRecipientDisplay = (addr) => {
    if (!addr) return '';
    const contact = contacts.find(c => c.address === addr);
    return contact ? `${contact.name} (${addr.slice(0, 4)}...${addr.slice(-4)})` : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div 
      className="min-h-screen text-white font-sans relative z-10 selection:bg-cyan-500/30 selection:text-cyan-200"
      style={{
        '--cyan-glow': themeColors[theme].glow,
        '--blue-neon': themeColors[theme].neon,
      }}
    >
      <ToastContainer theme="dark" toastClassName="glass-card !border-white/10 !bg-slate-950/80 !backdrop-blur-md" />
      
      {/* Navigation Header */}
      <nav className="glassmorphism flex flex-col md:flex-row gap-4 justify-between items-center py-4 px-6 md:px-8 sticky top-0 z-50 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl shadow-lg" style={themeStyles.gradientBg}>
            <Activity size={22} className="text-white animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-[32px] font-bold select-none tracking-tight">
            <span className="font-[Inter] text-white">Remit</span>
            <span className="font-[Stellar_Display] rotate-[1.5deg] inline-block ml-1" style={themeStyles.textGlow}>Flow</span>
          </h1>
        </div>
        
        <div className="flex gap-3 items-center flex-wrap">
          {/* Theme Presets Dropdown */}
          <div className="relative group">
            <button 
              className="px-3 h-[42px] rounded-[14px] border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 flex items-center gap-2 text-xs font-semibold cursor-pointer"
              title="Change Theme Color"
            >
              <Palette size={14} style={themeStyles.textGlow} />
              <span className="hidden sm:inline">Theme</span>
            </button>
            <div className="absolute right-0 mt-2 w-36 bg-slate-950/95 border border-white/10 rounded-xl p-2 hidden group-hover:block hover:block z-50 backdrop-blur-md shadow-2xl">
              {Object.keys(themeColors).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all hover:bg-white/5 cursor-pointer ${
                    theme === t ? 'text-white font-bold bg-white/10' : 'text-slate-400'
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-white/20" 
                    style={{ backgroundColor: themeColors[t].glow }}
                  ></span>
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Developer Mode Console Toggle */}
          <button
            onClick={() => {
              setDevMode(!devMode);
              trackEvent('dev_console_toggled', { active: !devMode });
            }}
            className={`px-3 h-[42px] rounded-[14px] border transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer ${
              devMode 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Terminal size={14} />
            <span className="hidden sm:inline">Dev Mode</span>
            <span className={`w-1.5 h-1.5 rounded-full ${devMode ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`}></span>
          </button>

          {address ? (
            <div className="flex items-center gap-3">
              <span className="text-xs bg-white/5 px-4 py-2.5 rounded-full font-mono shadow-inner border border-white/5 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block mr-2 animate-pulse"></span>
                {address.slice(0,6)}...{address.slice(-4)}
              </span>
              <button 
                onClick={handleDisconnect} 
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-5 py-2.5 rounded-full border border-red-500/20 transition-all duration-300 text-xs font-semibold tracking-wide uppercase cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnect} 
              className="px-6 h-[42px] rounded-[14px] border font-medium transition-all flex items-center gap-2 cursor-pointer"
              style={{ borderColor: themeColors[theme].glow, backgroundColor: `${themeColors[theme].glow}1a`, color: themeColors[theme].glow }}
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-[29px] p-6 lg:p-[46px] relative z-10 pb-36">
        
        {/* Left Column */}
        <div className="flex flex-col gap-[29px]">
          
          {/* Compliance Limit Card */}
          <div className="glass-card h-[180px] p-[24px] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -z-10 group-hover:bg-cyan-500/10 transition-all duration-700"></div>
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <ShieldCheck style={themeStyles.textGlow} size={16} /> Compliance Check
            </h2>
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Maximum Limit</p>
              <p className="text-[52px] font-bold tracking-tight leading-none">
                {limit} <span className="text-[18px] uppercase tracking-[2px] font-semibold" style={themeStyles.textGlow}>XLM</span>
              </p>
            </div>
          </div>

          {/* Send Remittance Card */}
          <div className="glass-card min-h-[320px] p-[28px] relative overflow-hidden flex flex-col justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Send Remittance
            </h2>
            
            {/* Quick Contacts List */}
            {contacts.length > 0 && (
              <div className="animate-fadeIn">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <UserPlus size={10} style={themeStyles.textGlow} /> Quick Select Recipient
                </label>
                <div className="flex flex-wrap gap-1 max-h-[62px] overflow-y-auto pr-1">
                  {contacts.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => setRecipient(c.address)}
                      className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 flex items-center gap-1 transition-all cursor-pointer group"
                    >
                      <span className="font-semibold text-slate-300 group-hover:text-white">{c.name}</span>
                      <span className="text-[8px] text-slate-500">({c.address.slice(0, 4)}...)</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteContact(c.address, e)}
                        className="text-slate-600 hover:text-red-400 ml-1 font-bold p-0.5"
                        title="Delete contact"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3.5 my-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Recipient Address</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="G..." 
                    className="w-full premium-input px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    title="Save to Address Book"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <UserPlus size={16} style={themeStyles.textGlow} />
                  </button>
                </div>
                {contacts.find(c => c.address === recipient) && (
                  <div className="mt-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-between text-[11px] text-slate-300 animate-fadeIn" style={{ borderColor: `${themeColors[theme].glow}22`, backgroundColor: `${themeColors[theme].glow}0d` }}>
                    <span className="flex items-center gap-1.5 font-medium text-white">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColors[theme].glow }}></span>
                      Recipient Identified: <strong className="text-white">{contacts.find(c => c.address === recipient).name}</strong>
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Saved Contact</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" 
                    className="w-full premium-input px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none font-mono text-sm pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold tracking-wider" style={themeStyles.textGlow}>XLM</span>
                </div>
              </div>

              {/* Smart Estimator */}
              {amount && Number(amount) > 0 && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Est. Network Fee:</span>
                    <span className="font-semibold text-white">0.0001 XLM</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Est. Settlement:</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Zap size={10} className="animate-pulse" /> ~3-5 Sec
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Size Check:</span>
                    {Number(amount) <= limit ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <CheckCircle size={10} /> Valid compliance size
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold">Exceeds limit ({limit} XLM)</span>
                    )}
                  </div>
                </div>
              )}
              
              <button 
                disabled={loading}
                type="submit" 
                className="w-full h-[48px] rounded-[16px] font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-[2px] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                style={themeStyles.gradientBg}
              >
                {loading ? (
                  <>
                    <Activity className="animate-spin text-cyan-200" size={16} />
                    <span className="animate-pulse">Processing...</span>
                  </>
                ) : (
                  <>
                    Send Funds →
                    <Sparkles size={14} className="text-cyan-200" />
                  </>
                )}
              </button>
            </form>
          </div>
          
        </div>

        {/* Right Column - Span 2 */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-[29px]">
          
          {/* Transfer History Card */}
          <div className="glass-card min-h-[380px] p-[28px] relative overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <History style={themeStyles.textGlow} size={18} /> Transfer History
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={handleExportCSV}
                  className="text-[11px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                  style={{ borderColor: `${themeColors[theme].glow}33`, color: themeColors[theme].glow }}
                >
                  Export CSV
                </button>
              )}
            </div>

            {/* KPI Stats widgets */}
            <div className="grid grid-cols-3 gap-3 mb-4.5">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                  <TrendingUp size={10} className="text-slate-400" /> Total Volume
                </span>
                <span className="text-base font-bold text-white mt-1">
                  {totalVolume.toFixed(2)} <span className="text-[10px] font-semibold" style={themeStyles.textGlow}>XLM</span>
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                  <Percent size={10} className="text-slate-400" /> Success Rate
                </span>
                <span className="text-base font-bold text-white mt-1">
                  {successRate}%
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                  <Lock size={10} className="text-slate-400" /> Active Escrows
                </span>
                <span className="text-base font-bold text-white mt-1">
                  {activeEscrows} <span className="text-[9px] text-slate-500 font-medium">Pending</span>
                </span>
              </div>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center mb-4">
              <div className="flex gap-1 bg-black/20 p-1 rounded-lg border border-white/5 self-start">
                {['All', 'Pending', 'Released'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      statusFilter === status 
                        ? 'text-white font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    style={statusFilter === status ? { backgroundColor: `${themeColors[theme].glow}26`, border: `1px solid ${themeColors[theme].glow}22` } : {}}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="relative flex-grow sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search by ID or Address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/20 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  style={{ '--tw-ring-color': themeColors[theme].glow }}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <p className="text-xs font-medium text-slate-400">
                    No transactions found.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left premium-table">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider">
                        <th className="pb-2 font-semibold">ID</th>
                        <th className="pb-2 font-semibold">Recipient</th>
                        <th className="pb-2 font-semibold">Amount</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredHistory.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-2.5 text-xs font-medium text-slate-400">#{t.id}</td>
                          <td className="py-2.5 font-mono text-xs text-slate-300" title={t.recipient}>
                            {getRecipientDisplay(t.recipient)}
                          </td>
                          <td className="py-2.5 text-xs font-semibold text-white">{t.amount} XLM</td>
                          <td className="py-2.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              t.status === 'Pending' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            {t.status === 'Pending' && t.recipient === address ? (
                              <button 
                                onClick={() => handleRelease(t.id)}
                                className="text-[11px] font-bold px-3 py-1 rounded-lg transition-all border active:scale-95 cursor-pointer"
                                style={{ backgroundColor: `${themeColors[theme].glow}1a`, borderColor: `${themeColors[theme].glow}33`, color: themeColors[theme].glow }}
                              >
                                Confirm Payout
                              </button>
                            ) : t.status === 'Pending' ? (
                               <span className="text-[11px] font-medium text-slate-500 italic">Waiting for Recipient</span>
                            ) : (
                              <div className="flex justify-end items-center gap-2">
                                <span className="text-emerald-400 inline-flex items-center"><CheckCircle size={16} /></span>
                                <button onClick={() => handleDownloadReceipt(t)} className="text-[10px] uppercase font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5 transition-all cursor-pointer">Receipt</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          {/* Transfer Status Tracker visualizer (using the latest active transfer or activeTracker) */}
          {(activeTracker || history.length > 0) && (
            <div className="glass-card p-[24px] relative overflow-hidden">
              {(() => {
                const latest = history[history.length - 1];
                const activeObj = activeTracker || (latest ? {
                  recipient: latest.recipient,
                  amount: latest.amount,
                  currentStep: latest.status === 'Pending' ? 2 : 3,
                  label: latest.status === 'Pending' ? 'Escrow Locked' : 'Released'
                } : null);

                if (!activeObj) return null;

                const steps = ['Sent', 'Compliance Check', 'Escrow Locked', 'Released'];
                const currentStep = activeObj.currentStep;

                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">
                        Latest Transfer Status
                      </h2>
                      <span 
                        className="text-[11px] font-semibold bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-inner"
                        style={{ color: themeColors[theme].glow }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" style={{ backgroundColor: themeColors[theme].glow }}></span>
                        {activeObj.label} ({activeObj.amount} XLM to {getRecipientDisplay(activeObj.recipient)})
                      </span>
                    </div>
                    
                    <div className="relative py-2">
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 rounded-full"></div>
                      <div 
                        className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${(currentStep / (steps.length - 1)) * 100}%`,
                          backgroundImage: `linear-gradient(to right, ${themeColors[theme].glow}, ${themeColors[theme].neon})`
                        }}
                      ></div>
                      
                      <div className="relative flex justify-between">
                        {steps.map((step, idx) => {
                          const isCompleted = idx <= currentStep;
                          const isActive = idx === currentStep;
                          return (
                            <div key={idx} className="flex flex-col items-center">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                                  isCompleted 
                                    ? 'shadow-md text-white font-bold' 
                                    : 'bg-slate-900 border border-white/5 text-slate-600'
                                } ${isActive ? 'scale-110' : ''}`}
                                style={{
                                  ...(isCompleted ? themeStyles.gradientBg : {}),
                                  boxShadow: isCompleted ? `0 0 10px ${themeColors[theme].glow}44` : 'none',
                                  borderColor: isActive ? themeColors[theme].glow : 'rgba(255,255,255,0.05)'
                                }}
                              >
                                {isCompleted ? <CheckCircle size={15} /> : <Lock size={12} />}
                              </div>
                              <span className={`mt-3 text-[10px] font-bold uppercase tracking-wider text-center w-20 ${
                                isCompleted ? 'text-slate-300' : 'text-slate-600'
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Live Activity Feed */}
          <div className="glass-card h-[220px] p-[24px] relative overflow-hidden flex flex-col justify-between">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity style={themeStyles.textGlow} size={16} /> Live Activity Feed
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full ml-2" style={{ backgroundColor: `${themeColors[theme].glow}22`, color: themeColors[theme].glow }}>Testnet</span>
            </h2>
            
            <div className="flex-grow overflow-y-auto pr-1 max-h-[120px]">
              {events.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-white/5 rounded-xl">
                  No recent events found on Testnet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/[0.01] hover:bg-white/[0.03] p-2.5 rounded-xl border border-white/5 transition-all">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${themeColors[theme].glow}1a`, color: themeColors[theme].glow }}>
                        <Activity size={14} className="animate-pulse" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-semibold text-slate-200">Contract Event Emitted</p>
                          <span className="text-[10px] font-mono text-slate-500">Ledger: {ev.ledger}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-md" title={ev.id}>ID: {ev.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Docked Telemetry & Audit Console */}
      {devMode && (
        <div 
          className="fixed bottom-0 left-0 right-0 h-64 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col font-mono text-xs select-none border-t border-dashed"
          style={{ borderTopColor: `${themeColors[theme].glow}44` }}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-slate-900/50">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal size={14} />
              <span>REMITFLOW TELEMETRY & AUDIT CONSOLE ({theme.toUpperCase()} Preset)</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  localStorage.setItem('remitflow_analytics_events', '[]');
                  setLogs([]);
                  toast.info('Telemetry logs cleared');
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
              >
                Clear Logs
              </button>
              <button
                onClick={() => setDevMode(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-grow p-4 overflow-y-auto space-y-1.5 text-slate-300">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic text-center py-12">
                No logs captured yet. Try sending a transaction, connecting a wallet, or changing themes to see live telemetry.
              </div>
            ) : (
              logs.map((log, index) => {
                let logColor = 'text-cyan-400';
                if (log.eventName.includes('failed') || log.eventName.includes('error')) logColor = 'text-red-400';
                if (log.eventName.includes('success')) logColor = 'text-emerald-400';
                if (log.eventName.includes('init') || log.eventName.includes('connect')) logColor = 'text-amber-400';
                
                return (
                  <div key={index} className="flex gap-2 hover:bg-white/5 py-0.5 px-1 rounded transition-colors">
                    <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-semibold ${logColor}`}>{log.eventName}</span>
                    <span className="text-slate-400 font-sans truncate max-w-4xl">
                      {JSON.stringify(log.properties)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

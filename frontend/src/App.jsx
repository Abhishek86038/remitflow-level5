import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Wallet, ArrowRight, ShieldCheck, Lock, CheckCircle, Activity, History, Sparkles } from 'lucide-react';
import { connectWallet } from './wallet';
import { getLimit } from './complianceContract';
import { deposit, releaseFunds, getTransferHistory } from './escrowContract';
import { getRecentEvents } from './activityFeed';
import './styles/main.css';

function App() {
  const [address, setAddress] = useState('');
  const [limit, setLimit] = useState(0);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Remittance Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      loadData();
    }
  }, [address]);

  const loadData = async () => {
    const fetchedLimit = await getLimit(address);
    setLimit(fetchedLimit);
    
    const fetchedHistory = await getTransferHistory(address);
    setHistory(fetchedHistory);

    const fetchedEvents = await getRecentEvents();
    setEvents(fetchedEvents);
  };

  useEffect(() => {
    let interval;
    if (address) {
      interval = setInterval(loadData, 10000); // Poll every 10s
    }
    return () => clearInterval(interval);
  }, [address]);

  const handleConnect = async () => {
    try {
      const pubKey = await connectWallet();
      setAddress(pubKey);
      toast.success('Wallet connected successfully!');
    } catch (e) {
      toast.error('Failed to connect wallet: ' + e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Disconnect via kit or simply clear state
      setAddress('');
      toast.info('Wallet disconnected');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!address) return toast.error('Please connect your wallet first');
    if (!recipient || !amount) return toast.error('Please fill all fields');
    if (Number(amount) > limit) return toast.error(`Amount exceeds compliance limit of ${limit} XLM`);

    try {
      setLoading(true);
      const res = await deposit(address, recipient, amount);
      if (res.success) {
        toast.success(`Funds deposited! Hash: ${res.hash.slice(0,10)}...`);
        setAmount('');
        setRecipient('');
        loadData();
      }
    } catch (e) {
      toast.error(e.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (transferId) => {
    if (!address) return toast.error('Please connect your wallet first');
    try {
      const res = await releaseFunds(address, transferId);
      if (res.success) {
        toast.success(`Funds released! Hash: ${res.hash.slice(0,10)}...`);
        loadData();
      }
    } catch (e) {
      toast.error(e.message || 'Release failed');
    }
  };

  return (
    <div className="min-h-screen text-white font-sans relative z-10 selection:bg-cyan-500/30 selection:text-cyan-200">
      <ToastContainer theme="dark" toastClassName="glass-card !border-white/10 !bg-slate-950/80 !backdrop-blur-md" />
      
      {/* Navigation Header */}
      <nav className="glassmorphism flex justify-between items-center py-5 px-8 sticky top-0 z-50 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
            <Activity size={22} className="text-white animate-pulse" />
          </div>
          <h1 className="text-[32px] font-bold select-none tracking-tight">
            <span className="font-[Inter] text-white">Remit</span>
            <span className="font-[Stellar_Display] rotate-[1.5deg] inline-block ml-1 text-cyan-400">Flow</span>
          </h1>
        </div>
        
        <div className="flex gap-4 items-center">
          {address ? (
            <div className="flex items-center gap-4">
              <span className="text-xs bg-white/5 px-4 py-2.5 rounded-full font-mono shadow-inner border border-white/5 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block mr-2"></span>
                {address.slice(0,6)}...{address.slice(-4)}
              </span>
              <button 
                onClick={handleDisconnect} 
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-5 py-2.5 rounded-full border border-red-500/20 transition-all duration-300 text-xs font-semibold tracking-wide uppercase"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnect} 
              className="px-6 h-[42px] rounded-[14px] border border-[#00B4D8] bg-[#00B4D8]/10 text-[#00B4D8] font-medium hover:bg-[#00B4D8]/20 transition-all flex items-center gap-2"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="grid grid-cols-3 gap-[29px] p-[46px] relative z-10">
        
        {/* Left Column */}
        <div className="flex flex-col gap-[29px]">
          
          {/* Compliance Limit Card */}
          <div className="glass-card h-[180px] p-[24px] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -z-10 group-hover:bg-cyan-500/10 transition-all duration-700"></div>
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" size={16} /> Compliance Check
            </h2>
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Maximum Limit</p>
              <p className="text-[52px] font-bold tracking-tight leading-none">
                {limit} <span className="text-[18px] uppercase tracking-[2px] text-[#00B4D8]">XLM</span>
              </p>
            </div>
          </div>

          {/* Send Remittance Card */}
          <div className="glass-card h-[320px] p-[28px] relative overflow-hidden flex flex-col justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Send Remittance
            </h2>
            <form onSubmit={handleSend} className="space-y-4 my-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Recipient Address</label>
                <input 
                  type="text" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="G..." 
                  className="w-full premium-input px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none font-mono text-xs"
                />
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
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 tracking-wider">XLM</span>
                </div>
              </div>
              
              <button 
                disabled={loading}
                type="submit" 
                className="w-full h-[48px] rounded-[16px] bg-gradient-to-r from-[#00B4D8] to-[#0077FF] font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:-translate-y-[2px] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="animate-pulse">Processing...</span>
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
        <div className="col-span-2 flex flex-col gap-[29px]">
          
          {/* Transfer History Card */}
          <div className="glass-card h-[380px] p-[28px] relative overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold tracking-tight text-white mb-4 flex items-center gap-2">
              <History className="text-[#00B4D8]" size={18} /> Transfer History
            </h2>
            
            <div className="flex-grow overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm font-medium text-slate-400">
                    Abhi tak koi transfer nahi hua. Pehla XLM bhejne ke liye ready?
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
                      {history.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-2.5 text-xs font-medium text-slate-400">#{t.id}</td>
                          <td className="py-2.5 font-mono text-xs text-slate-300" title={t.recipient}>
                            {t.recipient.slice(0,6)}...{t.recipient.slice(-4)}
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
                                className="text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00B4D8] px-3 py-1 rounded-lg transition-all border border-[#00B4D8]/20 active:scale-95"
                              >
                                Confirm Payout
                              </button>
                            ) : t.status === 'Pending' ? (
                               <span className="text-[11px] font-medium text-slate-500 italic">Waiting for Recipient</span>
                            ) : (
                              <span className="text-emerald-400 inline-flex items-center justify-end"><CheckCircle size={16} /></span>
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
          
          {/* Transfer Status Tracker visualizer (using the latest active transfer if any) */}
          {history.length > 0 && (
            <div className="glass-card p-[24px] relative overflow-hidden">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4">Latest Transfer Status</h2>
              {(() => {
                const latest = history[history.length - 1];
                const steps = ['Sent', 'Compliance Check', 'Escrow Locked', 'Released'];
                const currentStep = latest.status === 'Pending' ? 2 : 3;

                return (
                  <div className="relative py-2">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 rounded-full"></div>
                    <div 
                      className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 -translate-y-1/2 rounded-full transition-all duration-1000"
                      style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    ></div>
                    
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStep;
                        const isActive = idx === currentStep;
                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                              isCompleted 
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/25 text-white' 
                                : 'bg-slate-900 border border-white/5 text-slate-600'
                            } ${isActive ? 'scale-110 ring-4 ring-cyan-500/10' : ''}`}>
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
                );
              })()}
            </div>
          )}

          {/* Live Activity Feed */}
          <div className="glass-card h-[220px] p-[24px] relative overflow-hidden flex flex-col justify-between">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="text-cyan-400" size={16} /> Live Activity Feed
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full ml-2">Testnet</span>
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
                      <div className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg">
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
    </div>
  );
}

export default App;

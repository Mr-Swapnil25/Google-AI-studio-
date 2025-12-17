import React, { useEffect, useState } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { firebaseService } from '../services/firebaseService';
import { useToast } from '../context/ToastContext';

interface WalletData {
  balance: number;
  weeklyChange: number;
  transactions: Transaction[];
  loading: boolean;
}

interface WithdrawalModalState {
  isOpen: boolean;
  amount: number;
  accountNumber: string;
  ifscCode: string;
}

interface TopUpModalState {
  isOpen: boolean;
  amount: number;
  paymentMethod: 'upi' | 'bank' | 'card';
}

export const FarmerWallet: React.FC<{ farmerId: string }> = ({ farmerId }) => {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState<WalletData>({
    balance: 0,
    weeklyChange: 0,
    transactions: [],
    loading: true,
  });

  const [withdrawalModal, setWithdrawalModal] = useState<WithdrawalModalState>({
    isOpen: false,
    amount: 0,
    accountNumber: '',
    ifscCode: '',
  });

  const [topUpModal, setTopUpModal] = useState<TopUpModalState>({
    isOpen: false,
    amount: 0,
    paymentMethod: 'upi',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!farmerId) return;

    // Fetch transactions
    const unsubscribe = firebaseService.onFarmerTransactionsChanged(farmerId, (transactions) => {
      const balance = transactions.reduce((sum, tx) => {
        if (tx.status === TransactionStatus.Completed) {
          if (tx.type === TransactionType.Payment || tx.type === TransactionType.Subsidy) {
            return sum + tx.amount;
          } else if (tx.type === TransactionType.Withdrawal) {
            return sum - tx.amount;
          }
        }
        return sum;
      }, 0);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyTransactions = transactions.filter((tx) => tx.timestamp > weekAgo && tx.status === TransactionStatus.Completed);
      const weeklyChange = weeklyTransactions.reduce((sum, tx) => {
        if (tx.type === TransactionType.Payment || tx.type === TransactionType.Subsidy) {
          return sum + tx.amount;
        } else if (tx.type === TransactionType.Withdrawal) {
          return sum - tx.amount;
        }
        return sum;
      }, 0);

      setWallet({
        balance,
        weeklyChange,
        transactions: transactions.slice(0, 6), // Recent transactions
        loading: false,
      });
    });

    return () => unsubscribe();
  }, [farmerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleWithdrawal = async () => {
    if (!withdrawalModal.amount || withdrawalModal.amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (!withdrawalModal.accountNumber || !withdrawalModal.ifscCode) {
      showToast('Please enter account details', 'error');
      return;
    }

    if (withdrawalModal.amount > wallet.balance) {
      showToast('Insufficient balance', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Create withdrawal transaction
      const txId = await firebaseService.createTransaction({
        farmerId,
        type: 'Withdrawal',
        status: 'Pending',
        amount: withdrawalModal.amount,
        description: `Withdrawal to account ending in ${withdrawalModal.accountNumber.slice(-4)}`,
        metadata: {
          accountNumber: withdrawalModal.accountNumber,
          ifscCode: withdrawalModal.ifscCode,
        },
      });

      showToast('Withdrawal request submitted! It will be processed in 1-2 business days.', 'success');
      setWithdrawalModal({ isOpen: false, amount: 0, accountNumber: '', ifscCode: '' });
    } catch (error) {
      console.error('Withdrawal failed:', error);
      showToast('Failed to process withdrawal. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpModal.amount || topUpModal.amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // In a real scenario, this would redirect to a payment gateway
      // For now, we'll create a pending transaction
      const txId = await firebaseService.createTransaction({
        farmerId,
        type: 'TopUp',
        status: 'Pending',
        amount: topUpModal.amount,
        description: `Top-up via ${topUpModal.paymentMethod.toUpperCase()}`,
        metadata: {
          paymentMethod: topUpModal.paymentMethod,
        },
      });

      showToast(
        'Redirecting to payment gateway...\nThis is a demo. In production, you would complete payment.',
        'info'
      );
      
      // Simulate successful payment after 2 seconds (demo)
      setTimeout(async () => {
        await firebaseService.updateTransaction(txId, {
          status: 'Completed',
        });
        showToast('Top-up completed successfully!', 'success');
        setTopUpModal({ isOpen: false, amount: 0, paymentMethod: 'upi' });
      }, 2000);
    } catch (error) {
      console.error('Top-up failed:', error);
      showToast('Failed to process top-up. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.Payment:
        return 'verified';
      case TransactionType.Withdrawal:
        return 'hourglass_top';
      case TransactionType.TopUp:
        return 'add_circle';
      case TransactionType.Subsidy:
        return 'agriculture';
      default:
        return 'help';
    }
  };

  const getTransactionColor = (type: TransactionType, status: TransactionStatus) => {
    if (status === TransactionStatus.Failed) return 'red';
    if (status === TransactionStatus.Pending) return 'orange';
    if (type === TransactionType.Payment || type === TransactionType.Subsidy) return 'green';
    return 'blue';
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const statusConfig = {
      [TransactionStatus.Completed]: {
        text: 'Completed',
        icon: 'check_circle',
        colors: 'bg-green-50/80 border-green-200 text-green-700',
        glow: 'shadow-glow-green',
      },
      [TransactionStatus.Pending]: {
        text: 'Pending',
        icon: 'pending',
        colors: 'bg-orange-50/80 border-orange-200 text-orange-600',
        glow: 'shadow-glow-orange',
      },
      [TransactionStatus.Failed]: {
        text: 'Failed',
        icon: 'cancel',
        colors: 'bg-red-50/80 border-red-200 text-red-600',
        glow: 'shadow-glow-red',
      },
    };
    return statusConfig[status];
  };

  if (wallet.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">
          <span className="material-symbols-outlined text-4xl text-primary">loading</span>
        </div>
      </div>
    );
  }

  const changePercentage = wallet.balance > 0 ? ((wallet.weeklyChange / wallet.balance) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 relative overflow-x-hidden py-8">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200 blur-[120px] mix-blend-multiply filter animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-200 blur-[120px] mix-blend-multiply filter animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-200 blur-[100px] mix-blend-multiply filter animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8 space-y-8">
          {/* Balance Section */}
          <section className="glass-panel rounded-[2.5rem] p-0 relative overflow-hidden ethereal-bg shadow-lg border border-white/60">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="p-8 md:p-12 relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-10">
              {/* Left side - Balance info */}
              <div className="flex flex-col gap-8 w-full xl:w-1/2">
                <div className="flex flex-col gap-2">
                  <p className="text-slate-500 font-semibold text-sm md:text-base uppercase tracking-widest flex items-center gap-2">
                    <span className="size-2 rounded-full bg-green-500 animate-pulse"></span>
                    Current Balance
                  </p>
                  <div className="flex items-baseline gap-1 group cursor-default select-none">
                    <span className="text-6xl md:text-8xl font-black text-slate-800 tracking-tighter drop-shadow-sm transition-all group-hover:tracking-normal">
                      ₹
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
                        {Math.floor(wallet.balance).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="text-2xl md:text-4xl font-bold text-slate-500">
                      .{String(Math.floor((wallet.balance % 1) * 100)).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 font-bold bg-green-100/60 px-4 py-1.5 rounded-full w-fit backdrop-blur-md border border-green-200 shadow-sm">
                    <span className="material-symbols-outlined text-lg">trending_up</span>
                    <span>+ {changePercentage}% this week</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={() => setWithdrawalModal({ ...withdrawalModal, isOpen: true })}
                    className="group flex-1 relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-b from-blue-300 to-blue-500 active:scale-95 transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing}
                  >
                    <div className="relative flex items-center justify-center gap-3 px-6 py-4 bg-white/95 group-hover:bg-white rounded-2xl transition-colors h-full">
                      <div className="bg-blue-50 rounded-xl p-2.5 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-glow">
                        <span className="material-symbols-outlined text-2xl">upload</span>
                      </div>
                      <span className="text-lg font-bold text-slate-800 group-hover:text-blue-700">Withdraw</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setTopUpModal({ ...topUpModal, isOpen: true })}
                    className="group flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing}
                  >
                    <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors"></div>
                    <div className="relative flex items-center justify-center gap-3 px-6 py-4 h-full">
                      <div className="bg-white/20 rounded-xl p-2.5 flex items-center justify-center backdrop-blur-md shadow-inner">
                        <span className="material-symbols-outlined text-2xl">download</span>
                      </div>
                      <span className="text-lg font-bold">Top Up</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Right side - Income Trend Graph */}
              <div className="w-full xl:w-1/2 glass-widget rounded-[2rem] p-6 flex flex-col justify-between min-h-[280px] border-l border-white/50 relative group/graph">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">show_chart</span>
                    Income Trend
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-xs font-semibold bg-white/50 px-3 py-1 rounded-full text-slate-500 cursor-pointer hover:bg-white transition-colors border border-white/30">
                      30 Days
                    </span>
                    <span className="text-xs font-semibold bg-white px-3 py-1 rounded-full text-primary shadow-sm border border-primary/10">
                      This Quarter
                    </span>
                  </div>
                </div>

                {/* Graph Visualization */}
                <div className="relative w-full h-[180px] graph-container">
                  <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400 font-medium z-0 pointer-events-none">
                    <div className="w-full border-b border-dashed border-slate-300/50 pb-1">₹25k</div>
                    <div className="w-full border-b border-dashed border-slate-300/50 pb-1">₹15k</div>
                    <div className="w-full border-b border-dashed border-slate-300/50 pb-1">₹5k</div>
                    <div className="w-full border-b border-slate-300/50 pb-1">₹0</div>
                  </div>
                  <svg className="absolute inset-0 w-full h-full overflow-visible z-10" preserveAspectRatio="none" viewBox="0 0 100 50">
                    <defs>
                      <linearGradient id="gradient-line" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"></stop>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0"></stop>
                      </linearGradient>
                      <filter height="140%" id="glow-line" width="140%" x="-20%" y="-20%">
                        <feGaussianBlur result="blur" stdDeviation="1"></feGaussianBlur>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"></feComposite>
                      </filter>
                    </defs>
                    <path
                      className="opacity-60 transition-opacity duration-300 group-hover/graph:opacity-80"
                      d="M0,45 Q10,35 20,40 T40,20 T60,25 T80,10 T100,5 V50 H0 Z"
                      fill="url(#gradient-line)"
                    ></path>
                    <path
                      className="graph-path drop-shadow-md"
                      d="M0,45 Q10,35 20,40 T40,20 T60,25 T80,10 T100,5"
                      fill="none"
                      filter="url(#glow-line)"
                      stroke="#10b981"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    ></path>
                  </svg>
                </div>

                <div className="flex justify-between mt-2 px-2 text-[10px] text-slate-400 font-medium">
                  <span>Oct 1</span>
                  <span>Oct 8</span>
                  <span>Oct 15</span>
                  <span>Oct 22</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </section>

          {/* Transactions Section */}
          <section className="flex flex-col gap-6 pb-8">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1.5 bg-gradient-to-b from-primary to-blue-300 rounded-full shadow-glow"></div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Recent Transactions</h2>
              </div>
              <button className="hidden md:flex items-center gap-2 text-primary font-bold hover:text-white transition-all bg-white/60 hover:bg-primary px-5 py-2.5 rounded-full border border-white/60 shadow-sm hover:shadow-glow group">
                <span>View All</span>
                <span className="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>

            {/* Transaction Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wallet.transactions.map((transaction) => {
                const isIncoming = transaction.type === TransactionType.Payment || transaction.type === TransactionType.Subsidy;
                const statusConfig = getStatusBadge(transaction.status);
                const color = getTransactionColor(transaction.type, transaction.status);

                return (
                  <article
                    key={transaction.id}
                    className={`glass-card rounded-[2rem] p-6 flex flex-col justify-between h-full min-h-[240px] relative group overflow-hidden border-t-4 border-t-${
                      color === 'green' ? 'green' : color === 'orange' ? 'orange' : color === 'red' ? 'red' : 'blue'
                    }-400`}
                  >
                    {/* Background Icon */}
                    <div className="absolute top-6 right-6 z-0">
                      <span
                        className={`material-symbols-outlined text-8xl group-hover:text-${color}-500/20 transition-colors transform group-hover:scale-110 duration-500 text-${color}-500/10`}
                      >
                        {getTransactionIcon(transaction.type)}
                      </span>
                    </div>

                    {/* Vertical Line */}
                    <div className="absolute left-6 top-16 bottom-20 w-[2px] bg-gradient-to-b from-slate-200 to-transparent z-0">
                      <div
                        className={`w-full h-1/2 bg-gradient-to-b from-${
                          color === 'green' ? 'green' : color === 'orange' ? 'orange' : color === 'red' ? 'red' : 'blue'
                        }-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse`}
                      ></div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-2 z-10 pl-6">
                      <span className="text-slate-400 font-medium text-sm flex items-center gap-2">
                        <span className={`size-2 bg-${color}-400 rounded-full ${transaction.status === TransactionStatus.Pending ? 'animate-pulse' : ''}`}></span>
                        {new Date(transaction.timestamp).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <h3 className="text-slate-800 font-bold text-xl leading-tight mt-1">{transaction.description}</h3>
                    </div>

                    {/* Amount and Status */}
                    <div className="mt-8 flex items-end justify-between z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {isIncoming ? 'Received Amount' : 'Amount'}
                        </span>
                        <span className={`text-3xl font-black drop-shadow-sm group-hover:text-${color}-500 transition-colors ${isIncoming ? `text-${color}-600` : `text-${color}-500`}`}>
                          {isIncoming ? '+' : '-'}₹ {transaction.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 shadow-sm group-hover:${statusConfig.glow} transition-shadow text-xs font-bold ${statusConfig.colors}`}>
                        <span className="material-symbols-outlined text-base">{statusConfig.icon}</span>
                        {statusConfig.text}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {wallet.transactions.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-slate-300 mx-auto block">inbox</span>
                <p className="text-slate-400 mt-4 font-medium">No transactions yet</p>
              </div>
            )}

            <button className="md:hidden flex w-full items-center justify-center gap-2 text-primary font-bold bg-white/70 backdrop-blur-md px-6 py-4 rounded-full shadow-lg border border-white/50 mt-4 active:scale-95 transition-transform">
              <span>View All Transactions</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </section>
        </main>
      </div>

      {/* Withdrawal Modal */}
      {withdrawalModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Withdraw Funds</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={withdrawalModal.amount || ''}
                  onChange={(e) => setWithdrawalModal({ ...withdrawalModal, amount: Number(e.target.value) })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  disabled={isProcessing}
                />
                <p className="text-xs text-slate-500 mt-1">Available: {formatCurrency(wallet.balance)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Account Number</label>
                <input
                  type="text"
                  value={withdrawalModal.accountNumber}
                  onChange={(e) => setWithdrawalModal({ ...withdrawalModal, accountNumber: e.target.value })}
                  placeholder="Enter account number"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">IFSC Code</label>
                <input
                  type="text"
                  value={withdrawalModal.ifscCode}
                  onChange={(e) => setWithdrawalModal({ ...withdrawalModal, ifscCode: e.target.value })}
                  placeholder="Enter IFSC code"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setWithdrawalModal({ isOpen: false, amount: 0, accountNumber: '', ifscCode: '' })}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawal}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing && <span className="material-symbols-outlined text-lg animate-spin">loading</span>}
                {isProcessing ? 'Processing' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {topUpModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Add Funds</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={topUpModal.amount || ''}
                  onChange={(e) => setTopUpModal({ ...topUpModal, amount: Number(e.target.value) })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-3">Payment Method</label>
                <div className="space-y-2">
                  {(['upi', 'bank', 'card'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="radio"
                        name="payment"
                        checked={topUpModal.paymentMethod === method}
                        onChange={() => setTopUpModal({ ...topUpModal, paymentMethod: method })}
                        disabled={isProcessing}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-slate-700 capitalize">{method === 'upi' ? 'UPI' : method === 'bank' ? 'Bank Transfer' : 'Credit/Debit Card'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setTopUpModal({ isOpen: false, amount: 0, paymentMethod: 'upi' })}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleTopUp}
                className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing && <span className="material-symbols-outlined text-lg animate-spin">loading</span>}
                {isProcessing ? 'Processing' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

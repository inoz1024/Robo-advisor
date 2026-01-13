
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  History, 
  LayoutDashboard,
  Trash2,
  Sparkles,
  ArrowRightLeft,
  Settings,
  X,
  CreditCard,
  ChevronLeft,
  Calendar as CalendarIcon,
  Search
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { Transaction, TransactionType, Account } from './types';
import { INCOME_CATEGORIES, EXPENSE_STRUCTURE } from './constants';
import { getFinancialAdvice } from './services/geminiService';

type ViewMode = 'main' | 'account-trend';
type TimeRange = 'week' | 'month' | 'halfYear' | 'year';

const App: React.FC = () => {
  // --- States ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'input' | 'records' | 'accounts'>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [trendAccountId, setTrendAccountId] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<TimeRange>('week');

  const [formType, setFormType] = useState<TransactionType>('expense');
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form States
  const [amount, setAmount] = useState<string>('');
  const [mainCat, setMainCat] = useState<string>('');
  const [subCat, setSubCat] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Record Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showFilter, setShowFilter] = useState(false);

  // Account Creation States
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const savedT = localStorage.getItem('finance_transactions');
    const savedA = localStorage.getItem('finance_accounts');
    if (savedT) setTransactions(JSON.parse(savedT));
    if (savedA) {
      const parsedA = JSON.parse(savedA);
      setAccounts(parsedA);
      if (parsedA.length > 0) setSelectedAccountId(parsedA[0].id);
    } else {
      setCurrentTab('accounts');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    localStorage.setItem('finance_accounts', JSON.stringify(accounts));
  }, [transactions, accounts]);

  // --- Calculations ---
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(acc => {
      let balance = Number(acc.initialBalance);
      transactions.filter(t => t.accountId === acc.id).forEach(t => {
        if (t.type === 'income') balance += t.amount;
        else balance -= t.amount;
      });
      balances[acc.id] = balance;
    });
    return balances;
  }, [accounts, transactions]);

  const netAssets = Object.values(accountBalances).reduce((sum: number, b: number) => sum + b, 0);

  // Filtered Transactions for "Real-time Records"
  const filteredTransactions = useMemo(() => {
    if (!showFilter) {
      // Default: Only show today's
      const today = new Date().toISOString().split('T')[0];
      return transactions.filter(t => t.date === today).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }
    return transactions.filter(t => t.date >= filterStartDate && t.date <= filterEndDate)
                       .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, filterStartDate, filterEndDate, showFilter]);

  // Chart Data for Total Dashboard
  const mainChartData = useMemo(() => {
    const monthlyData: Record<string, { income: number; expense: number; totalAssets: number }> = {};
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let runningTotal = accounts.reduce((sum: number, a: Account) => sum + Number(a.initialBalance), 0);

    sorted.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0, totalAssets: 0 };
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
        runningTotal += t.amount;
      } else {
        monthlyData[month].expense += t.amount;
        runningTotal -= t.amount;
      }
      monthlyData[month].totalAssets = runningTotal;
    });
    return Object.entries(monthlyData).map(([name, val]) => ({ name, ...val }));
  }, [transactions, accounts]);

  // Trend Data for Specific Account
  const accountTrendData = useMemo(() => {
    if (!trendAccountId) return [];
    const acc = accounts.find(a => a.id === trendAccountId);
    if (!acc) return [];

    const now = new Date();
    let startDate = new Date();
    if (trendRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (trendRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (trendRange === 'halfYear') startDate.setMonth(now.getMonth() - 6);
    else if (trendRange === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const data: Record<string, number> = {};
    const filteredT = transactions.filter(t => t.accountId === trendAccountId).sort((a, b) => a.date.localeCompare(b.date));
    
    // Initial balance before the window
    let runningBalance = Number(acc.initialBalance);
    filteredT.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate < startDate) {
        if (t.type === 'income') runningBalance += t.amount;
        else runningBalance -= t.amount;
      }
    });

    // We want a point for every day in the range to make the line smooth
    const dayPointer = new Date(startDate);
    while (dayPointer <= now) {
      const dateStr = dayPointer.toISOString().split('T')[0];
      const dayT = filteredT.filter(t => t.date === dateStr);
      dayT.forEach(t => {
        if (t.type === 'income') runningBalance += t.amount;
        else runningBalance -= t.amount;
      });
      data[dateStr] = runningBalance;
      dayPointer.setDate(dayPointer.getDate() + 1);
    }

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [trendAccountId, trendRange, transactions, accounts]);

  // --- Handlers ---
  const handleAddAccount = () => {
    if (!newAccName || !newAccBalance) return;
    const newAcc: Account = {
      id: crypto.randomUUID(),
      name: newAccName,
      initialBalance: Number(newAccBalance),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
    setAccounts([...accounts, newAcc]);
    setNewAccName('');
    setNewAccBalance('');
    setIsAddingAccount(false);
    if (!selectedAccountId) setSelectedAccountId(newAcc.id);
  };

  const handleAddTransaction = () => {
    if (!amount || !mainCat || !selectedAccountId) {
      alert('請填寫完整資訊並選擇帳戶唷！');
      return;
    }
    const newT: Transaction = {
      id: crypto.randomUUID(),
      date,
      type: formType,
      mainCategory: mainCat,
      subCategory: subCat,
      amount: Number(amount),
      note,
      accountId: selectedAccountId
    };
    setTransactions([newT, ...transactions]);
    setAmount('');
    setNote('');
    // Reset date to today for next entry
    setDate(new Date().toISOString().split('T')[0]);
    alert('記下來囉！✨');
  };

  const requestAiAdvice = async () => {
    if (accounts.length === 0) return;
    setIsAiLoading(true);
    const month = new Date().toISOString().substring(0, 7);
    const advice = await getFinancialAdvice(transactions, accounts, month);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const enterTrendView = (id: string) => {
    setTrendAccountId(id);
    setViewMode('account-trend');
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24 text-slate-800">
      {/* Header */}
      <header className="bg-white px-6 pt-8 pb-4 border-b border-orange-50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          {viewMode === 'main' ? (
            <div>
              <h1 className="text-sm font-bold text-orange-400 flex items-center gap-1 mb-1">
                <Sparkles size={14} /> MY WEALTH
              </h1>
              <p className="text-3xl font-black text-slate-900 tracking-tight">
                ${netAssets.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={() => setViewMode('main')} className="p-2 bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h1 className="text-sm font-bold text-orange-400 uppercase">財務趨勢</h1>
                <p className="text-xl font-black text-slate-900">
                  {accounts.find(a => a.id === trendAccountId)?.name}
                </p>
              </div>
            </div>
          )}
          <button 
            onClick={() => setCurrentTab('accounts')}
            className="p-3 bg-orange-50 text-orange-500 rounded-2xl hover:bg-orange-100 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* View Mode: Main Dashboard */}
        {viewMode === 'main' && currentTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Account Slider */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
              {accounts.map(acc => (
                <div 
                  key={acc.id} 
                  onClick={() => enterTrendView(acc.id)}
                  className="min-w-[200px] bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
                  style={{ borderLeft: `6px solid ${acc.color}` }}
                >
                  <p className="text-xs font-bold text-slate-400 mb-2 uppercase">{acc.name}</p>
                  <h3 className="text-xl font-bold">${(accountBalances[acc.id] || 0).toLocaleString()}</h3>
                  <div className="mt-2 text-[10px] font-bold text-orange-400 flex items-center gap-1">
                    點擊看趨勢 <ArrowRightLeft size={10} />
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="w-full bg-orange-50 p-6 rounded-3xl border border-dashed border-orange-200 text-center">
                  <p className="text-orange-400 text-sm font-bold">還沒有虛擬帳戶唷，快去建立一個吧！</p>
                </div>
              )}
            </div>

            {/* AI Insight Section */}
            <div className="bg-[#FFF9F5] p-6 rounded-[2.5rem] border border-orange-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="flex items-center gap-2 text-orange-600 font-bold">
                    <Sparkles className="w-5 h-5" /> 小管家愛分析
                  </h3>
                  <button 
                    onClick={requestAiAdvice}
                    disabled={isAiLoading}
                    className="text-xs font-bold text-orange-500 hover:text-orange-600 underline underline-offset-4"
                  >
                    {isAiLoading ? '算帳中...' : '重新整理建議'}
                  </button>
                </div>
                <div className="space-y-3">
                  {aiAdvice ? (
                    aiAdvice.split('\n').filter(line => line.trim()).map((line, i) => (
                      <div key={i} className="bg-white/60 p-3 rounded-2xl text-sm font-medium text-slate-700 shadow-sm animate-in slide-in-from-left-4 duration-300" style={{ transitionDelay: `${i * 100}ms` }}>
                        {line}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm italic py-4">「本月好像存了不少錢唷！點擊上方按鈕讓我幫你誇獎一下吧 ✨」</p>
                  )}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-8">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 px-2">
                <ArrowRightLeft className="text-blue-400" size={18} /> 資產與收支趨勢
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mainChartData}>
                    <defs>
                      <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FB923C" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#FB923C" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="totalAssets" stroke="#FB923C" strokeWidth={4} fill="url(#assetGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* View Mode: Account Trend */}
        {viewMode === 'account-trend' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-slate-800">餘額變動曲線</h3>
                <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
                  {(['week', 'month', 'halfYear', 'year'] as TimeRange[]).map(r => (
                    <button 
                      key={r}
                      onClick={() => setTrendRange(r)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${trendRange === r ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}
                    >
                      {r === 'week' ? '近一週' : r === 'month' ? '近一月' : r === 'halfYear' ? '近半年' : '近一年'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accountTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8'}} />
                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={accounts.find(a => a.id === trendAccountId)?.color || '#FB923C'} 
                      strokeWidth={4} 
                      dot={false}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-3xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">目前帳戶餘額</p>
                  <p className="text-xl font-black text-slate-900">${(accountBalances[trendAccountId!] || 0).toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-3xl">
                  <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">交易總筆數</p>
                  <p className="text-xl font-black text-orange-600">{transactions.filter(t => t.accountId === trendAccountId).length} 筆</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Tab */}
        {currentTab === 'input' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="flex bg-slate-50 p-2 m-4 rounded-3xl">
              <button 
                onClick={() => setFormType('expense')}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${formType === 'expense' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}
              >
                支出 💸
              </button>
              <button 
                onClick={() => setFormType('income')}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${formType === 'income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}
              >
                收入 💰
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-center">
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-6xl font-black text-center border-none focus:ring-0 text-slate-900 placeholder-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1">
                    <CreditCard size={10} /> 記帳帳戶
                  </label>
                  <select 
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold focus:ring-2 focus:ring-orange-200"
                  >
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1">
                    <Sparkles size={10} /> 主分類
                  </label>
                  <select 
                    value={mainCat}
                    onChange={(e) => { setMainCat(e.target.value); setSubCat(''); }}
                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold focus:ring-2 focus:ring-orange-200"
                  >
                    <option value="">選擇分類</option>
                    {formType === 'income' ? 
                      INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>) :
                      Object.keys(EXPENSE_STRUCTURE).map(c => <option key={c} value={c}>{c}</option>)
                    }
                  </select>
                </div>
              </div>

              {formType === 'expense' && EXPENSE_STRUCTURE[mainCat]?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">子項目</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPENSE_STRUCTURE[mainCat].map(s => (
                      <button 
                        key={s}
                        onClick={() => setSubCat(s)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${subCat === s ? 'bg-orange-400 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-1">
                    <CalendarIcon size={10} /> 交易日期
                  </label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">備註 (可選)</label>
                  <input 
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              </div>

              <button 
                onClick={handleAddTransaction}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                儲存交易
              </button>
            </div>
          </div>
        )}

        {/* Records Tab (Formerly History) */}
        {currentTab === 'records' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black text-slate-900">即時紀錄</h3>
              <button 
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${showFilter ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}
              >
                <Search size={14} /> 按日期檢視
              </button>
            </div>

            {showFilter && (
              <div className="bg-white p-6 rounded-[2.5rem] border border-orange-50 shadow-sm animate-in slide-in-from-top-4 duration-300">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">選擇日期範圍 (最多橫跨3個月)</p>
                <div className="flex items-center gap-4">
                  <input 
                    type="date" 
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="flex-1 bg-slate-50 border-none rounded-2xl p-3 text-sm font-bold"
                  />
                  <span className="text-slate-300 font-bold">至</span>
                  <input 
                    type="date" 
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="flex-1 bg-slate-50 border-none rounded-2xl p-3 text-sm font-bold"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              {!showFilter && <p className="text-[10px] font-bold text-slate-400 uppercase px-4">今日狀況</p>}
              {filteredTransactions.map(t => (
                <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex justify-between items-center group hover:scale-[1.01] transition-transform">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${t.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {t.type === 'income' ? '↑' : '↓'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.mainCategory} {t.subCategory && `· ${t.subCategory}`}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {t.date} · {accounts.find(a => a.id === t.accountId)?.name}
                      </p>
                      {t.note && <p className="text-[10px] text-slate-400 mt-1 italic">{t.note}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                    </p>
                    <button onClick={() => setTransactions(transactions.filter(x => x.id !== t.id))} className="text-[10px] font-bold text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">刪除</button>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-100">
                  <p className="text-slate-300 font-bold">目前沒有符合範圍的紀錄唷 🍃</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {currentTab === 'accounts' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black text-slate-900">虛擬帳戶管理</h3>
              <button 
                onClick={() => setIsAddingAccount(true)}
                className="bg-orange-500 text-white p-2 rounded-full shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              {accounts.map(acc => (
                <div key={acc.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-12 rounded-full" style={{ backgroundColor: acc.color }}></div>
                    <div>
                      <h4 className="font-black text-lg text-slate-900">{acc.name}</h4>
                      <p className="text-xs font-bold text-slate-400">目前餘額：${(accountBalances[acc.id] || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => enterTrendView(acc.id)}
                      className="p-3 text-orange-400 bg-orange-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ArrowRightLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setAccounts(accounts.filter(a => a.id !== acc.id))}
                      className="opacity-0 group-hover:opacity-100 p-3 text-rose-300 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {accounts.length === 0 && !isAddingAccount && (
              <div className="text-center py-20 space-y-4">
                <CreditCard size={48} className="mx-auto text-slate-200" />
                <p className="text-slate-400 font-bold">先建立一個虛擬帳戶開始管理吧！</p>
                <button onClick={() => setIsAddingAccount(true)} className="px-6 py-3 bg-orange-500 text-white rounded-full font-bold shadow-lg">建立第一個帳戶</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Adding Account */}
      {isAddingAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">新增虛擬帳戶</h3>
              <button onClick={() => setIsAddingAccount(false)} className="text-slate-400"><X /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">帳戶名稱</label>
                <input 
                  type="text" 
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="例如：薪資帳戶"
                  className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">初始金額</label>
                <input 
                  type="number" 
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border-none rounded-3xl p-5 text-slate-700 font-bold"
                />
              </div>
              <button 
                onClick={handleAddAccount}
                className="w-full py-5 bg-orange-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-100"
              >
                建立帳戶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-2 flex justify-between items-center shadow-2xl border border-white/10">
          <button 
            onClick={() => { setCurrentTab('dashboard'); setViewMode('main'); }}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${currentTab === 'dashboard' ? 'text-orange-400' : 'text-slate-500'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">總覽</span>
          </button>

          <button 
            onClick={() => setCurrentTab('input')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${currentTab === 'input' ? 'text-orange-400' : 'text-slate-500'}`}
          >
            <Plus size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">記帳</span>
          </button>

          <button 
            onClick={() => setCurrentTab('records')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${currentTab === 'records' ? 'text-orange-400' : 'text-slate-500'}`}
          >
            <History size={20} />
            <span className="text-[8px] font-black uppercase tracking-widest">即時紀錄</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;

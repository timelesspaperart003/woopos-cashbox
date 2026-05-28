
import React, { useState, useEffect, useRef } from 'react';
import { WCSettings, CashDrawerTransaction, Employee } from '../types';
import { db, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../src/firebase';

// 錢箱 Flask API 位址
const CASHBOX_API_URL = 'https://cashbox-api.artimelesss.com';

interface CashDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WCSettings;
  onRecordTransaction: (txData: Omit<CashDrawerTransaction, 'id' | 'timestamp' | 'uid' | 'balanceAfter'>) => Promise<void>;
  employees: Employee[];
  currentEmployee: Employee | null;
  isOwner: boolean;
}

const CashDrawerModal: React.FC<CashDrawerModalProps> = ({ 
  isOpen, onClose, settings, onRecordTransaction, employees, currentEmployee, isOwner 
}) => {
  const [transactions, setTransactions] = useState<CashDrawerTransaction[]>([]);
  const [type, setType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [affectsBalance, setAffectsBalance] = useState<boolean>(true);
  const [operatorId, setOperatorId] = useState<string>(currentEmployee?.id || 'owner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 同時開箱相關
  const [openDrawer, setOpenDrawer] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const pendingTx = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isOpen || !settings.uid) return;

    const q = query(
      collection(db, 'cash_transactions'),
      where('uid', '==', settings.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as CashDrawerTransaction[];
      setTransactions(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cash_transactions'));

    return () => unsubscribe();
  }, [isOpen, settings.uid]);

  // Sync operatorId when currentEmployee changes
  useEffect(() => {
    if (currentEmployee) {
      setOperatorId(currentEmployee.id);
    } else {
      setOperatorId('owner');
    }
  }, [currentEmployee]);

  // 密碼框開啟時 auto focus
  useEffect(() => {
    if (showPin) setTimeout(() => pinInputRef.current?.focus(), 100);
  }, [showPin]);

  // 開箱 API
  const openCashbox = async (operatorName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${CASHBOX_API_URL}/api/open-cashbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pin, transaction_id: `drawer-${Date.now()}` })
      });
      const data = await res.json();
      if (res.ok && data.success) return true;
      setPinError(data.error || data.message || '密碼錯誤，請重試');
      setPin('');
      pinInputRef.current?.focus();
      return false;
    } catch {
      setPinError('無法連線到錢箱主機，請確認網路');
      setPin('');
      return false;
    }
  };

  // 密碼框確認
  const handlePinSubmit = async () => {
    if (!pin.trim()) { setPinError('請輸入密碼'); return; }
    if (!pendingTx.current) return;
    setIsPinLoading(true);
    setPinError('');
    const ok = await openCashbox(operatorName);
    if (ok) {
      setShowPin(false);
      setPin('');
      await pendingTx.current();
      pendingTx.current = null;
    }
    setIsPinLoading(false);
  };

  const handlePinCancel = () => {
    setShowPin(false);
    setPin('');
    setPinError('');
    pendingTx.current = null;
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const currentBalance = settings.cashDrawerBalance || 0;
  const operatorName = operatorId === 'owner' ? '系統管理員' : (employees.find(e => e.id === operatorId)?.name || '未知');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;

    // 記帳的實際執行邏輯（密碼驗證後呼叫，或直接呼叫）
    const doRecord = async () => {
      setIsSubmitting(true);
      try {
        await onRecordTransaction({
          type: type,
          amount: parseFloat(amount),
          note: note,
          operatorId: operatorId,
          operatorName: operatorName,
          affectsBalance: affectsBalance
        });
        setAmount('');
        setNote('');
        setOpenDrawer(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (openDrawer) {
      // 需要開箱 → 先跳密碼框，驗證成功後再記帳
      pendingTx.current = doRecord;
      setPin('');
      setPinError('');
      setShowPin(true);
    } else {
      await doRecord();
    }
  };

  const getTransactionLabel = (txType: string) => {
    switch (txType) {
      case 'in': return '入金(+)';
      case 'out': return '出金(-)';
      case 'sale': return '商品銷售';
      case 'correction': return '餘額校正';
      case 'reset': return '錢箱歸零';
      default: return txType;
    }
  };

  const getTransactionColor = (txType: string) => {
    switch (txType) {
      case 'in':
      case 'sale': return 'text-green-600';
      case 'out': return 'text-red-600';
      case 'reset': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] sm:h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#009265] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h2 className="text-lg font-bold">錢箱管理 (Cash Drawer)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left Panel: Form */}
          <div className="w-full sm:w-[320px] lg:w-[350px] border-b sm:border-b-0 sm:border-r border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto bg-white z-10 shrink-0 max-h-[50%] sm:max-h-full">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#009265] to-[#00704e] border border-[#009265] rounded-2xl p-5 text-center shadow-lg text-white">
              <p className="text-[10px] font-black text-[#ffffff]/70 uppercase tracking-widest mb-1">目前錢箱餘額</p>
              <div className="text-3xl sm:text-4xl font-black mb-1 flex items-center justify-center gap-1">
                <span className="text-xl sm:text-2xl text-[#ffffff]/60">$</span>
                {Math.round(currentBalance).toLocaleString()}
              </div>
              <p className="text-[9px] text-[#ffffff]/80 font-bold bg-[#ffffff]/10 py-1 px-2 rounded-full inline-block">操作員: {operatorName}</p>
            </div>

            {/* New Record Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2">新增紀錄</h3>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setType('in')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  入金 (+)
                </button>
                <button
                  onClick={() => setType('out')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  出金 (-)
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">金額</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#009265]/20 focus:border-[#009265] outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="affectsBalance"
                  checked={affectsBalance}
                  onChange={(e) => setAffectsBalance(e.target.checked)}
                  className="w-4 h-4 rounded text-[#009265] focus:ring-[#009265]"
                />
                <label htmlFor="affectsBalance" className="text-xs font-bold text-gray-700">計入餘額</label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">執行操作員</label>
                <select
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#009265]/20 focus:border-[#009265] outline-none transition-all text-sm"
                >
                  <option value="owner">系統管理員</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">原因/備註</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例: 開店備用金、支付運費..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#009265]/20 focus:border-[#009265] outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* 同時開箱 checkbox */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-green-50 border border-green-100 rounded-xl hover:bg-green-100 transition-colors">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={openDrawer}
                    onChange={e => setOpenDrawer(e.target.checked)}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${openDrawer ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${openDrawer ? 'translate-x-5' : ''}`}></div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">同時開啟錢箱</p>
                  <p className="text-[10px] text-gray-400">需輸入開箱密碼</p>
                </div>
              </label>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !amount}
                className="w-full py-3 bg-[#009265] text-white font-bold rounded-xl hover:bg-[#007a55] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                確認{type === 'in' ? '入金' : '出金'}
              </button>

              <div className="pt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                   const val = window.prompt("請輸入正確的目前餘額:");
                   if (val && !isNaN(parseFloat(val))) {
                     setIsSubmitting(true);
                     await onRecordTransaction({
                       type: 'correction',
                       amount: parseFloat(val),
                       note: '餘額手動校正',
                       operatorId: operatorId,
                       operatorName: operatorName,
                       affectsBalance: true
                     });
                     setIsSubmitting(false);
                   }
                  }}
                  className="py-2 px-2 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[10px] font-bold rounded-lg transition-colors border border-gray-100"
                >
                  餘額校正
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("確定要把錢箱歸零嗎？此動作將紀錄一筆重設交易。")) {
                      setIsSubmitting(true);
                      await onRecordTransaction({
                        type: 'reset',
                        amount: 0,
                        note: '營業額結清歸零',
                        operatorId: operatorId,
                        operatorName: operatorName,
                        affectsBalance: true
                      });
                      setIsSubmitting(false);
                    }
                  }}
                  className="py-2 px-2 bg-orange-50 text-orange-600 hover:bg-orange-100 text-[10px] font-bold rounded-lg transition-colors border border-orange-100"
                >
                  錢箱歸零
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Transactions */}
          <div className="flex-1 bg-[#f8f9fa] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h3 className="font-bold text-gray-700">交易紀錄</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase ring-1 ring-gray-200 px-2 py-0.5 rounded-full">最近 50 筆</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="font-bold">目前尚無紀錄</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        tx.type === 'in' || tx.type === 'sale' ? 'bg-green-50 text-green-600' : 
                        tx.type === 'out' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {tx.type === 'in' || tx.type === 'sale' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${getTransactionColor(tx.type)}`}>
                            {tx.type === 'out' ? '-' : '+'}${Math.round(tx.amount).toLocaleString()}
                          </span>
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold">
                            {getTransactionLabel(tx.type)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-900 font-medium mt-0.5">{tx.note || '無備註'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(tx.timestamp).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400 font-bold">{tx.operatorName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">餘額</p>
                      <p className="text-sm font-mono font-black text-gray-900">${Math.round(tx.balanceAfter).toLocaleString()}</p>
                      {!tx.affectsBalance && (
                        <span className="text-[9px] text-orange-400 font-bold italic leading-none">不計入餘額</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <p className="text-[10px] text-gray-400 text-center !mt-8 italic pb-4">
                * 點擊右側核取方塊可隨時切換該筆紀錄是否影響錢箱餘額。 (此功能需管理員權限)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* 錢箱密碼 Overlay */}
      {showPin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-green-600 px-6 py-4 flex items-center gap-3 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <h3 className="text-lg font-bold">錢箱驗證</h3>
                <p className="text-green-100 text-xs">請輸入開箱密碼以{type === 'in' ? '入金' : '出金'}並開箱</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-xs text-green-700 font-medium">{type === 'in' ? '入金' : '出金'}金額</p>
                <p className="text-3xl font-black text-green-700">${parseFloat(amount || '0').toLocaleString()}</p>
                {note && <p className="text-xs text-green-600 mt-1 italic">{note}</p>}
              </div>
              <div>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={e => { setPin(e.target.value); setPinError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handlePinSubmit(); if (e.key === 'Escape') handlePinCancel(); }}
                  placeholder="輸入密碼後按 Enter"
                  className={`w-full px-4 py-3 text-center text-xl font-bold tracking-widest border-2 rounded-xl outline-none transition-colors ${pinError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-green-500'}`}
                  disabled={isPinLoading}
                  autoComplete="off"
                />
                {pinError && (
                  <p className="mt-2 text-sm text-red-600 text-center flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {pinError}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={handlePinCancel} disabled={isPinLoading} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50">
                  取消
                </button>
                <button onClick={handlePinSubmit} disabled={isPinLoading || !pin.trim()} className="flex-[2] py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPinLoading
                    ? <><svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>開箱中...</>
                    : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>確認開箱</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashDrawerModal;

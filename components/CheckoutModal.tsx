import React, { useState, useEffect, useRef } from 'react';
import { CartItem, OrderSummary, Customer, OrderStatus, PaymentMethod, Employee } from '../types';
import { printOrder } from '../src/lib/printUtils';

// 錢箱 Flask API 位址
const CASHBOX_API_URL = 'https://cashbox-api.artimelesss.com';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  summary: OrderSummary | null;
  onConfirm: (status: OrderStatus, paymentMethod: PaymentMethod, employee: Employee) => Promise<void>;
  employees: Employee[];
  currentEmployee: Employee | null;
  storeName?: string;
}

// 付款方式設定
const PAYMENT_OPTIONS = [
  {
    value: 'cash_drawer' as PaymentMethod,
    label: '現金(錢箱)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    needsPin: true,
    hasChange: true,
    activeClass: 'border-green-600 bg-green-50 text-green-700',
  },
  {
    value: 'cash_yangpei' as PaymentMethod,
    label: '現金(楊培錢箱)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    needsPin: false,
    hasChange: true,
    activeClass: 'border-amber-600 bg-amber-50 text-amber-700',
  },
  {
    value: 'transfer' as PaymentMethod,
    label: '銀行轉帳',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    needsPin: false,
    hasChange: false,
    activeClass: 'border-blue-600 bg-blue-50 text-blue-700',
  },
];

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen, onClose, items, customer, summary, onConfirm, employees, currentEmployee, storeName
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('completed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_drawer');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(currentEmployee);
  const [printThumbnails, setPrintThumbnails] = useState(false);

  // 找零相關
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isDeposit, setIsDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // 錢箱密碼 overlay
  const [showCashboxPin, setShowCashboxPin] = useState(false);
  const [cashboxPin, setCashboxPin] = useState('');
  const [cashboxError, setCashboxError] = useState('');
  const [isCashboxLoading, setIsCashboxLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const pendingCheckout = useRef<{ status: OrderStatus; employee: Employee } | null>(null);

  // 完成畫面
  const [showComplete, setShowComplete] = useState(false);
  const [completeInfo, setCompleteInfo] = useState<{
    orderTotal: number;
    received: number;
    change: number;
    paymentLabel: string;
    employeeName: string;
    isDeposit: boolean;
    depositAmount: number;
  } | null>(null);

  // Modal 開啟時重設
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setSelectedEmployee(currentEmployee);
      setReceivedAmount('');
      setIsDeposit(false);
      setDepositAmount('');
      setShowComplete(false);
      setCompleteInfo(null);
    }
  }, [isOpen, currentEmployee]);

  // 密碼框 auto focus
  useEffect(() => {
    if (showCashboxPin) setTimeout(() => pinInputRef.current?.focus(), 100);
  }, [showCashboxPin]);

  // 完成畫面需要在 isOpen 變 false 後繼續顯示，直到使用者手動關閉
  if (!isOpen && !showComplete) return null;
  if (!summary) return null;

  const currentPayment = PAYMENT_OPTIONS.find(p => p.value === paymentMethod)!;

  const getEffectiveReceived = (): number => {
    if (isDeposit) return Number(depositAmount) || 0;
    if (!currentPayment.hasChange) return Math.round(summary.total);
    return Number(receivedAmount) || 0;
  };

  const getChange = (): number => {
    if (!currentPayment.hasChange || isDeposit) return 0;
    const received = Number(receivedAmount) || 0;
    const total = Math.round(summary.total);
    return received > total ? received - total : 0;
  };

  const isReceivedValid = (): boolean => {
    if (!currentPayment.hasChange) return true;
    if (isDeposit) return (Number(depositAmount) || 0) > 0;
    return (Number(receivedAmount) || 0) >= Math.round(summary.total);
  };

  const handleConfirm = () => {
    if (!selectedEmployee) { window.alert('請選擇銷售人員'); return; }
    if (currentPayment.hasChange && !isDeposit && !receivedAmount) { window.alert('請輸入實收金額'); return; }
    if (isDeposit && !depositAmount) { window.alert('請輸入訂金金額'); return; }
    if (!isReceivedValid()) { window.alert('實收金額不足，請重新輸入'); return; }

    if (currentPayment.needsPin) {
      pendingCheckout.current = { status: selectedStatus, employee: selectedEmployee };
      setCashboxPin('');
      setCashboxError('');
      setShowCashboxPin(true);
    } else {
      submitOrder(selectedStatus, selectedEmployee);
    }
  };

  const handleCashboxSubmit = async () => {
    if (!cashboxPin.trim()) { setCashboxError('請輸入密碼'); return; }
    if (!pendingCheckout.current) return;
    setIsCashboxLoading(true);
    setCashboxError('');
    try {
      const response = await fetch(`${CASHBOX_API_URL}/api/open-cashbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: cashboxPin,
          operator_name: pendingCheckout.current.employee.name,
          transaction_id: `pos-${Date.now()}`
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setShowCashboxPin(false);
        setCashboxPin('');
        const { status, employee } = pendingCheckout.current;
        pendingCheckout.current = null;
        submitOrder(status, employee);
      } else {
        setCashboxError(data.message || data.error || '密碼錯誤，請重試');
        setCashboxPin('');
        pinInputRef.current?.focus();
      }
    } catch {
      setCashboxError('無法連線到錢箱主機，請確認網路或聯絡管理員');
      setCashboxPin('');
    } finally {
      setIsCashboxLoading(false);
    }
  };

  const handleCashboxCancel = () => {
    setShowCashboxPin(false);
    setCashboxPin('');
    setCashboxError('');
    pendingCheckout.current = null;
    setIsProcessing(false);
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCashboxSubmit();
    if (e.key === 'Escape') handleCashboxCancel();
  };

  const logPosTransaction = async (orderId: string, employee: Employee, status: OrderStatus) => {
    try {
      await fetch(`${CASHBOX_API_URL}/api/log-pos-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          operator_name: employee.name,
          payment_method: paymentMethod,
          order_total: Math.round(summary.total),
          received: getEffectiveReceived(),
          change: getChange(),
          is_deposit: isDeposit,
          note: summary.orderNote || '',
          order_status: status,
        })
      });
    } catch (e) {
      console.warn('記錄 POS 交易失敗（不影響結帳）:', e);
    }
  };

  const submitOrder = (status: OrderStatus, employee: Employee) => {
    setIsProcessing(true);
    const orderTotal = Math.round(summary.total);
    const received = getEffectiveReceived();
    const change = getChange();
    const paymentLabel = currentPayment.label;
    const tempOrderId = `pos-${Date.now()}`;

    onConfirm(status, paymentMethod, employee)
      .then(() => {
        logPosTransaction(tempOrderId, employee, status);
        setCompleteInfo({ orderTotal, received, change, paymentLabel, employeeName: employee.name, isDeposit, depositAmount: Number(depositAmount) || 0 });
        setShowComplete(true);
        setIsProcessing(false);
      })
      .catch((error: any) => {
        setIsProcessing(false);
        let message = '結帳失敗，請稍後再試。';
        if (error.message) {
          try {
            const errData = JSON.parse(error.message);
            if (errData.error) message = `結帳失敗: ${errData.error}`;
          } catch { message = `結帳失敗: ${error.message}`; }
        }
        window.alert(message);
      });
  };

  const handleCopyOrderInfo = () => {
    let text = '';
    if (customer) text += `【客戶資訊】\n姓名: ${customer.last_name}${customer.first_name}\n電話: ${customer.phone}\n地址: ${customer.address}\n\n`;
    text += `【訂單明細】\n`;
    items.forEach(item => {
      text += item.id < 0 ? `- ${item.name}` : `- ${item.name} x ${item.quantity}`;
      if (item.note) text += ` (商品備註: ${item.note})`;
      text += '\n';
    });
    if (summary.orderNote) text += `\n【訂單總備註】\n${summary.orderNote}\n`;
    navigator.clipboard.writeText(text).then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); });
  };

  // ── 完成畫面 ──
  if (showComplete && completeInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          <div className="bg-green-500 px-6 py-6 text-white text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black">結帳完成</h2>
            <p className="text-green-100 text-sm mt-1">{completeInfo.employeeName} · {completeInfo.paymentLabel}</p>
          </div>
          <div className="p-6 space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>訂單金額</span>
                <span className="font-semibold text-gray-800">${completeInfo.orderTotal.toLocaleString()}</span>
              </div>
              {completeInfo.isDeposit ? (
                <>
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>本次收訂金</span>
                    <span className="font-bold">${completeInfo.depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-2">
                    <span className="text-gray-500">尾款待收</span>
                    <span className="font-semibold text-red-500">${(completeInfo.orderTotal - completeInfo.depositAmount).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  {completeInfo.received > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>實收金額</span>
                      <span className="font-semibold text-gray-800">${completeInfo.received.toLocaleString()}</span>
                    </div>
                  )}
                  {completeInfo.change > 0 && (
                    <div className="flex justify-between border-t border-dashed border-gray-200 pt-2">
                      <span className="text-base font-bold text-gray-700">找零</span>
                      <span className="text-2xl font-black text-green-600">${completeInfo.change.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={onClose} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all">關閉</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 主結帳 Modal ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              結帳確認
            </h2>
            <button
              onClick={() => printOrder({ date: new Date().toISOString(), items, customer, summary, employeeName: selectedEmployee?.name, paymentMethod }, storeName, { includeThumbnails: printThumbnails })}
              className="p-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-xs flex items-center gap-1 transition-all border border-indigo-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              列印
            </button>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-1 hover:bg-indigo-500 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
            <div className="text-center border-b border-gray-100 pb-4 mb-4 relative">
              <h3 className="text-gray-900 font-bold text-lg">{storeName || 'Pos store'}</h3>
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
                <p className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block">服務店員: {selectedEmployee?.name || '未指定'}</p>
              </div>
              <button onClick={handleCopyOrderInfo} className="absolute right-0 top-0 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs flex items-center gap-1 transition-colors">
                {copySuccess
                  ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">已複製</span></>
                  : <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg><span>複製</span></>
                }
              </button>
            </div>

            {customer ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  <span className="font-bold text-indigo-900">{customer.last_name}{customer.first_name}</span>
                </div>
                <div className="ml-6 space-y-0.5 text-indigo-800"><p>{customer.phone}</p><p className="text-xs opacity-80">{customer.address}</p></div>
              </div>
            ) : (
              <div className="mb-4 text-center text-sm text-gray-400 italic">- 未指定客戶 -</div>
            )}

            <div className="space-y-3 mb-4">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                  <div className="flex-1 pr-4">
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500">${Math.round(parseFloat(item.price))} x {item.quantity}{item.note && <span className="block text-gray-400 italic mt-0.5">註: {item.note}</span>}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-800">${Math.round(parseFloat(item.price) * item.quantity)}</div>
                    {(item.discount || 0) > 0 && <div className="text-xs text-red-500">-${Math.round(item.discount || 0)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {summary.orderNote && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  訂單總備註:
                </div>
                <p className="whitespace-pre-wrap pl-5 text-xs italic">{summary.orderNote}</p>
              </div>
            )}

            <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600"><span>小計</span><span>${Math.round(summary.subtotal)}</span></div>
              {summary.itemDiscountTotal > 0 && <div className="flex justify-between text-sm text-red-500"><span>商品折扣</span><span>-${Math.round(summary.itemDiscountTotal)}</span></div>}
              {summary.orderDiscount > 0 && <div className="flex justify-between text-sm text-red-500"><span>整單折扣</span><span>-${Math.round(summary.orderDiscount)}</span></div>}
              <div className="flex justify-between text-xl font-bold text-indigo-700 pt-2 border-t border-gray-200 mt-2"><span>總計</span><span>${Math.round(summary.total)}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 p-4 space-y-4">

          {/* 付款方式 */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-gray-700 block px-2">付款方式:</span>
            <div className="grid grid-cols-3 gap-2 px-2">
              {PAYMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPaymentMethod(opt.value); setReceivedAmount(''); setIsDeposit(false); setDepositAmount(''); }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === opt.value ? opt.activeClass : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 訂金 toggle */}
          <div className="px-2">
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isDeposit} onChange={e => { setIsDeposit(e.target.checked); setReceivedAmount(''); setDepositAmount(''); }} />
                <div className={`w-10 h-5 rounded-full transition-colors ${isDeposit ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isDeposit ? 'translate-x-5' : ''}`}></div>
              </div>
              <span className="text-sm font-bold text-gray-700">訂金模式</span>
              {isDeposit && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">部分收款</span>}
            </label>
          </div>

          {/* 金額輸入區 */}
          {isDeposit ? (
            <div className="px-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">本次收訂金金額</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold">$</span>
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="輸入訂金金額" className="flex-1 px-3 py-2 border-2 border-amber-200 focus:border-amber-400 rounded-xl text-center text-lg font-bold outline-none" min="0" />
              </div>
              {depositAmount && <p className="text-xs text-gray-500 mt-1 text-center">尾款待收：<span className="text-red-500 font-bold">${(Math.round(summary.total) - (Number(depositAmount) || 0)).toLocaleString()}</span></p>}
            </div>
          ) : currentPayment.hasChange ? (
            <div className="px-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">實收金額</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold">$</span>
                <input type="number" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder={`輸入客人付的金額（至少 $${Math.round(summary.total)}）`} className="flex-1 px-3 py-2 border-2 border-gray-200 focus:border-indigo-400 rounded-xl text-center text-lg font-bold outline-none" min={Math.round(summary.total)} />
              </div>
              {receivedAmount && Number(receivedAmount) >= Math.round(summary.total) && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-xl p-2 text-center">
                  <span className="text-xs text-green-600">找零</span>
                  <span className="text-2xl font-black text-green-600 ml-2">${getChange().toLocaleString()}</span>
                </div>
              )}
              {receivedAmount && Number(receivedAmount) < Math.round(summary.total) && <p className="text-xs text-red-500 mt-1 text-center">實收金額不足</p>}
            </div>
          ) : null}

          {/* 銷售人員 */}
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <span className="text-sm font-bold text-gray-700 block px-2 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              確認銷售人員:
            </span>
            <div className="flex flex-wrap gap-2 px-2 max-h-24 overflow-y-auto pb-1">
              {employees.map(emp => (
                <button key={emp.id} onClick={() => setSelectedEmployee(emp)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${selectedEmployee?.id === emp.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedEmployee?.id === emp.id ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                  {emp.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">列印商品縮圖:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={printThumbnails} onChange={e => setPrintThumbnails(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">訂單狀態:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setSelectedStatus('completed')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedStatus === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>完成</button>
                <button onClick={() => setSelectedStatus('processing')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedStatus === 'processing' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>處理中</button>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button onClick={onClose} disabled={isProcessing} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50">取消</button>
            <button onClick={handleConfirm} disabled={isProcessing} className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex justify-center items-center">
              {isProcessing
                ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>處理中...</>
                : '確認收款 / 建立訂單'}
            </button>
          </div>
        </div>
      </div>

      {/* 錢箱密碼 Overlay */}
      {showCashboxPin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-green-600 px-6 py-4 flex items-center gap-3 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <div><h3 className="text-lg font-bold">錢箱驗證</h3><p className="text-green-100 text-xs">請輸入開箱密碼</p></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-xs text-green-700 font-medium">{isDeposit ? '收訂金金額' : '收款金額'}</p>
                <p className="text-3xl font-black text-green-700">${isDeposit ? (Number(depositAmount) || 0).toLocaleString() : Math.round(summary.total).toLocaleString()}</p>
                {!isDeposit && getChange() > 0 && <p className="text-sm text-green-600 mt-1">找零 ${getChange().toLocaleString()}</p>}
              </div>
              <div>
                <input ref={pinInputRef} type="password" value={cashboxPin} onChange={e => { setCashboxPin(e.target.value); setCashboxError(''); }} onKeyDown={handlePinKeyDown} placeholder="輸入密碼後按 Enter" className={`w-full px-4 py-3 text-center text-xl font-bold tracking-widest border-2 rounded-xl outline-none transition-colors ${cashboxError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-green-500'}`} disabled={isCashboxLoading} autoComplete="off" />
                {cashboxError && <p className="mt-2 text-sm text-red-600 text-center flex items-center justify-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{cashboxError}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={handleCashboxCancel} disabled={isCashboxLoading} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50">取消</button>
                <button onClick={handleCashboxSubmit} disabled={isCashboxLoading || !cashboxPin.trim()} className="flex-[2] py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCashboxLoading
                    ? <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>開箱中...</>
                    : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>確認開箱</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutModal;

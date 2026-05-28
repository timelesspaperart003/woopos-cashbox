
import React, { useState, useEffect } from 'react';
import { CartItem, OrderSummary, Customer, OrderStatus, PaymentMethod, Employee } from '../types';
import { printOrder } from '../src/lib/printUtils';

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

const CheckoutModal: React.FC<CheckoutModalProps> = ({ 
  isOpen, onClose, items, customer, summary, onConfirm, employees, currentEmployee, storeName 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('completed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_drawer');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(currentEmployee);
  const [printThumbnails, setPrintThumbnails] = useState(false);

  // Reset processing state and sync employee whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setSelectedEmployee(currentEmployee);
    }
  }, [isOpen, currentEmployee]);

  if (!isOpen || !summary) return null;

  const handleConfirm = () => {
    if (!selectedEmployee) {
      window.alert("請選擇銷售人員");
      return;
    }

    setIsProcessing(true);
    // Call onConfirm without awaiting if we want instant UI closure.
    // App.tsx handleConfirmOrder already snapshots data and closes the modal.
    onConfirm(selectedStatus, paymentMethod, selectedEmployee).catch((error: any) => {
      console.error(error);
      setIsProcessing(false);
      
      let message = "結帳失敗，請稍後再試。";
      if (error.message) {
        try {
          const errData = JSON.parse(error.message);
          if (errData.error) message = `結帳失敗: ${errData.error}`;
        } catch (e) {
          message = `結帳失敗: ${error.message}`;
        }
      }
      window.alert(message);
    });
  };

  const handleCopyOrderInfo = () => {
    let text = "";
    
    // Customer Info
    if (customer) {
        text += `【客戶資訊】\n`;
        text += `姓名: ${customer.last_name}${customer.first_name}\n`;
        text += `電話: ${customer.phone}\n`;
        text += `地址: ${customer.address}\n\n`;
    }

    // Items
    text += `【訂單明細】\n`;
    items.forEach(item => {
        const isCustom = item.id < 0;
        if (isCustom) {
            text += `- ${item.name}`;
        } else {
            text += `- ${item.name} x ${item.quantity}`;
        }

        if (item.note) {
            text += ` (商品備註: ${item.note})`;
        }
        text += `\n`;
    });

    // Order Note
    if (summary.orderNote) {
        text += `\n【訂單總備註】\n${summary.orderNote}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

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
              onClick={() => printOrder(
                { date: new Date().toISOString(), items, customer, summary, employeeName: selectedEmployee?.name, paymentMethod },
                storeName,
                { includeThumbnails: printThumbnails }
              )}
              className="p-1.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-xs flex items-center gap-1 transition-all border border-indigo-400"
              title="列印收據"
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
                <h3 className="text-gray-900 font-bold text-lg">{storeName || "Pos store"}</h3>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
                  <p className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                    服務店員: {selectedEmployee?.name || '未指定'}
                  </p>
                </div>
                
                {/* Copy Button */}
                <button 
                    onClick={handleCopyOrderInfo}
                    className="absolute right-0 top-0 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    title="複製訂單明細（不含金額）"
                >
                    {copySuccess ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-green-600">已複製</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>複製</span>
                        </>
                    )}
                </button>
             </div>

             {/* Customer Info Section */}
             {customer ? (
                 <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-sm">
                     <div className="flex items-center gap-2 mb-1">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                         </svg>
                         <span className="font-bold text-indigo-900">{customer.last_name}{customer.first_name}</span>
                     </div>
                     <div className="ml-6 space-y-0.5 text-indigo-800">
                         <p>{customer.phone}</p>
                         <p className="text-xs opacity-80">{customer.address}</p>
                     </div>
                 </div>
             ) : (
                 <div className="mb-4 text-center text-sm text-gray-400 italic">
                     - 未指定客戶 -
                 </div>
             )}

             <div className="space-y-3 mb-4">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                    <div className="flex-1 pr-4">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        ${Math.round(parseFloat(item.price))} x {item.quantity}
                        {item.note && <span className="block text-gray-400 italic mt-0.5">註: {item.note}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-800">
                        ${Math.round(parseFloat(item.price) * item.quantity)}
                      </div>
                      {(item.discount || 0) > 0 && (
                        <div className="text-xs text-red-500">-${Math.round(item.discount || 0)}</div>
                      )}
                    </div>
                  </div>
                ))}
             </div>

             {summary.orderNote && (
               <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    訂單總備註:
                  </div>
                  <p className="whitespace-pre-wrap pl-5 text-xs italic">{summary.orderNote}</p>
               </div>
             )}

             <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>小計</span>
                  <span>${Math.round(summary.subtotal)}</span>
                </div>
                {summary.itemDiscountTotal > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>商品折扣</span>
                    <span>-${Math.round(summary.itemDiscountTotal)}</span>
                  </div>
                )}
                {summary.orderDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>整單折扣</span>
                    <span>-${Math.round(summary.orderDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-indigo-700 pt-2 border-t border-gray-200 mt-2">
                  <span>總計</span>
                  <span>${Math.round(summary.total)}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Status Selection and Footer */}
        <div className="bg-white border-t border-gray-100 p-4 space-y-4">
          
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-gray-700 block px-2">付款方式:</span>
            <div className="grid grid-cols-3 gap-2 px-2">
              <button
                onClick={() => setPaymentMethod('cash_drawer')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash_drawer' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                現金(錢箱)
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                一般現金
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'transfer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                銀行轉帳
              </button>
            </div>
          </div>

          {/* Salesperson Selection */}
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <span className="text-sm font-bold text-gray-700 block px-2 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              確認銷售人員:
            </span>
            <div className="flex flex-wrap gap-2 px-2 max-h-32 overflow-y-auto pb-1 custom-scrollbar">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${selectedEmployee?.id === emp.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
                >
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
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={printThumbnails}
                  onChange={(e) => setPrintThumbnails(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">訂單狀態:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                 <button
                   onClick={() => setSelectedStatus('completed')}
                   className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedStatus === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   完成
                 </button>
                 <button
                   onClick={() => setSelectedStatus('processing')}
                   className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedStatus === 'processing' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   處理中
                 </button>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex justify-center items-center"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  處理中...
                </>
              ) : (
                '確認收款 / 建立訂單'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;

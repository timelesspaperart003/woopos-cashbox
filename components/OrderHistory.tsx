
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { printOrder } from '../src/lib/printUtils';

interface OrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  storeName?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: '已完成', color: 'text-green-700', bg: 'bg-green-100' },
  processing: { label: '處理中', color: 'text-blue-700', bg: 'bg-blue-100' },
  pending: { label: '等待付款', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  'on-hold': { label: '保留', color: 'text-orange-700', bg: 'bg-orange-100' },
  cancelled: { label: '已取消', color: 'text-gray-700', bg: 'bg-gray-100' },
  refunded: { label: '已退款', color: 'text-purple-700', bg: 'bg-purple-100' },
  failed: { label: '失敗', color: 'text-red-700', bg: 'bg-red-100' },
};

const OrderHistory: React.FC<OrderHistoryProps> = ({ 
  isOpen, onClose, orders, onUpdateStatus, onDeleteOrder, storeName 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 bg-gray-900 text-white flex justify-between items-center shadow-md">
            <h2 className="text-xl font-bold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              歷史訂單
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
            {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>暫無訂單紀錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusInfo = statusConfig[order.status] || statusConfig.completed;
                  const isTemp = order.id.toString().startsWith('local-');

                  return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div 
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                             <span className="font-bold text-gray-800">
                               #{isTemp ? 'SYNC...' : String(order.id).slice(0, 8).toUpperCase()}
                             </span>
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                               {statusInfo.label}
                             </span>
                             <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                               </svg>
                               {order.employeeName || '系統管理員'}
                             </span>
                          </div>
                          
                          {order.sessionId && (
                            <div className="mt-1 flex items-center">
                              <span className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-400 border border-gray-200 rounded font-mono uppercase tracking-tighter">
                                Session ID: {order.sessionId.slice(-6)}
                              </span>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>{new Date(order.date).toLocaleString()}</span>
                            {order.paymentMethod && (
                                <span className="flex items-center text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    {order.paymentMethod === 'cash_drawer' ? '現金(錢箱)' : order.paymentMethod === 'cash' ? '一般現金' : '銀行轉帳'}
                                </span>
                            )}
                            {isTemp && (
                              <span className="flex items-center text-blue-500 font-medium">
                                <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                傳輸中...
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-indigo-600">${Math.round(order.summary.total)}</div>
                          <div className="text-xs text-gray-400">{order.items.length} 件商品</div>
                        </div>
                      </div>

                      {expandedId === order.id && (
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-sm space-y-3 animate-fade-in">
                          
                          {/* Status Editor */}
                          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                             <label className="text-xs font-bold text-gray-500">更改狀態:</label>
                             <select 
                                value={order.status}
                                onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                                className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer font-medium text-gray-700"
                                onClick={(e) => e.stopPropagation()}
                                disabled={isTemp}
                             >
                               <option value="pending">等待付款</option>
                               <option value="processing">處理中</option>
                               <option value="on-hold">保留</option>
                               <option value="completed">完成</option>
                               <option value="cancelled">取消</option>
                               <option value="refunded">退款</option>
                               <option value="failed">失敗</option>
                             </select>
                          </div>

                          {/* Customer Info if exists */}
                          {order.customer && (
                             <div className="text-gray-600 text-xs">
                               <p><span className="font-bold">客戶:</span> {order.customer.last_name}{order.customer.first_name}</p>
                               <p><span className="font-bold">電話:</span> {order.customer.phone}</p>
                             </div>
                          )}

                          {order.summary.orderNote && (
                            <div className="text-xs bg-amber-50 p-2 rounded text-amber-800 italic">
                               備註: {order.summary.orderNote}
                            </div>
                          )}

                          {/* Items List */}
                          <div className="space-y-1 pt-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-gray-700">
                                <span>{item.quantity}x {item.name}</span>
                                <span>${Math.round((item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price)) * item.quantity)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800">
                             <span>總計</span>
                             <span>${Math.round(order.summary.total)}</span>
                          </div>

                          {/* Copy and Sync Controls */}
                          <div className="flex gap-2 pt-1">
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 let text = `【訂單 #${order.id.toString().startsWith('local') ? '同步中' : order.id}】\n` +
                                   `時間: ${new Date(order.date).toLocaleString()}\n` +
                                   (order.customer ? `客戶: ${order.customer.last_name}${order.customer.first_name}\n` : '') +
                                   `明細:\n`;
                                 
                                 order.items.forEach(it => {
                                   const isCustom = it.id < 0;
                                   if (isCustom) {
                                     text += `- ${it.name}\n`;
                                   } else {
                                     text += `- ${it.name} x ${it.quantity}\n`;
                                   }
                                 });

                                 if (order.summary.orderNote) {
                                   text += `\n備註: ${order.summary.orderNote}\n`;
                                 }

                                 text += `\n總計: $${Math.round(order.summary.total)}`;
                                 navigator.clipboard.writeText(text);
                                 // Add a quick visual feedback
                                 const btn = e.currentTarget;
                                 const original = btn.innerText;
                                 btn.innerText = '已複製！';
                                 btn.classList.add('bg-green-100', 'text-green-700');
                                 setTimeout(() => {
                                   btn.innerText = original;
                                   btn.classList.remove('bg-green-100', 'text-green-700');
                                 }, 2000);
                               }}
                               className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                               </svg>
                               複製明細
                             </button>

                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 printOrder(order, storeName);
                               }}
                               className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                               title="列印收據"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                               </svg>
                               列印
                             </button>
                             
                             {order.status === 'failed' && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   // In a real app we'd trigger a retry event
                                   // For now we just reset status to pending to simulate retry attempt if the parent supports it
                                   onUpdateStatus(order.id, 'pending');
                                 }}
                                 className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                               >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                 </svg>
                                 重試同步
                               </button>
                             )}

                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 onDeleteOrder(order.id);
                               }}
                               className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                               title="刪除紀錄"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                               刪除紀錄
                             </button>
                          </div>
                          
                          {isTemp && (
                            <div className="text-xs text-blue-500 bg-blue-50 p-2 rounded text-center">
                              正在將訂單同步至 WooCommerce...
                            </div>
                          )}
                          {order.status === 'failed' && (
                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded text-center font-bold">
                              同步失敗: {order.syncError || '請檢查網路連線或 API 設定。'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderHistory;


import React from 'react';
import { HeldOrder } from '../types';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onRestore: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
}

const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({ isOpen, onClose, heldOrders, onRestore, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-orange-500 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            暫存訂單列表
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-orange-600 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
          {heldOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p>沒有暫存的訂單</p>
            </div>
          ) : (
            heldOrders.sort((a, b) => b.timestamp - a.timestamp).map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(order.timestamp).toLocaleString()}
                    </div>
                    <div className="font-bold text-gray-800 text-lg mt-1">
                      {order.customer ? `${order.customer.last_name}${order.customer.first_name}` : '散客 (Walk-in)'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600 text-lg">${Math.round(order.total)}</div>
                    <div className="text-xs text-gray-400">{order.items.length} 件商品</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3 line-clamp-1">
                  {order.items.map(i => i.name).join(', ')}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onRestore(order)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
                  >
                    取單 (Restore)
                  </button>
                  <button 
                    onClick={() => onDelete(order.id)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-bold transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="bg-white border-t border-gray-100 p-4">
           <button onClick={onClose} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg">
             關閉
           </button>
        </div>
      </div>
    </div>
  );
};

export default HeldOrdersModal;

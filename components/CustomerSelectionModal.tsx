
import React, { useState } from 'react';
import { Customer } from '../types';
import { parseCustomerDetails } from '../services/geminiService';

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  orderNote: string;
  onSetOrderNote: (note: string) => void;
  enableCustomerSync?: boolean;
}

const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({ 
  isOpen, onClose, customers, onSelect, orderNote, onSetOrderNote, enableCustomerSync = true 
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'ai'>(enableCustomerSync ? 'search' : 'ai');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [tempCustomer, setTempCustomer] = useState<Partial<Customer> & { note?: string }>({});

  // Reset tab when modal opens or sync setting changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(enableCustomerSync ? 'search' : 'ai');
    }
  }, [isOpen, enableCustomerSync]);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiProcessing(true);
    try {
      const parsed = await parseCustomerDetails(aiInput);
      setTempCustomer(parsed);
    } catch (error) {
      console.error("AI Parse failed", error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleTempConfirm = () => {
    // Create a new temporary customer object
    const newCustomer: Customer = {
      id: -Date.now(), // Temporary negative ID
      first_name: tempCustomer.first_name || '',
      last_name: tempCustomer.last_name || '',
      email: tempCustomer.email || '',
      phone: tempCustomer.phone || '',
      address: tempCustomer.address || '',
      avatar_url: `https://ui-avatars.com/api/?name=${tempCustomer.first_name}+${tempCustomer.last_name}&background=random`
    };
    onSelect(newCustomer);
    if (tempCustomer.note) {
      onSetOrderNote(tempCustomer.note);
    }
    onClose();
    // Reset states
    setAiInput('');
    setTempCustomer({});
    setActiveTab('search');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold">選擇客戶</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {enableCustomerSync && (
          <div className="flex border-b border-gray-200">
            <button 
              className={`flex-1 py-3 font-medium text-sm transition-colors ${activeTab === 'search' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('search')}
            >
              WooCommerce 名單
            </button>
            <button 
              className={`flex-1 py-3 font-bold text-sm transition-colors flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setActiveTab('ai')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI 輸入客戶
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜尋姓名或電話..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <div 
                    key={customer.id}
                    onClick={() => {
                      onSelect(customer);
                      onClose();
                    }}
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-3 cursor-pointer hover:border-indigo-400 transition-colors"
                  >
                    <img src={customer.avatar_url} alt="" className="w-10 h-10 rounded-full bg-gray-200" />
                    <div>
                      <div className="font-bold text-gray-800">{customer.last_name}{customer.first_name}</div>
                      <div className="text-xs text-gray-500">{customer.phone}</div>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <p className="text-center text-gray-400 py-4">找不到相關客戶</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  快速輸入 (範例: 王大明 0912345678 台北市信義路)
                </label>
                <div className="flex space-x-2">
                  <textarea 
                    className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-16"
                    placeholder="請在此輸入客戶資料..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                  <button
                    onClick={handleAiParse}
                    disabled={isAiProcessing || !aiInput.trim()}
                    className="px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center min-w-[80px]"
                  >
                    {isAiProcessing ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>解析</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Parsed Result Form */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">姓氏</label>
                      <input 
                        type="text" 
                        value={tempCustomer.last_name || ''} 
                        onChange={e => setTempCustomer({...tempCustomer, last_name: e.target.value})}
                        className="w-full p-2 border rounded bg-gray-50" 
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">名字</label>
                      <input 
                        type="text" 
                        value={tempCustomer.first_name || ''} 
                        onChange={e => setTempCustomer({...tempCustomer, first_name: e.target.value})}
                        className="w-full p-2 border rounded bg-gray-50" 
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">電話</label>
                    <input 
                      type="text" 
                      value={tempCustomer.phone || ''} 
                      onChange={e => setTempCustomer({...tempCustomer, phone: e.target.value})}
                      className="w-full p-2 border rounded bg-gray-50" 
                    />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <input 
                      type="text" 
                      value={tempCustomer.email || ''} 
                      onChange={e => setTempCustomer({...tempCustomer, email: e.target.value})}
                      className="w-full p-2 border rounded bg-gray-50" 
                    />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500">地址</label>
                    <input 
                      type="text" 
                      value={tempCustomer.address || ''} 
                      onChange={e => setTempCustomer({...tempCustomer, address: e.target.value})}
                      className="w-full p-2 border rounded bg-gray-50" 
                    />
                 </div>

                 <div>
                    <label className="text-xs text-indigo-600 font-bold">訂單總備註</label>
                    <textarea 
                      value={tempCustomer.note || ''} 
                      onChange={e => setTempCustomer({...tempCustomer, note: e.target.value})}
                      className="w-full p-2 border border-indigo-200 rounded-lg bg-indigo-50/30 text-sm h-16 resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="AI 也會嘗試從文字中擷取備註內容..."
                    />
                 </div>

                 <button 
                   onClick={handleTempConfirm}
                   className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 mt-2"
                 >
                   確認使用此資料
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectionModal;

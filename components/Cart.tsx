
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { CartItem, OrderSummary, Customer } from '../types';

interface CartProps {
  items: CartItem[];
  customer: Customer | null;
  orderDiscount: number;
  heldOrdersCount: number;
  onSelectCustomer: () => void;
  onUpdateQuantity: (cartKey: string, delta: number) => void;
  onUpdateItem: (cartKey: string, updates: Partial<CartItem>) => void;
  onRemove: (cartKey: string) => void;
  onClear: () => void;
  onSetOrderDiscount: (amount: number) => void;
  onSetOrderNote: (note: string) => void;
  onCheckout: (summary: OrderSummary) => void;
  onHoldOrder: () => void;
  onOpenHeldOrders: () => void;
  onAddCustomItem: (name: string, price: number) => void;
  orderNote: string;
  enableCustomerSync?: boolean;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface CartItemRowProps {
  item: CartItem;
  index: number;
  isSplitMode: boolean;
  splitQty: number;
  isSelected: boolean;
  onUpdateQuantity: (cartKey: string, delta: number) => void;
  onUpdateSplitQty: (key: string, max: number, delta: number) => void;
  onRemove: (cartKey: string) => void;
  onEdit: (item: CartItem) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item, index, isSplitMode, splitQty, isSelected, onUpdateQuantity, onUpdateSplitQty, onRemove, onEdit
}) => {
  const price = item.selectedVariation ? parseFloat(item.selectedVariation.price) : parseFloat(item.price);
  const key = `${item.id}-${index}`;
  const x = useMotionValue(0);
  
  // Visual feedback for swipe
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['rgb(236, 252, 239)', 'rgb(255, 255, 255)', 'rgb(254, 242, 242)'] // Left: Green (Add), Center: White, Right: Red (Delete)
  );

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 120 || (offset > 50 && velocity > 200)) {
      // Swipe Right -> Delete
      onRemove(item.cartKey);
    } else if (offset < -120 || (offset < -50 && velocity < -200)) {
      // Swipe Left -> Add 1
      if (isSplitMode) {
        onUpdateSplitQty(key, item.quantity, 1);
      } else {
        onUpdateQuantity(item.cartKey, 1);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-3">
      {/* Background Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-6 z-0">
        <div className="flex items-center text-red-500 font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          刪除
        </div>
        <div className="flex items-center text-green-600 font-bold">
          數量 +1
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, background }}
        className={`relative z-10 flex flex-col p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}
        onClick={() => !isSplitMode && onEdit(item)}
      >
        <div className="flex items-start space-x-3">
           {isSplitMode && (
             <div className="flex-none self-center">
                <div 
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSplitQty(key, item.quantity, isSelected ? -splitQty : item.quantity);
                  }}
                >
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
             </div>
           )}

           <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden">
              <img 
                src={item.images[0]?.src || 'https://picsum.photos/100'} 
                alt={item.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
           </div>
           
           <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
             <div className="flex justify-between items-start">
               <h4 className="text-sm font-medium text-gray-800 truncate pr-2" title={item.name}>{item.name}</h4>
               <span className="text-sm font-bold text-gray-900">
                 ${Math.round(price * item.quantity)}
               </span>
             </div>
             
             <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500 flex flex-col leading-tight">
                  <span>${Math.round(price)} x {item.quantity}</span>
                  {item.selectedVariation && (
                    <span className="text-indigo-600 font-medium">
                      {item.selectedVariation.attributes.map(a => `${a.name}:${a.option}`).join(', ')}
                    </span>
                  )}
                  {(item.discount || 0) > 0 && (
                    <span className="text-red-500 font-medium">
                      (-${Math.round(item.discount || 0)})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => isSplitMode ? onUpdateSplitQty(key, item.quantity, -1) : onUpdateQuantity(item.cartKey, -1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-white rounded shadow-sm text-gray-600 transition-colors"
                  >
                    -
                  </button>
                  <span className={`w-8 text-center text-xs font-bold select-none ${isSplitMode ? (isSelected ? 'text-indigo-700' : 'text-gray-400') : 'text-gray-800'}`}>
                    {isSplitMode ? splitQty : item.quantity}
                  </span>
                  <button 
                    onClick={() => isSplitMode ? onUpdateSplitQty(key, item.quantity, 1) : onUpdateQuantity(item.cartKey, 1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-white rounded shadow-sm text-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
             </div>
           </div>
        </div>
        
        {item.note && (
          <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 flex items-start">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
             <span className="line-clamp-1 italic">{item.note}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Cart: React.FC<CartProps> = ({ 
  items, 
  customer,
  orderDiscount,
  heldOrdersCount,
  onSelectCustomer,
  onUpdateQuantity, 
  onUpdateItem, 
  onRemove, 
  onClear, 
  onSetOrderDiscount,
  onSetOrderNote,
  onCheckout,
  onHoldOrder,
  onOpenHeldOrders,
  onAddCustomItem,
  orderNote,
  enableCustomerSync,
  isMobile,
  onCloseMobile
}) => {
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});
  
  // Custom Item Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isExpanderOpen, setIsExpanderOpen] = useState(false);

  // Reset split state when items change or mode changes
  const toggleSplitMode = () => {
    const nextMode = !isSplitMode;
    setIsSplitMode(nextMode);
    if (nextMode) {
      const initial: Record<string, number> = {};
      items.forEach((item, idx) => {
        initial[`${item.id}-${idx}`] = 0;
      });
      setSplitQuantities(initial);
    }
  };

  const updateSplitQty = (key: string, max: number, delta: number) => {
    setSplitQuantities(prev => {
      const val = (prev[key] || 0) + delta;
      return {
        ...prev,
        [key]: Math.max(0, Math.min(max, val))
      };
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    let sub = 0;
    let itemDisc = 0;
    let qty = 0;

    items.forEach((item, idx) => {
      const currentQty = isSplitMode 
        ? (splitQuantities[`${item.id}-${idx}`] || 0) 
        : item.quantity;
        
      if (currentQty <= 0) return;

      qty += currentQty;
      const unitPrice = item.selectedVariation 
        ? parseFloat(item.selectedVariation.price) 
        : parseFloat(item.price);
        
      const lineTotal = unitPrice * currentQty;
      sub += lineTotal;
      // Apportion item discount based on quantity split
      const ratio = currentQty / item.quantity;
      itemDisc += (item.discount || 0) * ratio;
    });

    itemDisc = Math.min(itemDisc, sub);
    const finalTotal = Math.max(0, sub - itemDisc - (isSplitMode ? 0 : orderDiscount));

    return {
      subtotal: sub,
      itemDiscountTotal: itemDisc,
      total: finalTotal,
      totalQuantity: qty,
      isSelectionEmpty: isSplitMode && qty === 0
    };
  }, [items, orderDiscount, isSplitMode, splitQuantities]);

  const { subtotal, itemDiscountTotal, total, totalQuantity, isSelectionEmpty } = totals;

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItem(editingItem.cartKey, {
        note: editingItem.note,
        discount: editingItem.discount
      });
      setEditingItem(null);
    }
  };

  const handleCheckoutClick = () => {
    if (isSplitMode) {
      // Map selected items to a temporary cart for checkout
      const selectedItems: CartItem[] = [];
      items.forEach((item, idx) => {
        const qty = splitQuantities[`${item.id}-${idx}`] || 0;
        if (qty > 0) {
          selectedItems.push({
            ...item,
            quantity: qty,
            originalIndex: idx // Track which one to reduce later
          } as any);
        }
      });

      onCheckout({
        subtotal,
        itemDiscountTotal,
        orderDiscount: 0, // Split orders don't usually apply the global discount to each part unless requested
        total,
        orderNote,
        isSplit: true,
        itemsToCheckout: selectedItems
      } as any);
    } else {
      onCheckout({
        subtotal,
        itemDiscountTotal,
        orderDiscount,
        total,
        orderNote
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Cart Header */}
      <div className="flex-none px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <div className="flex items-center space-x-2">
          {isMobile && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-2 mr-1 -ml-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded text-xs font-bold">{totalQuantity} 件</span>
          <h2 className="text-lg font-bold text-gray-800">目前訂單</h2>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Split Checkout Toggle - More Visible */}
          <button 
            onClick={toggleSplitMode}
            disabled={items.length === 0}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 border-2 ${
              isSplitMode 
              ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
              : 'text-gray-500 border-gray-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            title="拆分結帳 (Split Checkout)"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSplitMode ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
             </svg>
             <span className="text-xs font-bold whitespace-nowrap">
               {isSplitMode ? '關閉拆分' : '拆分結帳'}
             </span>
          </button>

          {/* Hold Order Button */}
          <button 
            onClick={onHoldOrder}
            disabled={items.length === 0}
            className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="暫存訂單 (Hold Order)"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
          </button>

          {/* Recall Order Button */}
          <button 
            onClick={onOpenHeldOrders}
            disabled={heldOrdersCount === 0}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative disabled:opacity-30 disabled:hover:bg-transparent"
            title="取單 (Recall Order)"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {heldOrdersCount > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                 {heldOrdersCount}
               </span>
             )}
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1"></div>

          <button 
            onClick={() => {
              onClear();
              onSetOrderDiscount(0);
            }}
            className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
            title="清空購物車"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Customer Selection & Note Section */}
      <div className="flex-none px-4 py-2 bg-gray-50 border-b border-gray-100">
        {customer ? (
          <div className="bg-white border border-indigo-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100">
            <div 
              onClick={onSelectCustomer}
              className="p-2 cursor-pointer hover:bg-indigo-50 transition-colors group"
            >
               <div className="flex items-center">
                 <img src={customer.avatar_url} alt="" className="w-8 h-8 rounded-full bg-gray-200 mr-2 shadow-inner" />
                 <div className="flex-1 min-w-0">
                   <div className="font-bold text-gray-800 text-xs truncate">{customer.last_name}{customer.first_name}</div>
                   <div className="text-[9px] text-gray-500 tabular-nums">{customer.phone}</div>
                 </div>
                 <button className="text-gray-300 group-hover:text-indigo-500 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                 </button>
               </div>
            </div>
            
            {/* Order Note - Back inside only when customer selected */}
            <div className="p-2 bg-indigo-50/20">
               <textarea 
                 className="w-full px-1 py-1 text-[10px] border-none bg-transparent focus:ring-0 outline-none transition-all resize-none h-10 text-gray-600 placeholder:text-gray-300 italic leading-tight"
                 placeholder="輸入訂單總備註內容..."
                 value={orderNote}
                 onChange={(e) => onSetOrderNote(e.target.value)}
               />
            </div>
          </div>
        ) : (
          <button 
            onClick={onSelectCustomer}
            className="w-full py-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {enableCustomerSync ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              )}
            </svg>
            <span className="text-[11px] font-bold tracking-wide">輸入客戶</span>
          </button>
        )}
      </div>

      {/* Cart Items - Scrollable Area */}
      {items.length === 0 ? (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 p-8">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500">購物車是空的</p>
            <p className="text-sm text-center text-gray-400">請選擇商品開始結帳</p>
         </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <CartItemRow
                key={item.cartKey}
                item={item}
                index={index}
                isSplitMode={isSplitMode}
                splitQty={splitQuantities[`${item.id}-${index}`] || 0}
                isSelected={isSplitMode && (splitQuantities[`${item.id}-${index}`] || 0) > 0}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateSplitQty={updateSplitQty}
                onRemove={onRemove}
                onEdit={setEditingItem}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Checkout Summary - Fixed Bottom */}
      <div className="flex-none p-5 bg-gray-50 border-t border-gray-200 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        {/* Calculations */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>小計</span>
            <span className="font-medium text-gray-700">${Math.round(subtotal)}</span>
          </div>
          
          {itemDiscountTotal > 0 && (
            <div className="flex justify-between text-red-500">
              <span>商品折扣</span>
              <span>-${Math.round(itemDiscountTotal)}</span>
            </div>
          )}

          {/* Expander Toggle */}
          <div className="pt-1">
             <button 
               onClick={() => setIsExpanderOpen(!isExpanderOpen)}
               className="flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-wider"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isExpanderOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
               <span>進階選項 (自定義品項 / 整單折扣)</span>
             </button>
             
             {isExpanderOpen && (
               <div className="mt-2 p-3 bg-white border border-gray-200 rounded-xl space-y-3 animate-pop-in">
                  {/* Order Level Discount */}
                  <div className="flex items-center justify-between">
                     <label className="text-gray-500 text-xs font-bold">整單折扣金額 ($)</label>
                     <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input 
                          type="number" 
                          min="0"
                          step="1"
                          className="w-24 pl-5 pr-2 py-1.5 text-right text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                          value={orderDiscount === 0 ? '' : orderDiscount}
                          placeholder="0"
                          onChange={(e) => onSetOrderDiscount(Math.round(parseFloat(e.target.value) || 0))}
                        />
                     </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <button 
                      onClick={() => setIsCustomModalOpen(true)}
                      className="w-full py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center justify-center gap-1.5 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      新增自定義品項
                    </button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Total & Checkout */}
        <div className="flex items-end justify-between mb-4 pt-3 border-t border-gray-200 border-dashed">
            <span className="text-gray-800 font-bold">總計</span>
            <span className="text-2xl font-extrabold text-indigo-600 tracking-tight">${Math.round(total)}</span>
        </div>

        <button 
          onClick={handleCheckoutClick}
          disabled={(isSplitMode ? isSelectionEmpty : items.length === 0)}
          className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2 ${isSplitMode ? 'bg-indigo-600 shadow-indigo-200' : 'bg-indigo-600 shadow-indigo-200'} text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          <span>{isSplitMode ? '分批結帳付款' : '結帳'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
        
        {isSplitMode && (
           <p className="mt-2 text-center text-xs font-bold text-indigo-600 bg-indigo-50 py-1 rounded-full animate-pulse">
             正在選取分批付款內容...
           </p>
        )}
      </div>

      {/* Custom Item Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-pop-in">
              <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                 <h3 className="font-bold">新增自定義品項</h3>
                 <button onClick={() => setIsCustomModalOpen(false)}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">品項名稱</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                     placeholder="例如：補差額、運費、客製費..."
                     value={customName}
                     onChange={(e) => setCustomName(e.target.value)}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">金額 ($)</label>
                   <input 
                     type="number" 
                     className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg"
                     placeholder="0"
                     value={customPrice}
                     onChange={(e) => setCustomPrice(e.target.value)}
                   />
                 </div>
                 <button 
                   onClick={() => {
                     const p = parseFloat(customPrice);
                     if (customName && !isNaN(p)) {
                       onAddCustomItem(customName, p);
                       setIsCustomModalOpen(false);
                       setCustomName('');
                       setCustomPrice('');
                     }
                   }}
                   className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                 >
                   加入購物車
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Item Modal - Overlay */}
      {editingItem && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-slide-in-right">
           {/* Modal Header */}
           <div className="flex-none flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
             <h3 className="text-lg font-bold text-gray-800">編輯商品</h3>
             <button 
               onClick={() => setEditingItem(null)} 
               className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
           
           {/* Modal Body */}
           <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="flex items-center space-x-4 mb-6">
                 <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                   <img src={editingItem.images[0]?.src} alt="" className="w-full h-full object-cover" />
                 </div>
                 <div>
                   <p className="font-bold text-gray-800 text-lg line-clamp-2">{editingItem.name}</p>
                   {editingItem.selectedVariation && (
                     <p className="text-sm text-indigo-600 font-medium">
                       {editingItem.selectedVariation.attributes.map(a => `${a.name}:${a.option}`).join(', ')}
                     </p>
                   )}
                   <p className="text-sm text-gray-500 mt-1">
                     ${Math.round(editingItem.selectedVariation ? parseFloat(editingItem.selectedVariation.price) : parseFloat(editingItem.price))} / 單位
                   </p>
                 </div>
              </div>

              <form id="edit-form" onSubmit={handleEditSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">商品折扣金額 ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-lg"
                      value={editingItem.discount || ''}
                      placeholder="0"
                      onChange={(e) => setEditingItem({ ...editingItem, discount: Math.round(parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">商品備註</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none transition-all text-sm"
                    placeholder="輸入商品客製化需求、備註..."
                    value={editingItem.note || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                  />
                </div>
              </form>
           </div>
            
           {/* Modal Footer */}
           <div className="flex-none p-4 border-t border-gray-100 flex space-x-3 bg-white">
              <button 
                type="button"
                onClick={() => {
                  onRemove(editingItem.cartKey);
                  setEditingItem(null);
                }}
                className="flex-1 py-3 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
              >
                移除
              </button>
              <button 
                type="submit"
                form="edit-form"
                className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
              >
                儲存
              </button>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 2px;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-pop-in {
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Cart;

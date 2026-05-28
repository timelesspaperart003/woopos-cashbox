
import React, { useState, useEffect } from 'react';
import { Product, ProductVariation, WCSettings } from '../types';
import { fetchVariations } from '../services/wooService';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  settings?: WCSettings; // Add settings to fetch variations
  onAddToCart: (product: Product, variation?: ProductVariation) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, settings, onAddToCart }) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [currentVariation, setCurrentVariation] = useState<ProductVariation | null>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState<number>(0);

  useEffect(() => {
    if (product) {
      setSelectedAttributes({});
      setCurrentVariation(null);
      setNote('');
      setDiscount(0);
      
      // Initial variations from product data (mock data usually has them)
      let initialVariations = product.variations || [];
      setVariations(initialVariations);

      // Check if we need to and CAN fetch variations
      const shouldFetch = 
        product.type === 'variable' && 
        initialVariations.length === 0 && 
        settings && 
        !settings.useMockData && 
        settings.url && 
        settings.consumerKey;

      if (shouldFetch) {
        setLoadingVariations(true);
        fetchVariations(settings!, product.id)
          .then(data => {
            if (data && data.length > 0) {
              setVariations(data);
            }
          })
          .catch(err => {
             // Error handled in service, just stop loading
             console.debug("Variation fetch skipped or failed", err);
          })
          .finally(() => setLoadingVariations(false));
      }
    }
  }, [product, settings]);

  // Determine current variation when attributes or variations change
  useEffect(() => {
    if (!product || product.type !== 'variable') return;

    const attributes = product.attributes || [];

    // Check if all attributes are selected
    const allSelected = attributes.every(attr => selectedAttributes[attr.name]);
    
    if (allSelected && variations.length > 0) {
      // Logic to find matching variation
      // Note: We try to match loosely in case attribute names differ (e.g. Slug vs Name)
      const match = variations.find(v => 
        v.attributes.every(va => {
           // Direct match
           if (selectedAttributes[va.name] === va.option) return true;
           // Try matching keys if names are slightly different (e.g. Size vs pa_size)
           // For simplicity we stick to direct name match from the dropdown logic
           return false;
        })
      );
      setCurrentVariation(match || null);
    } else {
      setCurrentVariation(null);
    }
  }, [selectedAttributes, variations, product]);

  if (!isOpen || !product) return null;

  const handleAttributeSelect = (name: string, option: string) => {
    setSelectedAttributes(prev => ({ ...prev, [name]: option }));
  };

  const handleAddToCart = () => {
    const isVariable = product.type === 'variable' || (product.attributes && product.attributes.length > 0);
    
    // Supplement product with note/discount
    const baseProduct = { 
      ...product,
      note: note.trim() || undefined,
      discount: discount > 0 ? discount : undefined
    };

    if (isVariable) {
      if (currentVariation) {
        onAddToCart(baseProduct as Product, currentVariation);
        onClose();
      } else {
        const allAttributesSelected = product.attributes.every(attr => selectedAttributes[attr.name]);
        if (allAttributesSelected) {
           const syntheticVariation: ProductVariation = {
             id: Date.now(),
             price: product.price,
             regular_price: product.regular_price,
             sale_price: product.sale_price,
             stock_status: product.stock_status,
             attributes: Object.entries(selectedAttributes).map(([name, option]) => ({ name, option: option as string }))
           };
           onAddToCart(baseProduct as Product, syntheticVariation);
           onClose();
        }
      }
    } else {
      onAddToCart(baseProduct as Product);
      onClose();
    }
  };

  // Pricing Logic
  const currentPrice = currentVariation ? currentVariation.price : product.price;
  const currentRegularPrice = currentVariation ? currentVariation.regular_price : product.regular_price;
  const isSale = currentRegularPrice !== currentPrice && currentRegularPrice !== '';
  
  // Validation Logic
  const isVariable = product.type === 'variable' || (product.attributes && product.attributes.length > 0);
  const allAttributesSelected = isVariable && product.attributes.every(attr => selectedAttributes[attr.name]);
  
  // Enable button if:
  // 1. Not a variable product
  // 2. Variable product AND a variation is matched
  // 3. Variable product AND all attributes selected (fallback)
  // Disable if loading variations
  const isReadyToAdd = !loadingVariations && (!isVariable || (currentVariation || allAttributesSelected));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Image Section - Optimized for 1:1 */}
        <div className="w-full md:w-1/2 bg-gray-50 relative aspect-square border-b md:border-b-0 md:border-r border-gray-100 flex-shrink-0">
          <img 
            src={product.images[0]?.src || 'https://picsum.photos/400'} 
            alt={product.name} 
            className="w-full h-full object-contain p-4"
            decoding="async"
          />
          {isSale && (
             <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
               特價中
             </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight pr-4">{product.name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
          </div>

          <div className="mb-6">
             <div className="flex items-end gap-3">
               <span className="text-3xl font-bold text-indigo-600">${Math.round(parseFloat(currentPrice))}</span>
               {isSale && (
                 <span className="text-lg text-gray-400 line-through mb-1">${Math.round(parseFloat(currentRegularPrice))}</span>
               )}
             </div>
          </div>

          <div className="prose prose-sm text-gray-600 mb-6 flex-1">
             <p>{(product.description || product.short_description) ? (product.description || product.short_description || '').replace(/<[^>]*>?/gm, '') : '暫無商品描述。'}</p>
          </div>

          {/* Attributes Selection */}
          {isVariable && (
            <div className="space-y-5 mb-8">
              {loadingVariations && (
                 <div className="flex items-center text-indigo-600 text-sm mb-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    正在載入規格價格...
                 </div>
              )}
              {product.attributes.map(attr => (
                <div key={attr.id}>
                   <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">{attr.name}</h3>
                   <div className="flex flex-wrap gap-2">
                     {attr.options.map(option => {
                       const isSelected = selectedAttributes[attr.name] === option;
                       return (
                         <button
                           key={option}
                           onClick={() => handleAttributeSelect(attr.name, option)}
                           className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all transform active:scale-95 ${
                             isSelected 
                               ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                               : 'border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                           }`}
                         >
                           {option}
                         </button>
                       );
                     })}
                   </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Note & Discount Fields */}
          <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between gap-4">
               <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">折扣金額 ($)</label>
                  <input 
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={e => setDiscount(Math.round(parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  />
               </div>
            </div>
            <div>
               <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">商品備註</label>
               <textarea 
                 value={note}
                 onChange={e => setNote(e.target.value)}
                 placeholder="客製化要求、口味、備註..."
                 className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm h-16 resize-none outline-none focus:ring-1 focus:ring-indigo-500"
               />
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100">
            <button
              onClick={handleAddToCart}
              disabled={!isReadyToAdd}
              className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] ${
                 !isReadyToAdd 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {!isReadyToAdd ? '請選擇商品規格' : '加入購物車'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

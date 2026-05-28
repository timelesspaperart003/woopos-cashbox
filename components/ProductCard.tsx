
import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  onClick: (product: Product, quickAdd?: boolean) => void;
  onZoom: (imageUrl: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isFavorite, onToggleFavorite, onClick, onZoom }) => {
  const imageUrl = product.images.length > 0 ? product.images[0].src : 'https://picsum.photos/300/300';
  // Round to integer, remove decimals
  const price = product.price ? Math.round(parseFloat(product.price)) : '0';
  const regularPrice = product.regular_price ? Math.round(parseFloat(product.regular_price)) : '0';
  
  const hasSale = product.sale_price !== '' && product.sale_price !== product.regular_price;
  const isVariable = product.type === 'variable' || product.attributes.length > 0;

  // Handle button click explicitly to prevent bubbling issues and ensure responsiveness
  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(product, true);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
      onClick={() => onClick(product, false)}
    >
      {/* Image Container - Strictly 1:1 Aspect Ratio */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={product.name} 
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        
        {/* Sale Badge */}
        {hasSale && (
          <div className="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-br-lg shadow-sm z-10">
            特價
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-all shadow-sm z-10 hover:text-red-500 text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100"
          title="加入最愛"
        >
          {isFavorite ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 fill-current" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>

        {/* Zoom Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onZoom(imageUrl);
          }}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all shadow-sm z-10 opacity-0 group-hover:opacity-100"
          title="放大圖片"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>
      
      {/* Content Section */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight mb-1 line-clamp-2" title={product.name}>
          {product.name}
        </h3>

        {/* Description - Adding this back as requested */}
        {(product.short_description || product.description) && (
          <div 
            className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: (product.short_description || product.description || '').replace(/<[^>]*>?/gm, '') 
            }}
          />
        )}

        {/* Stock Status */}
        <div className="mb-2">
           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
             product.stock_status === 'instock' 
               ? 'bg-green-100 text-green-700' 
               : 'bg-red-100 text-red-700'
           }`}>
             {product.stock_status === 'instock' ? '有庫存' : '缺貨'}
           </span>
        </div>

        {/* Price & Action */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline space-x-2 mb-3">
             <span className="text-lg md:text-xl font-extrabold text-indigo-600">
               ${price}
             </span>
             {hasSale && (
                <span className="text-xs text-gray-400 line-through">
                  ${regularPrice}
                </span>
             )}
          </div>

          {/* Full Width Action Button */}
          <button
            onClick={handleActionClick}
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-1 shadow-sm border ${
              isVariable 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' 
                : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            {isVariable ? (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 <span>選擇規格</span>
               </>
            ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                 </svg>
                 <span>加入</span>
               </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

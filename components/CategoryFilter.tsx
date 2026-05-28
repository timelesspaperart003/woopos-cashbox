import React, { useMemo } from 'react';
import { Category } from '../types';

export const FAVORITES_ID = -1;

interface CategoryFilterProps {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  totalCount?: number;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, selectedId, onSelect, totalCount = 0 }) => {
  
  // Find current active category object
  const activeCategory = useMemo(() => 
    categories.find(c => c.id === selectedId), 
  [categories, selectedId]);

  // Determine current parent ID for display logic
  // If selected is favorites (-1) or null (All), show root (0)
  // If selected has children, stay on selected level (show its children)
  // If selected has no children, it's a leaf, so show its siblings (same parent)
  const currentParentId = useMemo(() => {
    if (!selectedId || selectedId === FAVORITES_ID) return 0;
    
    // Check if the selected category has children
    const hasChildren = categories.some(c => c.parent === selectedId);
    if (hasChildren) return selectedId;
    
    // If leaf, return its parent to show siblings
    return activeCategory?.parent || 0;
  }, [categories, selectedId, activeCategory]);

  // Categories to display
  const visibleCategories = useMemo(() => 
    categories.filter(c => c.parent === currentParentId), 
  [categories, currentParentId]);

  // Back handling
  const handleBack = () => {
    if (currentParentId === 0) return;
    const parentCat = categories.find(c => c.id === currentParentId);
    // Go up one level (to grandparent)
    onSelect(parentCat ? parentCat.parent === 0 ? null : parentCat.parent : null);
  };

  return (
    <div className="w-full flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      
      {/* Back Button (Only when deep in hierarchy) */}
      {currentParentId !== 0 && (
        <button
          onClick={handleBack}
          className="flex-shrink-0 flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
      )}

      {/* Root Level Options (Only show at root) */}
      {currentParentId === 0 && (
        <>
          <button
            onClick={() => onSelect(null)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedId === null
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            全部商品 ({totalCount})
          </button>

          <button
            onClick={() => onSelect(FAVORITES_ID)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center ${
              selectedId === FAVORITES_ID
                ? 'bg-red-500 text-white shadow-md border-red-500'
                : 'bg-white text-red-500 border border-red-100 hover:bg-red-50'
            }`}
            title="我的最愛"
          >
            ❤️
          </button>
        </>
      )}

      {/* Category List */}
      {visibleCategories.map((cat) => {
        const isSelected = selectedId === cat.id;
        const isParentOfSelected = selectedId && categories.find(c => c.id === selectedId)?.parent === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              isSelected || isParentOfSelected
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat.name} 
            {cat.count !== undefined && <span className="opacity-70 text-xs ml-1">({cat.count})</span>}
          </button>
        );
      })}

      {/* Empty State for category with no children */}
      {currentParentId !== 0 && visibleCategories.length === 0 && (
         <span className="text-sm text-gray-400 italic px-2">無子分類</span>
      )}
    </div>
  );
};

export default CategoryFilter;
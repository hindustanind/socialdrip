import React, { useState } from 'react';
import { OutfitCategory } from '../../types';
import { OUTFIT_CATEGORIES } from '../../constants';

interface CategoryFilterProps {
  activeCategory: OutfitCategory;
  setActiveCategory: (category: OutfitCategory) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ activeCategory, setActiveCategory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const STAGGER_AMOUNT = 75; // in ms

  const handleCategoryClick = (category: OutfitCategory) => {
    setActiveCategory(category);
    // The menu no longer closes. It stays open for easy category switching.
  };

  const handleOpenMenu = () => {
    if (isOpen) return;
    setIsOpen(true);
  };

  const formatCategoryName = (category: string) => {
    return category.charAt(0) + category.slice(1).toLowerCase();
  };

  return (
    <div className={`flex items-center bg-white/5 border border-white/10 rounded-full p-1 transition-all duration-500 ease-in-out gap-2`}>
      {isOpen ? (
        <>
          {OUTFIT_CATEGORIES.map((category, index) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`rounded-full px-6 py-2 text-base font-semibold transition-all duration-500 transform focus:outline-none
                category-button-reveal
                ${activeCategory === category
                  ? 'bg-gradient-to-r from-[#f400f4] to-[#00f2ff] text-white shadow-[0_0_10px_#f400f4] scale-105'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white hover:scale-105'
                }`}
              style={{
                '--delay': `${50 + index * STAGGER_AMOUNT}ms`
              } as React.CSSProperties}
            >
              {formatCategoryName(category)}
            </button>
          ))}
        </>
      ) : (
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-base font-semibold transition-colors duration-300 transform active:scale-95 focus:outline-none
            ${activeCategory !== OutfitCategory.ALL
              ? 'bg-gradient-to-r from-[#f400f4] to-[#00f2ff] text-white shadow-[0_0_10px_#f400f4]'
              : 'text-gray-300'
            }
          `}
          onClick={handleOpenMenu}
        >
          {formatCategoryName(activeCategory)}
        </button>
      )}
    </div>
  );
};

export default CategoryFilter;
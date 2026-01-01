import React from 'react';
import { type SubCategory, type MainCategory, type CategoryConfig } from '../types';
import { MAIN_CATEGORIES } from '../config/sheets';

interface CategoryTabsProps {
    mainCategory: MainCategory;
    activeSubCategory: SubCategory;
    subcategories: CategoryConfig[];
    onMainCategoryChange: (category: MainCategory) => void;
    onSubCategoryChange: (category: SubCategory) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
    mainCategory,
    activeSubCategory,
    subcategories,
    onMainCategoryChange,
    onSubCategoryChange
}) => {
    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Main Category Pills (MW, LW, CW) */}
            {MAIN_CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => cat.enabled && onMainCategoryChange(cat.id)}
                    disabled={!cat.enabled}
                    className={`
                        px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors
                        ${mainCategory === cat.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : cat.enabled
                                ? 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                                : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'}
                    `}
                >
                    {cat.name}
                </button>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-border mx-2" />

            {/* Sub Category Pills (Tops, Shorts, etc.) */}
            {subcategories.map((cat: CategoryConfig) => (
                <button
                    key={cat.id}
                    onClick={() => cat.gid && onSubCategoryChange(cat.id)}
                    disabled={!cat.gid}
                    className={`
                        px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors
                        ${activeSubCategory === cat.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : cat.gid
                                ? 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                                : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'}
                    `}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
};

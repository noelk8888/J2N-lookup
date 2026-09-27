import React from 'react';
import { type SubCategory, type MainCategory, type CategoryConfig } from '../types';
import { MAIN_CATEGORIES } from '../config/sheets';

interface MainCategoryTabsProps {
    mainCategory: MainCategory;
    allStylesActive: boolean;
    onAllStylesChange: () => void;
    onMainCategoryChange: (category: MainCategory) => void;
}

export const MainCategoryTabs: React.FC<MainCategoryTabsProps> = ({
    mainCategory,
    allStylesActive,
    onAllStylesChange,
    onMainCategoryChange
}) => {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onAllStylesChange}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${allStylesActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}`}
            >
                All Styles
            </button>
            {MAIN_CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => cat.enabled && onMainCategoryChange(cat.id)}
                    disabled={!cat.enabled}
                    className={`
                        px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors
                        ${!allStylesActive && mainCategory === cat.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : cat.enabled
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

interface SubCategoryTabsProps {
    activeSubCategory: SubCategory;
    subcategories: CategoryConfig[];
    onSubCategoryChange: (category: SubCategory) => void;
}

export const SubCategoryTabs: React.FC<SubCategoryTabsProps> = ({
    activeSubCategory,
    subcategories,
    onSubCategoryChange
}) => {
    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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

interface CategoryTabsProps {
    mainCategory: MainCategory;
    allStylesActive: boolean;
    onAllStylesChange: () => void;
    activeSubCategory: SubCategory;
    subcategories: CategoryConfig[];
    onMainCategoryChange: (category: MainCategory) => void;
    onSubCategoryChange: (category: SubCategory) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
    mainCategory,
    allStylesActive,
    onAllStylesChange,
    activeSubCategory,
    subcategories,
    onMainCategoryChange,
    onSubCategoryChange
}) => {
    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <MainCategoryTabs
                mainCategory={mainCategory}
                allStylesActive={allStylesActive}
                onAllStylesChange={onAllStylesChange}
                onMainCategoryChange={onMainCategoryChange}
            />

            {!allStylesActive && (
                <>
                    <div className="h-6 w-px bg-border mx-2" />
                    <SubCategoryTabs
                        activeSubCategory={activeSubCategory}
                        subcategories={subcategories}
                        onSubCategoryChange={onSubCategoryChange}
                    />
                </>
            )}
        </div>
    );
};

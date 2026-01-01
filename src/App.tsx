import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSubcategories, getMainCategoryConfig } from './config/sheets';
import { fetchCategoryData } from './services/sheetService';
import { type SubCategory, type MainCategory } from './types';
import { CategoryTabs } from './components/CategoryTabs';
import { ListingGrid } from './components/ListingGrid';
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';

type SortField = 'none' | 'quantity' | 'styleNumber' | 'suffix';
type SortDirection = 'asc' | 'desc';

// Helper to extract suffix number from item code (e.g., "CHN MJ00617" -> 617)
const extractSuffixNumber = (itemCode: string): number => {
  const match = itemCode.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

function App() {
  const [mainCategory, setMainCategory] = useState<MainCategory>('MW');
  const [activeSubCategory, setActiveSubCategory] = useState<SubCategory>('TOPS');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const mainCategoryConfig = getMainCategoryConfig(mainCategory);
  const subcategories = mainCategoryConfig?.subcategories || [];
  const activeConfig = subcategories.find(c => c.id === activeSubCategory);

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ['listings', mainCategory, activeSubCategory],
    queryFn: () => fetchCategoryData(mainCategoryConfig?.sheetId || '', activeConfig?.gid || ''),
    enabled: !!activeConfig?.gid,
    staleTime: 1000 * 60 * 5,
  });

  // Item codes that should always appear at the end of the list
  const alwaysAtEnd = ['D2 MW A 120', 'D2 MW B 121+', 'D2 LW A', 'D2 LW B', 'D2 CW A'];

  // Client-side filtering
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.itemCode.toLowerCase().includes(q) ||
          (item.cost && item.cost.toString().includes(q))
        );
      }
      if (showAll) return true;
      return item.totalQuantity > 0;
    });
  }, [listings, searchQuery, showAll]);

  // Sorting logic - keeps "always at end" items at the bottom
  const sortedListings = useMemo(() => {
    // Separate items that should always be at the end
    const regularItems = filteredListings.filter(item => !alwaysAtEnd.includes(item.itemCode));
    const endItems = filteredListings.filter(item => alwaysAtEnd.includes(item.itemCode));

    // Sort regular items
    let sortedRegular = regularItems;
    if (sortField !== 'none') {
      sortedRegular = [...regularItems].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'quantity':
            comparison = a.totalQuantity - b.totalQuantity;
            break;
          case 'styleNumber':
            comparison = a.itemCode.localeCompare(b.itemCode);
            break;
          case 'suffix':
            comparison = extractSuffixNumber(a.itemCode) - extractSuffixNumber(b.itemCode);
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Append "always at end" items
    return [...sortedRegular, ...endItems];
  }, [filteredListings, sortField, sortDirection]);

  const handleMainCategoryChange = (cat: MainCategory) => {
    setMainCategory(cat);
    const subs = getSubcategories(cat);
    if (subs.length > 0) {
      setActiveSubCategory(subs[0].id);
    }
    setSearchQuery('');
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Line 1: Title + Search + Show All */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">J2N LookUp</h1>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by code or price..."
                  className="w-full pl-10 pr-10 py-2 rounded-md border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Toggle for Show All */}
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <span className="text-sm text-muted-foreground">Show All</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                </div>
              </label>
            </div>

            {/* Line 2: Category Tabs + Sort */}
            <div className="flex items-center gap-4">
              <CategoryTabs
                mainCategory={mainCategory}
                activeSubCategory={activeSubCategory}
                subcategories={subcategories}
                onMainCategoryChange={handleMainCategoryChange}
                onSubCategoryChange={(c) => {
                  setActiveSubCategory(c);
                  setSearchQuery('');
                }}
              />

              {/* Sort Section */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Sort:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-2 py-1.5 rounded-md border bg-muted/50 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="quantity">Quantity</option>
                  <option value="styleNumber">Style Number</option>
                  <option value="suffix">Suffix</option>
                </select>

                {sortField !== 'none' && (
                  <button
                    onClick={toggleSortDirection}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-md border bg-muted/50 text-sm hover:bg-secondary transition-colors"
                  >
                    {sortDirection === 'desc' ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <ListingGrid
          listings={sortedListings}
          isLoading={isLoading}
          error={error as Error | null}
        />
      </main>
    </div>
  );
}

export default App;

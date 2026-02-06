import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getSubcategories, getMainCategoryConfig, MAIN_CATEGORIES } from './config/sheets';
import { fetchCategoryData } from './services/sheetService';
import { type SubCategory, type MainCategory } from './types';
import { CategoryTabs, MainCategoryTabs, SubCategoryTabs } from './components/CategoryTabs';
import { ListingGrid } from './components/ListingGrid';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { useAuth } from './contexts/AuthContext';
import { Search, ArrowUp, ArrowDown, X, LogOut, Settings } from 'lucide-react';

type SortField = 'none' | 'quantity' | 'styleNumber' | 'suffix';
type SortDirection = 'asc' | 'desc';

// Helper to extract suffix number from item code (e.g., "CHN MJ00617" -> 617)
const extractSuffixNumber = (itemCode: string): number => {
  const match = itemCode.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

function AppContent() {
  const { user, isAdmin, signOut } = useAuth();
  const [mainCategory, setMainCategory] = useState<MainCategory>('MW');
  const [activeSubCategory, setActiveSubCategory] = useState<SubCategory>('TOPS');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const mainCategoryConfig = getMainCategoryConfig(mainCategory);
  const subcategories = mainCategoryConfig?.subcategories || [];
  const activeConfig = subcategories.find(c => c.id === activeSubCategory);

  // Fetch current category data
  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ['listings', mainCategory, activeSubCategory],
    queryFn: () => fetchCategoryData(mainCategoryConfig?.sheetId || '', activeConfig?.gid || ''),
    enabled: !!activeConfig?.gid,
    staleTime: 1000 * 60 * 5,
  });

  // Build list of all sheet/gid combinations for global search
  const allSheetConfigs = useMemo(() => {
    const configs: { sheetId: string; gid: string; category: string; subcategory: string }[] = [];
    MAIN_CATEGORIES.forEach(mainCat => {
      if (mainCat.enabled) {
        mainCat.subcategories.forEach(subCat => {
          if (subCat.gid) {
            configs.push({
              sheetId: mainCat.sheetId,
              gid: subCat.gid,
              category: mainCat.id,
              subcategory: subCat.id
            });
          }
        });
      }
    });
    return configs;
  }, []);

  // Fetch all sheets for global search (only when searching)
  const allSheetsQueries = useQueries({
    queries: allSheetConfigs.map(config => ({
      queryKey: ['listings', config.category, config.subcategory],
      queryFn: () => fetchCategoryData(config.sheetId, config.gid),
      enabled: searchQuery.length > 0, // Only fetch when searching
      staleTime: 1000 * 60 * 5,
    }))
  });

  // Combine all data for global search
  const allListings = useMemo(() => {
    if (!searchQuery) return [];
    return allSheetsQueries
      .filter(q => q.data)
      .flatMap(q => q.data || []);
  }, [allSheetsQueries, searchQuery]);

  const isSearchLoading = searchQuery.length > 0 && allSheetsQueries.some(q => q.isLoading);

  // Helper to identify special items that should always be shown and appear at the end
  const isSpecialItem = (item: any) => {
    const code = item.itemCode.toUpperCase();
    return code.includes('CONTINUOUS') || code.includes('D2');
  };

  // Helper to identify items that should be at the end of the list
  const isEndItem = (item: any) => {
    return isSpecialItem(item) || item.totalQuantity === 0;
  };

  // Client-side filtering
  const filteredListings = useMemo(() => {
    // When searching, use all listings from all sheets; otherwise use current category
    const sourceListings = searchQuery ? allListings : listings;

    return sourceListings.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        // Priority search: Item Code (Col M), Cost (Col W), Brand (Col J)
        return (
          item.itemCode.toLowerCase().includes(q) ||
          (item.cost && item.cost.toString().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q))
        );
      }
      // If showAll is true, show everything
      if (showAll) return true;

      // If showAll is false, show items with quantity > 0 OR special items (CONTINUOUS/D2)
      return item.totalQuantity > 0 || isSpecialItem(item);
    });
  }, [listings, allListings, searchQuery, showAll]);

  // Sorting logic - keeps "always at end" items at the bottom
  const sortedListings = useMemo(() => {
    // Separate items that should always be at the end
    const regularItems = filteredListings.filter(item => !isEndItem(item));
    const endItems = filteredListings.filter(item => isEndItem(item));

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
    // Don't clear search - it searches all sheets globally
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Line 1: Title + Show All + User Menu (Search on desktop) */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">J2N LookUp</h1>

              {/* Search - Hidden on mobile, shown on desktop */}
              <div className="relative flex-1 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search all sheets..."
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
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap ml-auto sm:ml-0">
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

              {/* User Menu */}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Admin Panel"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">{user?.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Search - Shown only on mobile */}
            <div className="relative sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search all sheets..."
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

            {/* Desktop: Category Tabs + Sort on same row */}
            <div className="hidden sm:flex items-center gap-4">
              <CategoryTabs
                mainCategory={mainCategory}
                activeSubCategory={activeSubCategory}
                subcategories={subcategories}
                onMainCategoryChange={handleMainCategoryChange}
                onSubCategoryChange={setActiveSubCategory}
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

            {/* Mobile: Main Categories + Sort on one row */}
            <div className="flex sm:hidden items-center gap-4">
              <MainCategoryTabs
                mainCategory={mainCategory}
                onMainCategoryChange={handleMainCategoryChange}
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

            {/* Mobile: Subcategories on separate row */}
            <div className="sm:hidden">
              <SubCategoryTabs
                activeSubCategory={activeSubCategory}
                subcategories={subcategories}
                onSubCategoryChange={setActiveSubCategory}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <ListingGrid
          listings={sortedListings}
          isLoading={isLoading || isSearchLoading}
          error={error as Error | null}
          showAll={showAll}
        />
      </main>

      {/* Admin Panel Modal */}
      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
    </div>
  );
}

function App() {
  const { user, isApproved, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated or not approved
  if (!user || !isApproved) {
    return <Login />;
  }

  // Show main app content
  return <AppContent />;
}

export default App;

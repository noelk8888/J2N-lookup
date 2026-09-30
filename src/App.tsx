import { useState, useMemo, useCallback } from 'react';
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
type StyleGroup = 'marlon' | 'nonMarlon' | 'sm';

const MARLON_STYLES = new Set([
  'MT03287', 'BT03299', 'LT03197', 'LD03290', 'LD03265', 'LD03246',
  'LD03366', 'LS03084', 'GT03403', 'MT03248', 'MT00635', 'MS03220',
  'MS03306', 'MS00639', 'MS00636', 'MS03222', 'GP01027', 'BT03329',
  'BT03345', 'BS03312', 'GS03271', 'GP03401', 'CP01321', 'GD01879',
  'GD8888', 'LP03211', 'LT02304', 'LT02435', 'LT02321', 'LT03368',
  'LT03348', 'LT03322', 'LK03228', 'LD03370', 'LD03388', 'LD03347',
  'LD03379', 'LD03333', 'LD03378', 'LD03389', 'LD03301', 'LD03235',
  'LD03218', 'LD03367', 'LD03365', 'LD03279', 'LJ00643', 'LJ01629',
  'LJ03009',
]);

const SM_STYLES = new Set([
  'MT03479', 'MT03488', 'MJ03441', 'MJ03438', 'MP03440', 'MJ03011',
  'MT02216', 'LT03229', 'LT02206', 'LT00624', 'LT03190', 'LS03451',
  'LP03364', 'LP03365', 'LP03231', 'LP03419', 'LP03083', 'LP03084',
  'LJ02156', 'LJ03324', 'LT03369', 'LT03368', 'BT03427', 'BT03422',
  'CP01378', 'BP571', 'BT03289', 'BT03291', 'BP03400', 'GT03290',
]);

const getStyleGroups = (itemCode: string): StyleGroup[] => {
  const codes = itemCode.toUpperCase().split(/[^A-Z0-9]+/);
  const groups: StyleGroup[] = [];
  if (codes.some(code => MARLON_STYLES.has(code))) groups.push('marlon');
  if (codes.some(code => SM_STYLES.has(code))) groups.push('sm');
  return groups.length > 0 ? groups : ['nonMarlon'];
};

const findStyleCode = (itemCode: string): string | undefined => (
  itemCode.toUpperCase().split(/[^A-Z0-9]+/).find(code => /^[A-Z]{2,3}\d{3,5}$/.test(code))
);

const getStyleCode = (itemCode: string): string => {
  return findStyleCode(itemCode) ?? itemCode.trim().toUpperCase();
};

// Helper to extract suffix number from item code (e.g., "CHN MJ00617" -> 617)
const extractSuffixNumber = (itemCode: string): number => {
  const match = itemCode.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

function AppContent() {
  const { user, isAdmin, signOut } = useAuth();
  const [allStylesActive, setAllStylesActive] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainCategory>('MW');
  const [activeSubCategory, setActiveSubCategory] = useState<SubCategory>('TOPS');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMarlon, setShowMarlon] = useState(true);
  const [showNonMarlon, setShowNonMarlon] = useState(true);
  const [showSm, setShowSm] = useState(true);

  const matchesStyleGroup = useCallback((itemCode: string) => {
    return getStyleGroups(itemCode).some(group =>
      (group === 'marlon' && showMarlon) ||
      (group === 'nonMarlon' && showNonMarlon) ||
      (group === 'sm' && showSm)
    );
  }, [showMarlon, showNonMarlon, showSm]);

  const mainCategoryConfig = getMainCategoryConfig(mainCategory);
  const subcategories = mainCategoryConfig?.subcategories || [];
  const activeConfig = subcategories.find(c => c.id === activeSubCategory);

  // Fetch current category data
  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ['listings', mainCategory, activeSubCategory],
    queryFn: async () => {
      const data = await fetchCategoryData(mainCategoryConfig?.sheetId || '', activeConfig?.gid || '');
      return data.map(item => ({ ...item, mainCategory, subCategory: activeConfig?.id }));
    },
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

  // Only fetch other sheets when user starts searching (min 2 chars)
  const isSearching = searchQuery.length >= 2;

  // Fetch all sheets for global search and footer totals
  const allSheetsQueries = useQueries({
    queries: allSheetConfigs.map(config => ({
      queryKey: ['listings', config.category, config.subcategory],
      queryFn: async () => {
        const data = await fetchCategoryData(config.sheetId, config.gid);
        return data.map(item => ({ ...item, mainCategory: config.category, subCategory: config.subcategory }));
      },
      enabled: true,
      staleTime: 1000 * 60 * 5,
    }))
  });

  // Check loading state
  const isSearchLoading = isSearching && allSheetsQueries.some(q => q.isLoading);
  const isAllStylesLoading = allStylesActive && allSheetsQueries.some(q => q.isLoading);
  const allStylesError = allStylesActive ? allSheetsQueries.find(q => q.error)?.error : null;

  // Combine all data for global search and totals
  const allListingsArray = useMemo(() => {
    const results: any[] = [];
    for (const query of allSheetsQueries) {
      if (query.data) {
        results.push(...query.data);
      }
    }
    return results;
  }, [allSheetsQueries]);

  // Helper to identify special items that should always be shown and appear at the end
  const isSpecialItem = (item: any) => {
    const code = item.itemCode.toUpperCase();
    return code.includes('CONTINUOUS') || code.includes('D2');
  };

  // Helper to identify items that should be at the end of the list
  const isEndItem = (item: any) => {
    return isSpecialItem(item) || item.totalQuantity === 0;
  };

  // Check if search query is exactly 5 digits
  const isFiveDigitSearch = /^\d{5}$/.test(searchQuery.trim());

  // Apply the usual search and availability rules before counting either group.
  const baseListings = useMemo(() => {
    const sourceListings = allStylesActive
      ? allListingsArray.filter(item => findStyleCode(item.itemCode))
      : isSearching ? allListingsArray : listings;

    return sourceListings.filter(item => {
      if (allStylesActive && !showAll && !(item.totalQuantity > 0)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();

        // If 5 digits entered, search only in Item Code (Col M)
        if (isFiveDigitSearch) {
          return item.itemCode.toLowerCase().includes(q);
        }

        // Otherwise: Priority search Item Code (Col M), Cost (Col W), Brand (Col J)
        return (
          item.itemCode.toLowerCase().includes(q) ||
          (item.cost && item.cost.toString().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q))
        );
      }
      // If showAll is true, show everything
      if (showAll || allStylesActive) return true;

    // If showAll is false, show items with quantity > 0 OR special items (CONTINUOUS/D2)
      return item.totalQuantity > 0 || isSpecialItem(item);
    });
  }, [listings, searchQuery, showAll, isFiveDigitSearch, isSearching, allStylesActive, allListingsArray]);

  const styleCounts = useMemo(() => {
    const styles: Record<StyleGroup, Set<string>> = {
      marlon: new Set(),
      nonMarlon: new Set(),
      sm: new Set(),
    };
    baseListings.forEach(item => {
      getStyleGroups(item.itemCode).forEach(group => {
        styles[group].add(getStyleCode(item.itemCode));
      });
    });
    return {
      marlon: styles.marlon.size,
      nonMarlon: styles.nonMarlon.size,
      sm: styles.sm.size,
    };
  }, [baseListings]);

  const filteredListings = useMemo(() => (
    baseListings.filter(item => matchesStyleGroup(item.itemCode))
  ), [baseListings, matchesStyleGroup]);

  // Sorting logic - keeps "always at end" items at the bottom
  const sortedListings = useMemo(() => {
    if (allStylesActive) {
      return [...filteredListings].sort((a, b) =>
        getStyleCode(a.itemCode).localeCompare(getStyleCode(b.itemCode)) ||
        a.itemCode.localeCompare(b.itemCode)
      );
    }

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
  }, [filteredListings, sortField, sortDirection, allStylesActive]);

  // Calculate global totals for the sticky footer
  const globalTotals = useMemo(() => {
    const totals = {
      ALL: { pieces: 0, amount: 0 },
      MW: { pieces: 0, amount: 0 },
      LW: { pieces: 0, amount: 0 },
      CW: { pieces: 0, amount: 0 }
    };
    allListingsArray.forEach(item => {
      if (!matchesStyleGroup(item.itemCode)) return;
      const cat = item.mainCategory as 'MW' | 'LW' | 'CW';
      const q = item.totalQuantity || 0;
      const amt = q * (item.cost || 0);

      totals.ALL.pieces += q;
      totals.ALL.amount += amt;

      if (cat && totals[cat]) {
        totals[cat].pieces += q;
        totals[cat].amount += amt;
      }
    });
    return totals;
  }, [allListingsArray, matchesStyleGroup]);

  // Calculate active view totals for the chosen category / search
  const activeViewTotals = useMemo(() => {
    let pieces = 0;
    let amount = 0;
    filteredListings.forEach(item => {
      const q = item.totalQuantity || 0;
      const amt = q * (item.cost || 0);
      pieces += q;
      amount += amt;
    });
    return { pieces, amount };
  }, [filteredListings]);

  const handleMainCategoryChange = (cat: MainCategory) => {
    setAllStylesActive(false);
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
    <div className="min-h-screen bg-background flex flex-col relative">
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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showMarlon} onChange={e => setShowMarlon(e.target.checked)} className="accent-primary" />
                Marlon ({styleCounts.marlon})
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showNonMarlon} onChange={e => setShowNonMarlon(e.target.checked)} className="accent-primary" />
                Non-Marlon ({styleCounts.nonMarlon})
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showSm} onChange={e => setShowSm(e.target.checked)} className="accent-primary" />
                SM ({styleCounts.sm})
              </label>
            </div>

            {/* Desktop: Category Tabs + Sort on same row */}
            <div className="hidden sm:flex items-center gap-4">
              <CategoryTabs
                mainCategory={mainCategory}
                allStylesActive={allStylesActive}
                onAllStylesChange={() => setAllStylesActive(true)}
                activeSubCategory={activeSubCategory}
                subcategories={subcategories}
                onMainCategoryChange={handleMainCategoryChange}
                onSubCategoryChange={setActiveSubCategory}
              />

              {/* Sort Section */}
              {!allStylesActive && <div className="flex items-center gap-2 ml-auto">
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
              </div>}
            </div>

            {/* Mobile: Main Categories + Sort on one row */}
            <div className="flex sm:hidden items-center gap-4 min-w-0">
              <div className="min-w-0 overflow-x-auto no-scrollbar">
                <MainCategoryTabs
                  mainCategory={mainCategory}
                  allStylesActive={allStylesActive}
                  onAllStylesChange={() => setAllStylesActive(true)}
                  onMainCategoryChange={handleMainCategoryChange}
                />
              </div>

              {/* Sort Section */}
              {!allStylesActive && <div className="flex items-center gap-2 ml-auto shrink-0">
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
              </div>}
            </div>

            {/* Mobile: Subcategories on separate row */}
            {!allStylesActive && <div className="sm:hidden">
              <SubCategoryTabs
                activeSubCategory={activeSubCategory}
                subcategories={subcategories}
                onSubCategoryChange={setActiveSubCategory}
              />
            </div>}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1 pb-24">
        {/* Active subcategory breakdown / Search breakdown */}
        <div className="mb-4 flex flex-row items-center gap-2 text-sm md:text-base font-semibold text-muted-foreground">
          <span className="font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">
            {isSearching ? 'SEARCH RESULTS' : allStylesActive ? 'ALL STYLES' : `${mainCategory}-${activeSubCategory}`}:
          </span>
          <span className="text-foreground">{Math.round(activeViewTotals.pieces).toLocaleString()} pcs</span>
          <span className="text-muted-foreground">-</span>
          <span className="text-green-600 dark:text-green-400 font-bold">₱{Math.round(activeViewTotals.amount).toLocaleString()}</span>
        </div>

        <ListingGrid
          listings={sortedListings}
          isLoading={isAllStylesLoading || (!allStylesActive && (isLoading || isSearchLoading))}
          error={(allStylesActive ? allStylesError : error) as Error | null}
          showAll={showAll}
        />
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)]">
        <div className="container mx-auto px-2 py-3 md:px-4">
          <div className="flex flex-row flex-nowrap justify-start lg:justify-center items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap pb-1">
            {/* Top row: Main category totals */}
            <div className="flex flex-row items-center gap-1.5 shrink-0">
              <span className="text-primary font-bold">TOTAL:</span>
              <span className="text-foreground">{Math.round(globalTotals.ALL.pieces).toLocaleString()} pcs</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600 dark:text-green-400 font-bold">₱{Math.round(globalTotals.ALL.amount).toLocaleString()}</span>
            </div>
            <div className="w-px h-4 sm:h-5 bg-border shrink-0"></div>
            <div className="flex flex-row items-center gap-1.5 shrink-0">
              <span className="text-primary font-bold">MW:</span>
              <span className="text-foreground">{Math.round(globalTotals.MW.pieces).toLocaleString()} pcs</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600 dark:text-green-400">₱{Math.round(globalTotals.MW.amount).toLocaleString()}</span>
            </div>
            <div className="w-px h-4 sm:h-5 bg-border shrink-0"></div>
            <div className="flex flex-row items-center gap-1.5 shrink-0">
              <span className="text-primary font-bold">LW:</span>
              <span className="text-foreground">{Math.round(globalTotals.LW.pieces).toLocaleString()} pcs</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600 dark:text-green-400">₱{Math.round(globalTotals.LW.amount).toLocaleString()}</span>
            </div>
            <div className="w-px h-4 sm:h-5 bg-border shrink-0"></div>
            <div className="flex flex-row items-center gap-1.5 shrink-0">
              <span className="text-primary font-bold">CW:</span>
              <span className="text-foreground">{Math.round(globalTotals.CW.pieces).toLocaleString()} pcs</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-green-600 dark:text-green-400">₱{Math.round(globalTotals.CW.amount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </footer>

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

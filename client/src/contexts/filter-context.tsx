import { createContext, ReactNode, useState } from "react";
import { ListingCategory, ListingCondition, listingCategories } from "@shared/schema";

type ViewMode = "grid" | "list";
type SortOption = "newest" | "price_asc" | "price_desc";
type DistanceOption = "less_than_1" | "1_to_3" | "3_to_5" | "any";

interface FilterContextType {
  // View and sort options
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortOption;
  setSortBy: (option: SortOption) => void;
  
  // Category filter
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  
  // Advanced filters
  filters: {
    minPrice: string;
    maxPrice: string;
    conditions: string[];
    categories: string[];
    distance: DistanceOption;
  };
  setFilters: (filters: FilterContextType["filters"]) => void;
}

export const FilterContext = createContext<FilterContextType>({
  viewMode: "grid",
  setViewMode: () => {},
  sortBy: "newest",
  setSortBy: () => {},
  activeCategory: "All",
  setActiveCategory: () => {},
  filters: {
    minPrice: "",
    maxPrice: "",
    conditions: [],
    categories: [],
    distance: "any",
  },
  setFilters: () => {},
});

interface FilterProviderProps {
  children: ReactNode;
}

export function FilterProvider({ children }: FilterProviderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    conditions: [] as string[],
    categories: [] as string[],
    distance: "any" as DistanceOption,
  });

  return (
    <FilterContext.Provider
      value={{
        viewMode,
        setViewMode,
        sortBy,
        setSortBy,
        activeCategory,
        setActiveCategory,
        filters,
        setFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

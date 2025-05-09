import { createContext, ReactNode, useState } from "react";
import { 
  ListingCategory, 
  ListingCondition, 
  ListingType,
  itemCategories, 
  serviceCategories, 
  experienceCategories 
} from "@shared/schema";

type ViewMode = "grid" | "list";
type SortOption = "newest" | "price_asc" | "price_desc";
type DistanceOption = "less_than_1" | "1_to_3" | "3_to_5" | "any";

interface FilterContextType {
  // View and sort options
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortBy: SortOption;
  setSortBy: (option: SortOption) => void;
  
  // Listing type and category filters
  activeListingType: ListingType;
  setActiveListingType: (type: ListingType) => void;
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
  activeListingType: "item",
  setActiveListingType: () => {},
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
  const [activeListingType, setActiveListingType] = useState<ListingType>("item");
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
        activeListingType,
        setActiveListingType,
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

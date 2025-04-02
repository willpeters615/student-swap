import { useContext } from "react";
import { FilterContext } from "@/contexts/filter-context";
import type { SortOption } from "@/contexts/filter-context";
import { Filter, Grid2X2, List, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FilterSortBarProps {
  onOpenFilterModal: () => void;
}

export default function FilterSortBar({ onOpenFilterModal }: FilterSortBarProps) {
  const { user } = useAuth();
  const { 
    viewMode, 
    setViewMode, 
    sortBy, 
    setSortBy,
    hideMyListings,
    setHideMyListings
  } = useContext(FilterContext);

  return (
    <div className="bg-white border-b mb-4 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-4">
          <button 
            className="flex items-center text-sm text-gray-600 font-medium" 
            onClick={onOpenFilterModal}
          >
            <Filter className="h-5 w-5 mr-1" />
            Filters
          </button>
          
          {user && (
            <div className="flex items-center gap-2">
              {hideMyListings ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-my-listings"
                  checked={hideMyListings}
                  onCheckedChange={setHideMyListings}
                />
                <Label htmlFor="hide-my-listings" className="text-sm text-gray-600">
                  Hide my listings
                </Label>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 hidden sm:inline">View:</span>
          <button 
            className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-primary bg-opacity-10' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid2X2 className={`h-5 w-5 ${viewMode === 'grid' ? 'text-primary' : 'text-gray-500'}`} />
          </button>
          <button 
            className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-primary bg-opacity-10' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setViewMode('list')}
          >
            <List className={`h-5 w-5 ${viewMode === 'list' ? 'text-primary' : 'text-gray-500'}`} />
          </button>
        </div>
        
        <div className="relative">
          <select
            className="flex items-center text-sm text-gray-600 font-medium bg-transparent appearance-none pr-6 focus:outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useContext } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { Filter, Grid2X2, List } from "lucide-react";

interface FilterSortBarProps {
  onOpenFilterModal: () => void;
}

export default function FilterSortBar({ onOpenFilterModal }: FilterSortBarProps) {
  const { 
    viewMode, 
    setViewMode, 
    sortBy, 
    setSortBy 
  } = useContext(FilterContext);

  return (
    <div className="bg-white border-b mb-4 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <button 
          className="flex items-center text-sm text-gray-600 font-medium" 
          onClick={onOpenFilterModal}
        >
          <Filter className="h-5 w-5 mr-1" />
          Filters
        </button>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">View:</span>
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
            onChange={(e) => setSortBy(e.target.value)}
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

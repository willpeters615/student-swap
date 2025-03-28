import { useContext } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listingCategories } from "@shared/schema";

export default function CategoryFilters() {
  const { activeCategory, setActiveCategory } = useContext(FilterContext);

  return (
    <div className="bg-white border-b">
      <ScrollArea className="max-w-7xl mx-auto px-4 py-2 whitespace-nowrap">
        <div className="flex space-x-6">
          <button 
            className={`px-3 py-2 text-sm font-medium ${
              activeCategory === "All" 
                ? "text-primary border-b-2 border-primary" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveCategory("All")}
          >
            All Items
          </button>
          
          {listingCategories.map((category) => (
            <button 
              key={category}
              className={`px-3 py-2 text-sm font-medium ${
                activeCategory === category 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

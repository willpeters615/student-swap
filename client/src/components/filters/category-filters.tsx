import { useContext, useState } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  itemCategories, 
  serviceCategories, 
  experienceCategories, 
  getCategoriesByType, 
  ListingType 
} from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CategoryFilters() {
  const { activeCategory, setActiveCategory, activeListingType, setActiveListingType } = useContext(FilterContext);
  
  // Get the categories for the currently selected listing type
  const currentCategories = getCategoriesByType(activeListingType);

  const handleTypeChange = (value: string) => {
    setActiveListingType(value as ListingType);
    setActiveCategory("All"); // Reset category when changing type
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {/* Listing Type Tabs */}
        <Tabs value={activeListingType} onValueChange={handleTypeChange} className="mb-2">
          <TabsList>
            <TabsTrigger value="item">Items</TabsTrigger>
            <TabsTrigger value="service">Services</TabsTrigger>
            <TabsTrigger value="experience">Experiences</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Category Scrollable List */}
        <ScrollArea className="whitespace-nowrap">
          <div className="flex space-x-6">
            <button 
              className={`px-3 py-2 text-sm font-medium ${
                activeCategory === "All" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveCategory("All")}
            >
              All {activeListingType === "item" ? "Items" : 
                  activeListingType === "service" ? "Services" : "Experiences"}
            </button>
            
            {currentCategories.map((category) => (
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
    </div>
  );
}

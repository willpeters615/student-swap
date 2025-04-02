import { useContext, useRef, useState } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  itemCategories,
  serviceCategories,
  experienceCategories,
  getCategoriesByType,
  ListingType,
} from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export default function CategoryFilters() {
  const {
    activeCategory,
    setActiveCategory,
    activeListingType,
    setActiveListingType,
    hideOwnListings,
    setHideOwnListings,
  } = useContext(FilterContext);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(true);
  const { user } = useAuth();

  // Get the categories for the currently selected listing type
  const currentCategories = getCategoriesByType(activeListingType);

  const handleTypeChange = (value: string) => {
    setActiveListingType(value as ListingType);
    setActiveCategory("All"); // Reset category when changing type

    // Scroll to start when changing type
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);

    // Find the button element for this category and scroll it into view
    if (scrollContainerRef.current) {
      const buttons = scrollContainerRef.current.querySelectorAll("button");
      const index = ["All", ...currentCategories].findIndex(
        (c) => c === category,
      );

      if (index >= 0 && buttons[index]) {
        buttons[index].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-between items-center mb-2">
          {/* Listing Type Tabs */}
          <Tabs value={activeListingType} onValueChange={handleTypeChange}>
            <TabsList>
              <TabsTrigger value="item">Items</TabsTrigger>
              <TabsTrigger value="service">Services</TabsTrigger>
              <TabsTrigger value="experience">Experiences</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Hide Own Listings Toggle - Only show if user is logged in */}
          {user && (
            <div className="flex items-center space-x-2">
              <Switch
                id="hide-own-listings"
                checked={hideOwnListings}
                onCheckedChange={setHideOwnListings}
              />
              <Label
                htmlFor="hide-own-listings"
                className="text-sm flex items-center"
              >
                {hideOwnListings ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" /> Show all listings
                    (including mine){" "}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" /> Hide my listings
                  </>
                )}
              </Label>
            </div>
          )}
        </div>

        {/* Category Scrollable List with Scroll Indicators */}
        <div className="relative">
          {showScrollButtons && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-white hidden sm:flex items-center justify-center"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow-md hover:bg-white hidden sm:flex items-center justify-center"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <div
            className="overflow-x-auto scrollbar-hide"
            ref={scrollContainerRef}
          >
            <div className="flex space-x-6 py-2 px-2 min-w-max overflow-x-scroll touch-pan-x snap-x">
              <button
                className={`px-3 py-2 text-sm font-medium snap-start ${
                  activeCategory === "All"
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => handleCategoryClick("All")}
              >
                All{" "}
                {activeListingType === "item"
                  ? "Items"
                  : activeListingType === "service"
                    ? "Services"
                    : "Experiences"}
              </button>

              {currentCategories.map((category) => (
                <button
                  key={category}
                  className={`px-3 py-2 text-sm font-medium snap-start ${
                    activeCategory === category
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => handleCategoryClick(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Visual indicator for scrollable content with dot pagination */}
          <div className="mt-1 flex justify-center">
            <div className="flex space-x-1.5 px-2 py-1">
              {["All", ...currentCategories].map((category, index) => (
                <div
                  key={category}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeCategory === category
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

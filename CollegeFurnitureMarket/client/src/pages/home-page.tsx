import { useState } from "react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import CategoryFilters from "@/components/filters/category-filters";
import FilterSortBar from "@/components/filters/filter-sort-bar";
import ListingsGrid from "@/components/listings/listings-grid";
import FloatingButton from "@/components/common/floating-button";
import FilterModal from "@/components/filters/filter-modal";
import { FilterProvider } from "@/contexts/filter-context";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function HomePage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const searchQuery = searchParams.get("search");

  return (
    <FilterProvider>
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 pb-16 sm:pb-0">
          {searchQuery && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
              <Alert className="bg-primary/10 border-primary/20">
                <Search className="h-4 w-4" />
                <AlertTitle>Search Results</AlertTitle>
                <AlertDescription>
                  Showing results for: <span className="font-semibold">"{searchQuery}"</span>
                </AlertDescription>
              </Alert>
            </div>
          )}
          <CategoryFilters />
          <FilterSortBar onOpenFilterModal={() => setIsFilterModalOpen(true)} />
          <ListingsGrid />
          <FloatingButton />
        </main>

        <MobileNav />
        <FilterModal 
          isOpen={isFilterModalOpen} 
          onClose={() => setIsFilterModalOpen(false)} 
        />
      </div>
    </FilterProvider>
  );
}

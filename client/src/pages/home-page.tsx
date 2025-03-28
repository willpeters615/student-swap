import { useState } from "react";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import CategoryFilters from "@/components/filters/category-filters";
import FilterSortBar from "@/components/filters/filter-sort-bar";
import ListingsGrid from "@/components/listings/listings-grid";
import FloatingButton from "@/components/common/floating-button";
import FilterModal from "@/components/filters/filter-modal";
import { FilterProvider } from "@/contexts/filter-context";

export default function HomePage() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  return (
    <FilterProvider>
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 pb-16 sm:pb-0">
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

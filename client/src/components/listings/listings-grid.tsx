import { useMemo } from "react";
import ListingCard from "./listing-card";
import { useListings } from "@/hooks/use-listings";
import { Skeleton } from "@/components/ui/skeleton";
import { useContext } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ListingsGrid() {
  const { viewMode } = useContext(FilterContext);
  const { isLoading, listings, error, favorites } = useListings();

  const favoriteIds = useMemo(() => {
    return favorites?.map(fav => fav.listingId) || [];
  }, [favorites]);
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className={`grid ${viewMode === 'list' 
          ? 'grid-cols-1 gap-4' 
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
        }`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load listings. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <Alert>
          <AlertTitle>No results found</AlertTitle>
          <AlertDescription>
            Try adjusting your filters or search terms to find what you're looking for.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className={`grid ${viewMode === 'list' 
        ? 'grid-cols-1 gap-4' 
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'
      }`}>
        {listings.map((listing) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            isFavorite={favoriteIds.includes(listing.id)}
          />
        ))}
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useContext, useMemo } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { Listing, Favorite } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export function useListings() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const searchQuery = searchParams.get("search");
  const { user } = useAuth();
  const { 
    activeCategory,
    sortBy, 
    filters 
  } = useContext(FilterContext);

  // Get all listings
  const { data: allListings, isLoading: isListingsLoading, error: listingsError } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  // Get user's favorites if logged in
  const { data: favorites, isLoading: isFavoritesLoading } = useQuery<(Favorite & { listing?: Listing })[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Filter and sort listings based on search, category, and filters
  const listings = useMemo(() => {
    if (!allListings) return [];

    // Start with all listings
    let filteredListings = [...allListings];

    // Filter by category if not "All"
    if (activeCategory !== "All") {
      filteredListings = filteredListings.filter(
        listing => listing.category === activeCategory
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredListings = filteredListings.filter(
        listing => 
          listing.title.toLowerCase().includes(query) || 
          (listing.description && listing.description.toLowerCase().includes(query))
      );
    }

    // Apply price filters
    if (filters.minPrice && filters.maxPrice) {
      const min = parseInt(filters.minPrice);
      const max = parseInt(filters.maxPrice);
      
      if (!isNaN(min) && !isNaN(max)) {
        filteredListings = filteredListings.filter(
          listing => listing.price >= min && listing.price <= max
        );
      }
    } else if (filters.minPrice) {
      const min = parseInt(filters.minPrice);
      
      if (!isNaN(min)) {
        filteredListings = filteredListings.filter(
          listing => listing.price >= min
        );
      }
    } else if (filters.maxPrice) {
      const max = parseInt(filters.maxPrice);
      
      if (!isNaN(max)) {
        filteredListings = filteredListings.filter(
          listing => listing.price <= max
        );
      }
    }

    // Filter by conditions
    if (filters.conditions.length > 0) {
      filteredListings = filteredListings.filter(
        listing => filters.conditions.includes(listing.condition)
      );
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      filteredListings = filteredListings.filter(
        listing => filters.categories.includes(listing.category)
      );
    }

    // Sort listings
    switch (sortBy) {
      case "price_asc":
        return filteredListings.sort((a, b) => a.price - b.price);
      case "price_desc":
        return filteredListings.sort((a, b) => b.price - a.price);
      case "newest":
      default:
        return filteredListings.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, [allListings, activeCategory, searchQuery, filters, sortBy]);

  return {
    listings,
    isLoading: isListingsLoading || isFavoritesLoading,
    error: listingsError,
    favorites: favorites || [],
  };
}

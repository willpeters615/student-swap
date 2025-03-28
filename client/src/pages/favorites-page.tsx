import { useQuery, useMutation } from "@tanstack/react-query";
import { Favorite, Listing } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import ListingCard from "@/components/listings/listing-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Heart } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

interface FavoriteWithListing extends Favorite {
  listing: Listing;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [removingIds, setRemovingIds] = useState<number[]>([]);

  // Fetch user's favorites
  const {
    data: favorites,
    isLoading,
    error,
  } = useQuery<FavoriteWithListing[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (listingId: number) => {
      setRemovingIds(prev => [...prev, listingId]);
      await apiRequest("DELETE", `/api/favorites/${listingId}`);
    },
    onSuccess: () => {
      // Invalidate favorites query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removed from favorites",
        description: "The item has been removed from your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Action failed",
        description: "Could not remove from favorites. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (_, __, listingId) => {
      setRemovingIds(prev => prev.filter(id => id !== listingId));
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-16 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-16 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-500">Error loading favorites. Please try again later.</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-16 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">My Favorites</h1>
            <Card>
              <CardHeader>
                <CardTitle>No favorites yet</CardTitle>
                <CardDescription>
                  Start saving items you're interested in by clicking the heart icon
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Link href="/">
                  <Button>Browse Listings</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  const handleRemoveFavorite = (listingId: number) => {
    removeFavoriteMutation.mutate(listingId);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Favorites</h1>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <span className="font-medium">{favorites.length} items</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="relative">
                <ListingCard 
                  listing={favorite.listing} 
                  isFavorite={true}
                  onFavoriteToggle={() => handleRemoveFavorite(favorite.listing.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

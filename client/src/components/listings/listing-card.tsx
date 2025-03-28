import { Link } from "wouter";
import { useState } from "react";
import { Heart, MapPin } from "lucide-react";
import { Listing } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ListingCardProps {
  listing: Listing;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

export default function ListingCard({ listing, onFavoriteToggle, isFavorite = false }: ListingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFav, setIsFav] = useState(isFavorite);
  const { user } = useAuth();
  const { toast } = useToast();

  // Default image if none available
  const fallbackImage = "https://via.placeholder.com/300x225?text=No+Image+Available";
  
  const mainImage = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : fallbackImage;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save favorites",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isFav) {
        // Remove from favorites
        await apiRequest("DELETE", `/api/favorites/${listing.id}`);
        toast({
          title: "Removed from favorites",
          description: "This item has been removed from your favorites"
        });
      } else {
        // Add to favorites
        await apiRequest("POST", "/api/favorites", { listingId: listing.id });
        toast({
          title: "Added to favorites",
          description: "This item has been added to your favorites"
        });
      }
      
      setIsFav(!isFav);
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description: "Could not update favorites. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case "New":
        return "New condition";
      case "Like New":
        return "Like new condition";
      case "Good":
        return "Good condition";
      case "Fair":
        return "Fair condition";
      default:
        return condition;
    }
  };

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-white rounded-lg shadow overflow-hidden cursor-pointer h-full flex flex-col">
        <div className="relative pb-[75%]">
          <img 
            src={mainImage} 
            alt={listing.title} 
            className="absolute h-full w-full object-cover"
          />
          <button 
            className={`absolute top-2 right-2 p-1.5 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleFavoriteClick}
            disabled={isLoading}
          >
            <Heart 
              className={`h-5 w-5 ${isFav ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} 
            />
          </button>
        </div>
        <div className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900 truncate">{listing.title}</h3>
            <span className="font-bold text-primary">{formatCurrency(listing.price)}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{getConditionText(listing.condition)}</p>
          <div className="mt-2 flex items-center text-sm text-gray-500 mt-auto">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{listing.location || "On Campus"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

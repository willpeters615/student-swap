import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Listing } from "@shared/schema";
import ListingCard from "@/components/listings/listing-card";
import { CreateListingModal } from "@/components/listings/create-listing-modal";
import { useModal } from "@/hooks/use-modal";
import { LogOut, Mail, MapPin, Plus, School, User } from "lucide-react";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { isOpen, openModal, closeModal } = useModal();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Fetch user's listings
  const {
    data: listings,
    isLoading: isLoadingListings,
    error: listingsError,
    refetch: refetchListings,
  } = useQuery<Listing[]>({
    queryKey: [`/api/users/${user?.id}`],
    enabled: !!user,
    select: (data) => data.listings,
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async (id: number) => {
      setIsDeleting(id);
      await apiRequest("DELETE", `/api/listings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Listing deleted",
        description: "Your listing has been successfully deleted",
      });
      refetchListings();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete listing",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(null);
    },
  });

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteListing = (id: number) => {
    if (window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
      deleteListingMutation.mutate(id);
    }
  };

  // Format date
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pb-16 sm:pb-0">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Not Signed In</CardTitle>
                <CardDescription>Please sign in to view your profile</CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href="/auth">
                  <Button className="w-full">Sign In</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile info card */}
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src="" alt={user.username} />
                    <AvatarFallback className="text-2xl">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <CardDescription>Member since {formatDate(user.createdAt)}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <School className="h-4 w-4" />
                  <span>{user.university || "University not specified"}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>On Campus</span>
                </div>
                
                {user.verified && (
                  <Badge variant="outline" className="border-green-500 text-green-600 w-full justify-center">
                    Verified Student
                  </Badge>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <Skeleton className="h-4 w-4 rounded-full mr-2" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sign Out
                </Button>
              </CardFooter>
            </Card>
            
            {/* Listings tabs */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="listings">
                <div className="flex justify-between items-center mb-4">
                  <TabsList>
                    <TabsTrigger value="listings">My Listings</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                  </TabsList>
                  
                  <Button onClick={openModal} className="bg-accent hover:bg-accent/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Listing
                  </Button>
                </div>
                
                <TabsContent value="listings">
                  {isLoadingListings ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                          <div className="aspect-video">
                            <Skeleton className="h-full w-full" />
                          </div>
                          <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : listingsError ? (
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-red-500">Error loading your listings. Please try again.</p>
                      </CardContent>
                    </Card>
                  ) : !listings || listings.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No listings yet</h3>
                        <p className="text-gray-500 mb-4">Create your first listing to start selling</p>
                        <Button onClick={openModal} className="bg-accent hover:bg-accent/90 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Listing
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {listings.map((listing) => (
                        <Card key={listing.id} className="overflow-hidden">
                          <div className="relative aspect-video">
                            <img 
                              src={listing.images && listing.images.length > 0 
                                ? listing.images[0] 
                                : "https://via.placeholder.com/300x200?text=No+Image"
                              } 
                              alt={listing.title} 
                              className="w-full h-full object-cover"
                            />
                            <Badge 
                              className={`absolute top-2 right-2 ${
                                listing.status === "active" 
                                  ? "bg-green-500" 
                                  : "bg-gray-500"
                              }`}
                            >
                              {listing.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <CardHeader>
                            <CardTitle className="truncate">{listing.title}</CardTitle>
                            <CardDescription>
                              Listed on {formatDate(listing.createdAt)}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              asChild
                            >
                              <Link href={`/listings/${listing.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleDeleteListing(listing.id)}
                              disabled={isDeleting === listing.id}
                            >
                              {isDeleting === listing.id ? (
                                <Skeleton className="h-4 w-4 rounded-full mr-2" />
                              ) : (
                                "Delete"
                              )}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="stats">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Activity</CardTitle>
                      <CardDescription>
                        Overview of your marketplace activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="border rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-primary">
                            {listings?.length || 0}
                          </p>
                          <p className="text-sm text-gray-500">Active Listings</p>
                        </div>
                        <div className="border rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-primary">0</p>
                          <p className="text-sm text-gray-500">Completed Sales</p>
                        </div>
                        <div className="border rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-primary">
                            {listings && listings.length > 0 
                              ? new Date(Math.max(...listings.map(
                                  l => new Date(l.createdAt || 0).getTime()
                                ))).toLocaleDateString() 
                              : "-"
                            }
                          </p>
                          <p className="text-sm text-gray-500">Latest Activity</p>
                        </div>
                        <div className="border rounded-lg p-4 text-center">
                          <p className="text-3xl font-bold text-primary">
                            {user.verified ? "Yes" : "No"}
                          </p>
                          <p className="text-sm text-gray-500">Account Verified</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
      <CreateListingModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}

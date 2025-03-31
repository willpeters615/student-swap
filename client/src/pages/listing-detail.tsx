import { Link, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  AlignLeft,
  Tag,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Listing, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

type MessageFormData = z.infer<typeof messageSchema>;

export default function ListingDetail() {
  const [, params] = useRoute<{ id: string }>("/listings/:id");
  const listingId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Fetch listing data
  const { data, isLoading, error } = useQuery<ListingDetailData>({
    queryKey: [`/api/listings/${listingId}`],
    // Use the built-in queryFn for consistent handling
    enabled: !!listingId,
  });

  // Check if listing is in user's favorites
  const { data: favorites } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  useEffect(() => {
    if (favorites) {
      const isFav = favorites.some((fav) => fav.listingId === listingId);
      setIsFavorite(isFav);
    }
  }, [favorites, listingId]);

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${listingId}`);
        toast({
          title: "Removed from favorites",
          description: "This listing has been removed from your favorites",
        });
      } else {
        await apiRequest("POST", "/api/favorites", { listingId });
        toast({
          title: "Added to favorites",
          description: "This listing has been added to your favorites",
        });
      }
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] }); //Restored query invalidation
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Send message mutation - restored from original
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const message = {
        receiverId: data?.owner.id,
        listingId,
        content,
      };
      await apiRequest("POST", "/api/messages", message);
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent to the seller",
      });
      form.reset();
      setIsMessageModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmitMessage = (formData: MessageFormData) => {
    sendMessageMutation.mutate(formData.content);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">Loading...</div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (error || !data || !data.listing || !data.owner) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to listings
            </Button>
          </Link>
          <Card className="p-8 text-center">
            <CardContent>
              <h1 className="text-2xl font-bold text-red-500 mb-4">
                Error Loading Listing
              </h1>
              <p className="text-gray-600 mb-6">
                {error instanceof Error
                  ? error.message
                  : "This listing could not be found or has been removed"}
              </p>
              <Link href="/">
                <Button>Browse other listings</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <MobileNav />
      </div>
    );
  }

  const { listing, owner } = data;
  const fallbackImage =
    "http://fakeimage.fly.dev/243x350.gif?color=darkorchid2&textcolor=!B9AF55";
  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [fallbackImage];
  const isOwner = user?.id === owner.id;

  const formatDate = (date: string | Date | null) => {
    //Restored type
    if (!date) return "Unknown date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-16 sm:pb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listings
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Listing details */}
          <div className="lg:col-span-2">
            {/* Image carousel */}
            <Carousel className="w-full mb-8">
              <CarouselContent>
                {images.map((image: string, index: number) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-video overflow-hidden rounded-lg">
                      <img
                        src={image}
                        alt={`${listing.title} - image ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>

            {/* Listing title and price */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {listing.title}
              </h1>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(listing.price)}
              </div>
            </div>

            {/* Listing metadata */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Badge
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <Tag className="h-4 w-4" />
                {listing.condition}
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <MapPin className="h-4 w-4" />
                {listing.location || "On Campus"}
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <Calendar className="h-4 w-4" />
                {formatDate(listing.createdAt)}
              </Badge>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold flex items-center mb-2">
                <AlignLeft className="h-5 w-5 mr-2" />
                Description
              </h2>
              <p className="text-gray-700 whitespace-pre-line">
                {listing.description || "No description provided."}
              </p>
            </div>

            {/* Category */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Category</h2>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                {listing.category}
              </Badge>
            </div>
          </div>

          {/* Right column - Seller info and actions */}
          <div>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Seller Information
                </h2>
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" alt={owner.username} />
                    <AvatarFallback>
                      {owner.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{owner.username}</p>
                    <p className="text-sm text-gray-500">{owner.university}</p>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-500 mb-6">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Member since {formatDate(owner.createdAt)}</span>
                </div>

                <Separator className="mb-6" />

                {!isOwner ? (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => setIsMessageModalOpen(true)}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message Seller
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={toggleFavorite}
                      disabled={isTogglingFavorite}
                    >
                      {isTogglingFavorite ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Heart
                          className={`mr-2 h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
                        />
                      )}
                      {isFavorite ? "Saved to Favorites" : "Save to Favorites"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    This is your listing
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Safety Tips</h2>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>• Meet in a public place on campus</li>
                  <li>• Do not share personal financial information</li>
                  <li>• Check the item before making payment</li>
                  <li>• Trust your instincts</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MobileNav />

      {/* Message modal - restored from original */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message to {owner.username}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitMessage)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={`Hi ${owner.username}, I'm interested in your "${listing.title}"...`}
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMessageModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMessageMutation.isPending}>
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ListingDetailData {
  //Restored interface
  listing: Listing;
  owner: Omit<User, "password">;
}

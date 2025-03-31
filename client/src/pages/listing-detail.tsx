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
  Edit,
  Save,
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Listing, User, listingTypes, listingConditions, getCategoriesByType, ListingType } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
});

const editListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(listingTypes),
  price: z.number().min(1, "Price must be at least 1"),
  category: z.string().min(1, "Please select a category"),
  condition: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  date: z.string().optional(),
  duration: z.string().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;
type EditListingFormData = z.infer<typeof editListingSchema>;

export default function ListingDetail() {
  const [, params] = useRoute<{ id: string }>("/listings/:id");
  const listingId = params?.id ? parseInt(params.id) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [selectedListingType, setSelectedListingType] = useState<ListingType>("item");
  const [currentCategories, setCurrentCategories] = useState<readonly string[]>([]);

  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });
  
  // Edit listing form
  const editForm = useForm<EditListingFormData>({
    resolver: zodResolver(editListingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      condition: "",
      category: "",
      type: "item",
      location: "",
      images: [],
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

  // Initialize the edit form with the listing data when opened
  useEffect(() => {
    if (isEditModalOpen && data?.listing) {
      const currentListing = data.listing;
      editForm.reset({
        title: currentListing.title,
        description: currentListing.description || "",
        price: currentListing.price,
        condition: currentListing.condition || "",
        category: currentListing.category,
        type: currentListing.type as ListingType,
        location: currentListing.location || "",
        images: currentListing.images || [],
        date: currentListing.date ? String(currentListing.date) : "",
        duration: currentListing.duration || "",
      });
      
      setSelectedListingType(currentListing.type as ListingType);
      setCurrentCategories(getCategoriesByType(currentListing.type as ListingType));
    }
  }, [isEditModalOpen, data, editForm]);
  
  // Update categories when listing type changes in the edit form
  useEffect(() => {
    setCurrentCategories(getCategoriesByType(selectedListingType));
    
    // Reset the category field when type changes
    if (editForm.getValues("type") !== selectedListingType) {
      editForm.setValue("category", "");
    }
    
    // Update the type field
    editForm.setValue("type", selectedListingType);
    
    // Reset condition field when not an item
    if (selectedListingType !== "item") {
      editForm.setValue("condition", "");
    }
  }, [selectedListingType, editForm]);
  
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
  
  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async (data: EditListingFormData) => {
      await apiRequest("PUT", `/api/listings/${listingId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Listing updated",
        description: "Your listing has been updated successfully",
      });
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update listing",
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
                  <div className="space-y-3">
                    <Button 
                      className="w-full"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Listing
                    </Button>
                    <Button variant="outline" className="w-full" disabled>
                      This is your listing
                    </Button>
                  </div>
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
      
      {/* Edit Listing Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>
              Update your listing details. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          {/* Listing Type Tabs */}
          <div className="mb-4">
            <div className="mb-2 block text-sm font-medium">What are you offering?</div>
            <Tabs 
              value={selectedListingType} 
              onValueChange={(value) => setSelectedListingType(value as ListingType)}
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="item">Item</TabsTrigger>
                <TabsTrigger value="service">Service</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Form {...editForm}>
            <form 
              onSubmit={editForm.handleSubmit((data) => updateListingMutation.mutate(data))} 
              className="space-y-6"
            >
              {/* Title Field */}
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter listing title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your listing in detail" 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Include details about condition, features, and why someone might want this.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Field */}
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        min={0} 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Field */}
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Condition Field - Only for Items */}
              {selectedListingType === "item" && (
                <FormField
                  control={editForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {listingConditions.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Location Field */}
              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="On Campus" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Where on campus can people find or meet you?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Duration Fields - Only for Services/Experiences */}
              {(selectedListingType === "service" || selectedListingType === "experience") && (
                <>
                  <FormField
                    control={editForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          When is this service or experience available?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2 hours, 45 minutes" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          How long does this service or experience last?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateListingMutation.isPending}>
                  {updateListingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
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

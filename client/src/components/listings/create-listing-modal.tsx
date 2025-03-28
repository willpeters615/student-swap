import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  insertListingSchema, 
  itemCategories, 
  serviceCategories, 
  experienceCategories, 
  listingTypes,
  listingConditions,
  getCategoriesByType,
  ListingType
} from "@shared/schema";
import { 
  Loader2, 
  Upload, 
  XCircle, 
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 5;

const createListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(listingTypes),
  price: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Price must be a number",
  }),
  category: z.string().min(1, "Please select a category"),
  // Condition is only required for items
  condition: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().optional(),
  // These fields are used for services and experiences
  date: z.date().optional(),
  duration: z.string().optional(),
});

type CreateListingFormData = z.infer<typeof createListingSchema>;

export function CreateListingModal({ isOpen, onClose }: CreateListingModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedListingType, setSelectedListingType] = useState<ListingType>("item");
  const [currentCategories, setCurrentCategories] = useState<readonly string[]>(itemCategories);

  const form = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      type: "item",
      price: "",
      category: "",
      condition: "",
      description: "",
      location: "On Campus",
    },
  });
  
  // Update categories when listing type changes
  useEffect(() => {
    setCurrentCategories(getCategoriesByType(selectedListingType));
    // Reset the category field when type changes
    form.setValue("category", "");
    
    // Reset condition field when not an item
    if (selectedListingType !== "item") {
      form.setValue("condition", "");
    }
  }, [selectedListingType, form]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if max image count would be exceeded
    if (uploadedImages.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${MAX_IMAGES} images.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const promises: Promise<string>[] = [];

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum size is 10MB.`,
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} has an unsupported file type.`,
          variant: "destructive",
        });
        return;
      }

      // In a real app, we would upload the file to a server here.
      // For this demo, we'll just convert to base64 and store locally.
      const promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === "string") {
            resolve(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      });

      promises.push(promise);
    });

    Promise.all(promises)
      .then((newImages) => {
        setUploadedImages((prev) => [...prev, ...newImages]);
      })
      .catch((error) => {
        console.error("Error uploading images:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload images. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsUploading(false);
        // Reset file input
        e.target.value = "";
      });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CreateListingFormData) => {
    try {
      setIsSubmitting(true);

      // Format data for API based on type
      const baseListingData = {
        title: data.title,
        price: parseInt(data.price),
        category: data.category,
        type: data.type,
        description: data.description,
        location: data.location || "On Campus",
        images: uploadedImages,
      };

      // Add type-specific fields based on listing type
      let listingData;
      if (data.type === "item" && data.condition) {
        // For furniture items
        listingData = {
          ...baseListingData,
          condition: data.condition
        };
      } else if ((data.type === "service" || data.type === "experience") && data.date) {
        // For services/experiences
        listingData = {
          ...baseListingData,
          date: data.date,
          duration: data.duration || ""
        };
      } else {
        listingData = baseListingData;
      }

      // Submit to API
      await apiRequest("POST", "/api/listings", listingData);

      // Show success message
      toast({
        title: "Listing created",
        description: `Your ${data.type} listing has been created successfully.`,
      });

      // Invalidate listings query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });

      // Reset form and close modal
      form.reset();
      setUploadedImages([]);
      setSelectedListingType("item");
      onClose();
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error creating listing",
        description: "Could not create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <DialogDescription>
            List items, services, or experiences for your university community.
          </DialogDescription>
        </DialogHeader>

        {/* Listing Type Tabs */}
        <div className="mb-4">
          <FormLabel className="mb-2 block">What are you offering?</FormLabel>
          <Tabs 
            value={selectedListingType} 
            onValueChange={(value) => {
              setSelectedListingType(value as ListingType);
              form.setValue("type", value as ListingType);
            }}
          >
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="item">Item</TabsTrigger>
              <TabsTrigger value="service">Service</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. IKEA desk chair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {selectedListingType === "item" && (
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        selectedListingType === "item" 
                          ? "Describe your item (age, dimensions, any damages, etc.)"
                          : selectedListingType === "service"
                            ? "Describe the service you're offering (your experience, what's included, etc.)"
                            : "Describe this experience (what's included, requirements, etc.)"
                      }
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. North Campus, Dorm Building"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date field for services and experiences */}
            {selectedListingType !== "item" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={selectedListingType === "service" ? "e.g. 1 hour" : "e.g. 3 hours"}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div>
              <FormLabel>Photos (up to 5)</FormLabel>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none"
                    >
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading || uploadedImages.length >= MAX_IMAGES}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  {isUploading && (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-xs">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>

              {uploadedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Uploaded preview ${index}`}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-white rounded-full"
                      >
                        <XCircle className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Listing"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

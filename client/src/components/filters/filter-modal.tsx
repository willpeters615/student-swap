import { useContext, useState } from "react";
import { FilterContext } from "@/contexts/filter-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { listingConditions, listingCategories } from "@shared/schema";
import { X } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
  const { filters, setFilters } = useContext(FilterContext);
  
  const [localFilters, setLocalFilters] = useState({
    minPrice: filters.minPrice || "",
    maxPrice: filters.maxPrice || "",
    conditions: [...filters.conditions],
    categories: [...filters.categories],
    distance: filters.distance || "any"
  });

  const handleApply = () => {
    setFilters({
      minPrice: localFilters.minPrice,
      maxPrice: localFilters.maxPrice,
      conditions: localFilters.conditions,
      categories: localFilters.categories,
      distance: localFilters.distance
    });
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      minPrice: "",
      maxPrice: "",
      conditions: [],
      categories: [],
      distance: "any"
    });
  };

  const toggleCondition = (condition: string) => {
    setLocalFilters(prev => {
      if (prev.conditions.includes(condition)) {
        return {
          ...prev,
          conditions: prev.conditions.filter(c => c !== condition)
        };
      } else {
        return {
          ...prev,
          conditions: [...prev.conditions, condition]
        };
      }
    });
  };

  const toggleCategory = (category: string) => {
    setLocalFilters(prev => {
      if (prev.categories.includes(category)) {
        return {
          ...prev,
          categories: prev.categories.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, category]
        };
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl sm:max-w-md sm:rounded-lg">
        <SheetHeader className="flex-row items-center justify-between border-b pb-4">
          <SheetTitle>Filters</SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </SheetHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium">Price Range</h4>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label className="text-sm text-gray-600">Min ($)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  min={0}
                  value={localFilters.minPrice} 
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-gray-600">Max ($)</Label>
                <Input 
                  type="number" 
                  placeholder="1000" 
                  min={0}
                  value={localFilters.maxPrice} 
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Condition</h4>
            <div className="space-y-2">
              {listingConditions.map((condition) => (
                <Label key={condition} className="flex items-center space-x-2">
                  <Checkbox 
                    checked={localFilters.conditions.includes(condition)} 
                    onCheckedChange={() => toggleCondition(condition)}
                  />
                  <span>{condition}</span>
                </Label>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Category</h4>
            <div className="grid grid-cols-2 gap-2">
              {listingCategories.map((category) => (
                <Label key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    checked={localFilters.categories.includes(category)} 
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </Label>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Distance</h4>
            <RadioGroup 
              value={localFilters.distance} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, distance: value }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="less_than_1" id="less_than_1" />
                <Label htmlFor="less_than_1">Less than 1 mile</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1_to_3" id="1_to_3" />
                <Label htmlFor="1_to_3">1-3 miles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3_to_5" id="3_to_5" />
                <Label htmlFor="3_to_5">3-5 miles</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any" />
                <Label htmlFor="any">Any distance</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <SheetFooter className="flex-row gap-4 sm:space-x-0">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Reset
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleApply}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

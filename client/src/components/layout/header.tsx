import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useModal } from "@/hooks/use-modal";
import { AuthModal } from "@/components/auth/auth-modal";
import { CreateListingModal } from "@/components/listings/create-listing-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Heart, Search, LogOut, User, Home } from "lucide-react";

export default function Header() {
  const [location, setLocation] = useState("/");
  const { user, logoutMutation } = useAuth();
  const { isOpen: isAuthOpen, openModal: openAuthModal, closeModal: closeAuthModal } = useModal();
  const { isOpen: isCreateOpen, openModal: openCreateModal, closeModal: closeCreateModal } = useModal();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      setLocation("/auth");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation(`/?search=${encodeURIComponent(searchQuery)}`);
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <span className="text-primary font-bold text-xl cursor-pointer">CampusSwap</span>
            </Link>
          </div>
          
          {/* Search Bar (Desktop) */}
          <div className="hidden sm:flex items-center flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input 
                type="text" 
                placeholder="Search furniture..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              <button type="submit" className="sr-only">Search</button>
            </form>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:items-center">
            {user ? (
              <>
                <Link href="/">
                  <Home className="h-6 w-6 text-gray-600 hover:text-primary transition-colors mx-3 cursor-pointer" />
                </Link>
                <Link href="/messages">
                  <MessageCircle className="h-6 w-6 text-gray-600 hover:text-primary transition-colors mx-3 cursor-pointer" />
                </Link>
                <Link href="/favorites">
                  <Heart className="h-6 w-6 text-gray-600 hover:text-primary transition-colors mx-3 cursor-pointer" />
                </Link>
                <div className="relative ml-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" alt={user.username} />
                          <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button className="ml-4 bg-primary hover:bg-primary/90 text-white" onClick={openCreateModal}>
                  Create Listing
                </Button>
              </>
            ) : (
              <Button className="ml-4" onClick={openAuthModal}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="w-full relative">
          <input 
            type="text" 
            placeholder="Search furniture..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          <button type="submit" className="sr-only">Search</button>
        </form>
      </div>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={closeAuthModal} />
      <CreateListingModal isOpen={isCreateOpen} onClose={closeCreateModal} />
    </header>
  );
}

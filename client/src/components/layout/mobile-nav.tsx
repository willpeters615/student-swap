import { Link, useLocation } from "wouter";
import { Home, Search, MessageCircle, Heart, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t shadow">
      <div className="flex justify-around items-center h-16">
        <Link href="/">
          <div className={`flex flex-col items-center ${isActive("/") ? "text-primary" : "text-gray-500"}`}>
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </div>
        </Link>
        <Link href="/?search=true">
          <div className={`flex flex-col items-center ${location.includes("search") ? "text-primary" : "text-gray-500"}`}>
            <Search className="h-6 w-6" />
            <span className="text-xs mt-1">Search</span>
          </div>
        </Link>
        <Link href="/messages">
          <div className={`flex flex-col items-center ${isActive("/messages") ? "text-primary" : "text-gray-500"}`}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs mt-1">Messages</span>
          </div>
        </Link>
        <Link href="/favorites">
          <div className={`flex flex-col items-center ${isActive("/favorites") ? "text-primary" : "text-gray-500"}`}>
            <Heart className="h-6 w-6" />
            <span className="text-xs mt-1">Favorites</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`flex flex-col items-center ${isActive("/profile") ? "text-primary" : "text-gray-500"}`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

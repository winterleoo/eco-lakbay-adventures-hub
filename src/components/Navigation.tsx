import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import SignInModal from "./SignInModal";
import JoinUsModal from "./JoinUsModal";
import { LogOut, User, Settings, Shield, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isJoinUsOpen, setIsJoinUsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [hasDestinations, setHasDestinations] = useState(false);

  const isSuperAdmin = user?.email === 'johnleomedina@gmail.com' && isAdmin;

    const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Even if an error occurs, we still want to log the user out client-side.
        // We can show a toast for debugging but should still proceed.
        console.error("Error during sign out:", error);
        toast({
          title: "Logout Error",
          description: "Could not contact the server, but you have been logged out locally.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
    } finally {
      // This part ALWAYS runs, whether there was an error or not.
      // This ensures the user is redirected to the home page after logging out.
      navigate("/");
    }
  };

  useEffect(() => {
    setHasDestinations(false);
    if (user) {
      const checkUserDestinations = async () => {
        const { data } = await supabase.from('destinations').select('id').eq('owner_id', user.id).limit(1);
        if (data && data.length > 0) {
          setHasDestinations(true);
        }
      };
      checkUserDestinations();
    }
  }, [user]);

  const handleSignIn = () => setIsSignInOpen(true);
  const handleJoinUs = () => setIsJoinUsOpen(true);

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Destinations", path: "/destinations" },
    { label: "Community", path: "/community" },
    { label: "Calculator", path: "/calculator" },
    { label: "Register Destination", path: "/register-destination" },
  ];

  return (
    <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/f91ba406-163e-4e12-ab08-1481effe6d76.png" 
              alt="EcoLakbay Logo" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="text-foreground hover:text-forest transition-colors duration-200">
                {item.label}
              </Link>
            ))}
          </div>

          {/* --- THIS IS THE FIX: A single container for auth/menu buttons --- */}
          <div className="flex items-center">
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Avatar className="w-6 h-6 mr-2"><AvatarImage src={user.user_metadata?.avatar_url} /><AvatarFallback className="text-xs">{user.email?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/account")}><User className="w-4 h-4 mr-2" />Account Settings</DropdownMenuItem>
                    {hasDestinations && (<DropdownMenuItem onClick={() => navigate("/my-destinations")}><MapPin className="w-4 h-4 mr-2" />My Destinations</DropdownMenuItem>)}
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}><Settings className="w-4 h-4 mr-2" />Dashboard</DropdownMenuItem>
                    {isSuperAdmin && (<DropdownMenuItem onClick={() => navigate("/super-admin")}><Shield className="w-4 h-4 mr-2" />Super Admin</DropdownMenuItem>)}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleSignIn}>Sign In</Button>
                  <Button variant="eco" size="sm" onClick={handleJoinUs}>Join Us</Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden ml-4" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {/* This is a standard accessible hamburger menu icon */}
              <span className="sr-only">Open main menu</span>
              <div className="w-6 h-6 flex flex-col justify-around">
                <span className={`block h-0.5 w-full bg-foreground transition-transform duration-300 ${isMenuOpen ? "rotate-45 translate-y-[5px]" : ""}`} />
                <span className={`block h-0.5 w-full bg-foreground transition-opacity duration-300 ${isMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 w-full bg-foreground transition-transform duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} className="px-4 py-2 rounded-md hover:bg-muted" onClick={() => setIsMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <div className="border-t my-2 mx-4"></div>
              <div className="flex flex-col space-y-2 px-4">
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => {navigate("/account"); setIsMenuOpen(false);}}><User className="w-4 h-4 mr-2" /> Account</Button>
                    {hasDestinations && (<Button variant="ghost" size="sm" className="justify-start" onClick={() => {navigate("/my-destinations"); setIsMenuOpen(false);}}><MapPin className="w-4 h-4 mr-2" /> My Destinations</Button>)}
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => {navigate("/dashboard"); setIsMenuOpen(false);}}><Settings className="w-4 h-4 mr-2" /> Dashboard</Button>
                    {isSuperAdmin && (<Button variant="ghost" size="sm" className="justify-start" onClick={() => {navigate("/super-admin"); setIsMenuOpen(false);}}><Shield className="w-4 h-4 mr-2" /> Super Admin</Button>)}
                    <Button variant="outline" size="sm" onClick={() => {signOut(); setIsMenuOpen(false);}}><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
                  </>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {handleSignIn(); setIsMenuOpen(false);}}>Sign In</Button>
                    <Button variant="eco" size="sm" className="flex-1" onClick={() => {handleJoinUs(); setIsMenuOpen(false);}}>Join Us</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <SignInModal open={isSignInOpen} onOpenChange={setIsSignInOpen} />
      <JoinUsModal open={isJoinUsOpen} onOpenChange={setIsJoinUsOpen} />
    </nav>
  );
};

export default Navigation;

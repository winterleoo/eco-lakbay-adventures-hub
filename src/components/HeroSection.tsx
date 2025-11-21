import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/bg.jpg";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import TripPlannerModal from "./TripPlannerModal";

const HeroSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tripPlannerOpen, setTripPlannerOpen] = useState(false);

  const handleExploreDestinations = () => {
    navigate("/destinations");
  };

  const handlePlanTrip = () => {
    setTripPlannerOpen(true);
  };
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-forest/80 via-forest/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Discover
              <span className="block text-amber bg-gradient-accent bg-clip-text text-transparent">
                Sustainable
              </span>
              Adventures
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed">
              Explore Pampanga's beauty while protecting the environment. 
              Earn Green Points, reduce your carbon footprint, and connect with local communities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="eco" size="lg" className="text-lg px-8 py-6" onClick={handleExploreDestinations}>
                Explore Destinations
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white hover:bg-white hover:text-forest" onClick={handlePlanTrip}>
                Plan Your Trip
              </Button>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-eco hover:shadow-hover transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🌱</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-forest">Carbon Calculator</h3>
                  <p className="text-muted-foreground">Calculate your trip's environmental impact</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-eco hover:shadow-hover transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">🏆</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-forest">Green Points</h3>
                  <p className="text-muted-foreground">Earn rewards for sustainable choices</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-eco hover:shadow-hover transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-forest">Community</h3>
                  <p className="text-muted-foreground">Connect with eco-conscious travelers</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      <TripPlannerModal 
        open={tripPlannerOpen} 
        onOpenChange={setTripPlannerOpen} 
      />
    </div>
  );
};

export default HeroSection;

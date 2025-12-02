import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Map, Leaf } from "lucide-react";

const steps = [
  {
    icon: <Search className="w-8 h-8 text-forest" />,
    title: "1. Discover",
    description: "Explore our curated list of destinations, handpicked for their commitment to sustainability and community.",
  },
  {
    icon: <Map className="w-8 h-8 text-forest" />,
    title: "2. Plan Your Trip",
    description: "Use our tools to plan your itinerary and calculate your trip's carbon footprint, helping you make informed, green choices.",
  },
  {
    icon: <Leaf className="w-8 h-8 text-forest" />,
    title: "3. Travel Sustainably",
    description: "Journey with confidence, knowing you're supporting local economies and preserving the natural beauty of the Philippines.",
  },
];

const HowItWorks = () => {
  return (
    // Note the `bg-muted` for visual separation
    <section className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-forest mb-4">
            A Greener Journey in 3 Simple Steps
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We make sustainable travel easy, transparent, and rewarding.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="text-center">
              <div className="flex items-center justify-center h-16 w-16 bg-white rounded-full mx-auto mb-6 shadow-md">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-forest mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const Calculator = () => {
  const [transportation, setTransportation] = useState("");
  const [distance, setDistance] = useState("");
  const [carbonFootprint, setCarbonFootprint] = useState(null);

  const calculateCarbon = () => {
    const dist = parseFloat(distance) || 0;
    let total = 0;

    // --- EMISSION FACTORS (in kg CO₂e per km) ---
    const emissionFactors = {
      car: 0.17,
      bus: 0.10,
      motorcycle: 0.11,
      tricycle: 0.11,
      jeepney: 0.08,
      bike: 0,
      walking: 0,
    };

    // --- Correct Calculation ---
    if (emissionFactors.hasOwnProperty(transportation)) {
      total = dist * emissionFactors[transportation];
    } else {
      total = 0; // default to 0 if invalid selection
    }

    setCarbonFootprint(total);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header Section */}
      <div className="bg-gradient-hero py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Carbon Footprint Calculator
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Estimate the total carbon emissions of your trip and discover
            eco-friendly travel alternatives.
          </p>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Form */}
            <Card className="shadow-eco">
              <CardHeader>
                <CardTitle className="text-2xl text-forest">
                  Trip Calculator
                </CardTitle>
                <p className="text-muted-foreground">
                  Enter your travel details to calculate total carbon emissions
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transportation Method */}
                <div>
                  <Label htmlFor="transportation" className="text-forest font-medium">
                    Transportation Method
                  </Label>
                  <Select
                    value={transportation}
                    onValueChange={setTransportation}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select transportation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walking">Walking 🚶‍♂️</SelectItem>
                      <SelectItem value="bike">Bicycle 🚲</SelectItem>
                      <SelectItem value="jeepney">Jeepney 🚌</SelectItem>
                      <SelectItem value="tricycle">Tricycle 🛺</SelectItem>
                      <SelectItem value="bus">Public Bus 🚍</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle 🏍️</SelectItem>
                      <SelectItem value="car">Private Car 🚗</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div>
                  <Label htmlFor="distance" className="text-forest font-medium">
                    Total Distance (km)
                  </Label>
                  <Input
                    id="distance"
                    type="number"
                    placeholder="Enter distance"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Calculate Button */}
                <Button
                  onClick={calculateCarbon}
                  className="w-full"
                  variant="eco"
                  size="lg"
                >
                  Calculate Total Emissions
                </Button>
              </CardContent>
            </Card>

            {/* Results & Tips Section */}
            <div className="space-y-6">
              {/* Results */}
              {carbonFootprint !== null && carbonFootprint > 0 && (
                <Card className="shadow-eco">
                  <CardHeader>
                    <CardTitle className="text-2xl text-forest">
                      Your Trip’s Total Estimated Carbon Emissions for a Single Person
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-5xl mb-2">🌍</div>
                      <div className="text-4xl font-bold text-amber-600 mb-2">
                        {carbonFootprint.toFixed(2)} kg CO₂e
                      </div>
                      <p className="text-muted-foreground mb-4">
                        This represents the total estimated greenhouse gas
                        emissions from your entire trip.
                      </p>

                      <div
                        className={`p-3 rounded-lg mb-2 ${
                          carbonFootprint < 20
                            ? "bg-green-100 border border-green-200"
                            : carbonFootprint < 60
                            ? "bg-yellow-100 border border-yellow-200"
                            : "bg-red-100 border border-red-200"
                        }`}
                      >
                        <div className="font-semibold mb-1">
                          {carbonFootprint < 20
                            ? "🌿 Low Emission Trip"
                            : carbonFootprint < 60
                            ? "⚠️ Moderate Impact"
                            : "🔥 High Emission Trip"}
                        </div>
                        <div className="text-sm">
                          {carbonFootprint < 20
                            ? "Great job! Your travel has minimal environmental impact."
                            : carbonFootprint < 60
                            ? "Consider more sustainable transportation next time."
                            : "This trip emits a large amount of CO₂. Try eco-friendlier travel modes."}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Special Message for Zero Emission */}
              {carbonFootprint === 0 && transportation && (
                <Card className="shadow-eco">
                  <CardHeader>
                    <CardTitle className="text-2xl text-green-700">
                      🌿 Zero Emission Trip!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-muted-foreground">
                    <p>
                      Great choice! Walking or biking produces no carbon
                      emissions and contributes to a healthier planet.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Eco-Friendly Tips */}
              <Card className="shadow-eco">
                <CardHeader>
                  <CardTitle className="text-xl text-forest">
                    Eco-Friendly Travel Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>🚲 Choose bikes or public transport when possible.</li>
                    <li>🌿 Combine trips to reduce total travel distance.</li>
                    <li>🚌 Share rides with others to minimize emissions per trip.</li>
                    <li>♻️ Offset your carbon emissions through tree planting or donations.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Calculator;

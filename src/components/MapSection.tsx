// src/components/MapSection.tsx

import { useEffect, useRef } from "react";

// 1. Tell TypeScript that mapboxgl exists on the window object
declare global {
  interface Window {
    mapboxgl: any;
  }
}

const MapSection = () => {
  // Ref for the HTML element where the map will be drawn
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Ref to hold the actual map instance (prevents double renders)
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Safety check: If mapbox hasn't loaded or map is already initialized, stop.
    if (!window.mapboxgl || mapInstanceRef.current || !mapContainerRef.current) {
      return;
    }

    // 2. Access token (Still better to use env vars, but kept hardcoded as requested)
    window.mapboxgl.accessToken = "pk.eyJ1Ijoic2Vhbm1nY2xzIiwiYSI6ImNtaDA3aXloeTB5ZHoyam9qMGQwcWMwODMifQ.HF3buxwFOgazG8Z2j61b7g";

    // 3. Initialize the map
    mapInstanceRef.current = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [120.68, 15.08], // Centered nicely on Pampanga
      zoom: 9,
    });

    // Add navigation controls (zoom in/out buttons)
    mapInstanceRef.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

    // 4. CLEANUP FUNCTION (Very Important in React!)
    // This runs when the component unmounts (user leaves the page)
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <section className="relative py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-forest">
          Explore Sustainable Destinations
        </h2>
        <p className="text-lg text-gray-600 mt-2">
          Discover eco-certified spots across Pampanga and the Philippines.
        </p>
      </div>

      {/* 5. The map container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div
            ref={mapContainerRef}
            className="w-full h-[500px] rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
         />
      </div>
    </section>
  );
};

export default MapSection;

import { useState, useEffect } from 'react';

interface LocationData {
  // We use a flexible index signature to handle various province/region names
  [key: string]: {
    region_name: string;
    province_list?: {
        [province: string]: {
            municipality_list: {
                [municipality: string]: unknown; // We only care if the key exists
            };
        };
    };
    municipality_list?: {
      [municipality: string]: unknown;
    } | null; // This accounts for the `null` value that was causing the crash
  };
}

export const usePhilippineLocations = () => {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: LocationData = await response.json();

        const provinceList: string[] = [];
        const municipalityMap: Record<string, string[]> = {};

        // Iterate over the top-level keys (which are regions)
        for (const regionKey in data) {
            const region = data[regionKey];
            
            // Check if the region has a province_list
            if (region.province_list) {
                for (const provinceName in region.province_list) {
                    provinceList.push(provinceName);
                    const provinceData = region.province_list[provinceName];
                    // --- THIS IS THE FIX ---
                    // Add a safety check. Only process municipality_list if it's an object.
                    if (provinceData.municipality_list && typeof provinceData.municipality_list === 'object') {
                        municipalityMap[provinceName] = Object.keys(provinceData.municipality_list).sort();
                    } else {
                        municipalityMap[provinceName] = [];
                    }
                }
            }
        }
        
        setProvinces(provinceList.sort());
        setMunicipalities(municipalityMap);

      } catch (error) {
        console.error("Failed to fetch Philippine locations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return { provinces, municipalities, loading };
};
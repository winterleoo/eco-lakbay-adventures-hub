import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle,  DialogClose } from "@/components/ui/dialog";
import { Star, MapPin, Loader2, Search, X, Clock, Lock, Unlock } from "lucide-react";
import { DestinationRatingModal } from "@/components/DestinationRatingModal";
import { supabase } from "@/integrations/supabase/client";
import fallbackImage from "@/assets/zambales-real-village.jpg";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X as CloseIcon } from "lucide-react";

// --- Type Definitions ---
interface Destination {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  province: string;
  images?: string[];
  rating?: number;
  review_count?: number;
  latitude?: number;
  longitude?: number;
  website?: string;
  email?: string;
  sustainability_practices?: string;
  listing_type?: 'private' | 'public';
  operating_hours?: string;
  peak_days?: string;     
}

interface Review {
  id: string;
  overall_score: number;
  comments: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  } | null;
}

const BUCKET_NAME = 'destination-photos';

interface DestinationsProps {
  isPreview?: boolean;
  limit?: number;
  ownerMode?: boolean;
}

const Destinations: React.FC<DestinationsProps> = ({ isPreview = false, limit, ownerMode = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for data and loading
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals and interaction
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- MODIFIED ---: State for filters (changed province to city)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedRating, setSelectedRating] = useState('');

  // --- MODIFIED ---: State for filter dropdown options (changed province to city)
  const [cities, setCities] = useState<string[]>([]);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  
  // State for reviews inside the modal
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
 const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxImageUrl, setLightboxImageUrl] = useState('');

  const ratingOptions = [
    { value: 'all', label: 'Any Rating' },
    { value: '4', label: '4 Stars & Up' },
    { value: '3', label: '3 Stars & Up' },
    { value: '2', label: '2 Stars & Up' },
  ];

  useEffect(() => {
    const fetchDestinations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let query = supabase.from('destinations').select('*');

        if (ownerMode) {
            if (!user) {
                setDestinations([]);
                return;
            }
            query = query.eq('owner_id', user.id);
        } else {
            query = query.eq('status', 'approved');
        }

        if (limit) {
          query = query.order('rating', { ascending: false, nullsFirst: false }).limit(limit);
        }

        const { data, error: dbError } = await query;
        if (dbError) throw dbError;

        if (data) {
          setDestinations(data);
          // --- MODIFIED ---: Populate city filter options instead of province
          if (!isPreview) {
            const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))].sort();
            const uniqueTypes = [...new Set(data.map(d => d.business_type).filter(Boolean))].sort();
            setCities(['All Cities', ...uniqueCities]);
            setBusinessTypes(['All Types', ...uniqueTypes]);
          }
        }
      } catch (err: any) {
        setError("Failed to load destinations. Please try again later.");
        console.error("Error fetching destinations:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDestinations();
  }, [isPreview, limit, ownerMode, user]);

  // --- MODIFIED ---: Updated filtering logic to use city
  const filteredDestinations = useMemo(() => {
    const minRating = selectedRating && selectedRating !== 'all' ? parseFloat(selectedRating) : 0;
    return destinations.filter(destination => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? (
        destination.business_name.toLowerCase().includes(searchTermLower) ||
        destination.city.toLowerCase().includes(searchTermLower) ||
        destination.province.toLowerCase().includes(searchTermLower) ||
        destination.description.toLowerCase().includes(searchTermLower)
      ) : true;
      const matchesCity = selectedCity && selectedCity !== 'All Cities' ? destination.city === selectedCity : true;
      const matchesType = selectedType && selectedType !== 'All Types' ? destination.business_type === selectedType : true;
      const matchesRating = minRating > 0 ? (destination.rating || 0) >= minRating : true;
      return matchesSearch && matchesCity && matchesType && matchesRating;
    });
  }, [destinations, searchTerm, selectedCity, selectedType, selectedRating]);

 const fetchReviews = async (destinationId: string) => {
        setReviewsLoading(true);
        setReviews([]);
        try {
            const { data, error } = await supabase
                .from('destination_ratings')
                .select(`*, profiles:user_id (full_name, avatar_url)`)
                .eq('destination_id', destinationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data as Review[]);
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setReviewsLoading(false);
        }
    };

  const handleDestinationClick = (destination: Destination) => {
    setSelectedDestination(destination);
    setCurrentImageIndex(0);
    setIsModalOpen(true);
    fetchReviews(destination.id);
  };

  // --- MODIFIED ---: Updated to reset city filter
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setSelectedType('');
    setSelectedRating('');
  };

  const isFiltered = searchTerm || selectedCity || selectedType || selectedRating;

  const getPublicUrlFromPath = (path: string | null | undefined): string => {
    if (!path) return fallbackImage;
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleRateClick = (destination: Destination | null) => {
    if (!destination) return;
    setSelectedDestination(destination);
    setIsModalOpen(false);
    setIsRatingModalOpen(true);
  };

  const handleViewOnMap = (destination: Destination | null) => {
    if (!destination) return;
    let googleMapsUrl = '';
    if (destination.latitude && destination.longitude) {
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
    } else {
      const query = encodeURIComponent(`${destination.business_name}, ${destination.address}, ${destination.city}, ${destination.province}`);
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
 const handleOpenLightbox = () => {
        if (selectedDestination && selectedDestination.images && selectedDestination.images[currentImageIndex]) {
            const fullSizeUrl = getPublicUrlFromPath(selectedDestination.images[currentImageIndex]);
            setLightboxImageUrl(fullSizeUrl);
            setIsLightboxOpen(true);
        }
    };

  const renderContent = () => {
    const destinationsToRender = isPreview ? destinations : filteredDestinations;

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-forest" /></div>;
    if (error) return <div className="text-center py-20 text-destructive">{error}</div>;

    if (destinationsToRender.length === 0 && !isPreview) return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold">No Destinations Found</h2>
        <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
      </div>
    );
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {destinationsToRender.map((destination) => (
          <Card key={destination.id} onClick={() => handleDestinationClick(destination)} className="group flex flex-col cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
            <CardHeader className="p-0">
              <div className="w-full h-48 overflow-hidden">
                <img src={getPublicUrlFromPath(destination.images?.[0])} alt={destination.business_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onError={e => { e.currentTarget.src = fallbackImage; }} />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2"><CardTitle className="text-xl text-forest">{destination.business_name}</CardTitle><Badge variant="secondary">{destination.business_type}</Badge></div>
                <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="h-3 w-3" /> {destination.city}, {destination.province}</p>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between p-4 pt-0">
              <p className="text-muted-foreground mb-4 leading-relaxed h-20 overflow-hidden text-sm">{destination.description}</p>
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center space-x-1"><Star className="h-4 w-4 text-amber fill-amber" /><span className="font-medium text-sm">{destination.rating?.toFixed(1) || 'New'}</span><span className="text-muted-foreground text-xs ml-1">({destination.review_count || 0} reviews)</span></div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
   return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDestination && (
            <>
<DialogHeader className="space-y-4">
                                {/* The single, correct gallery implementation */}
                                <div className="space-y-3">
                                      <button
                                        type="button"
                                        onClick={handleOpenLightbox}
                                        className="w-full h-64 md:h-80 bg-muted rounded-lg overflow-hidden relative group focus:outline-none"
                                    >
                                        <img 
                                            src={getPublicUrlFromPath(selectedDestination.images?.[currentImageIndex])} 
                                            alt={`${selectedDestination.business_name} photo ${currentImageIndex + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                            <span className="text-white font-semibold text-lg">View Full Size</span>
                                        </div>
                                    </button>
                                    
                                    {(selectedDestination.images?.length ?? 0) > 1 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                                            {selectedDestination.images.map((imgPath: string, index: number) => (
                                                 <button
                                                    type="button"
                                                    key={index}
                                                    onClick={() => setCurrentImageIndex(index)}
                                                    className={cn(
                                                        "w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest",
                                                        index === currentImageIndex ? "border-forest" : "border-transparent"
                                                    )}
                                                >
                                                    <img src={getPublicUrlFromPath(imgPath)} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                 <DialogTitle className="text-3xl text-forest !mt-2">{selectedDestination.business_name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 pt-1 !-mt-2">
                  {selectedDestination.listing_type && (<Badge variant={selectedDestination.listing_type === 'private' ? "secondary" : "outline"}><div className="flex items-center gap-1.5">{selectedDestination.listing_type === 'private' ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3"/>}{selectedDestination.listing_type}</div></Badge>)}
                  {selectedDestination.business_type && (<Badge variant="outline" className="capitalize">{selectedDestination.business_type}</Badge>)}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between text-muted-foreground pt-0 !mt-1"><p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {selectedDestination.address}</p><a href={selectedDestination.website || '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-forest hover:underline">{selectedDestination.website}</a></div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div><h3 className="font-semibold text-foreground mb-2">About this Destination</h3><p className="text-muted-foreground">{selectedDestination.description}</p></div>
                
                {(selectedDestination.operating_hours || selectedDestination.peak_days) && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> Operating Information</h3>
                    <div className="text-sm text-muted-foreground space-y-1 pl-6">
                      {selectedDestination.operating_hours && <p><strong>Hours:</strong> {selectedDestination.operating_hours}</p>}
                      {selectedDestination.peak_days && <p><strong>Peak Season/Days:</strong> {selectedDestination.peak_days}</p>}
                    </div>
                  </div>
                )}
                
                {selectedDestination.sustainability_practices && (<div><h3 className="font-semibold text-foreground mb-2">Our Sustainability Practices</h3><p className="text-muted-foreground whitespace-pre-line">{selectedDestination.sustainability_practices}</p></div>)}
                
                <div><h3 className="text-lg font-semibold text-forest mb-4">Reviews from our Community</h3>{reviewsLoading ? (<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>) : reviews.length > 0 ? (<div className="space-y-4">{reviews.map((review) => (<div key={review.id} className="flex gap-4 p-4 border rounded-lg bg-muted/50"><Avatar><AvatarImage src={review.profiles?.avatar_url} /><AvatarFallback>{getInitials(review.profiles?.full_name)}</AvatarFallback></Avatar><div className="flex-1"><div className="flex justify-between items-center mb-1"><p className="font-semibold">{review.profiles?.full_name || 'Anonymous'}</p><div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 text-amber fill-amber" />{review.overall_score.toFixed(1)}</div></div><p className="text-muted-foreground text-sm italic">"{review.comments}"</p></div></div>))}</div>) : (<p className="text-center text-muted-foreground py-8">No reviews yet. Be the first to leave one!</p>)}</div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button variant="eco" className="flex-1" onClick={() => handleRateClick(selectedDestination)}>⭐ Leave a Review</Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleViewOnMap(selectedDestination)}><MapPin className="mr-2 h-4 w-4" />View on Map</Button>
                  {selectedDestination.email && <Button variant="outline" asChild><a href={`mailto:${selectedDestination.email}`}>Contact</a></Button>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                <DialogContent className="max-w-6xl w-auto h-auto bg-transparent border-none shadow-none p-0">
                    <img src={lightboxImageUrl} alt="Full size destination view" className="w-auto h-auto max-h-[95vh] max-w-[95vw] object-contain rounded-lg" />
                    <DialogClose asChild>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 bg-black/50 text-white hover:bg-black/75 hover:text-white rounded-full h-8 w-8"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
      <DestinationRatingModal isOpen={isRatingModalOpen} onClose={() => setIsRatingModalOpen(false)} destination={selectedDestination} />

      {isPreview ? (
        <>
          {renderContent()}
          {destinations.length > 0 && (
            <div className="text-center mt-12">
              <Button variant="eco" size="lg" onClick={() => navigate('/destinations')}>View All Destinations</Button>
            </div>
          )}
        </>
      ) : (
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="bg-gradient-hero py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Sustainable Destinations</h1>
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">Discover destinations that supports sustainable practices.</p>
            </div>
          </div>
          <div className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Card className="mb-12">
                <CardHeader><CardTitle>Find Your Destination</CardTitle><CardDescription>Use the search and filters below to discover your next sustainable adventure.</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center">
                    <div className="relative flex-grow w-full md:w-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Search destinations, city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
                    
                    {/* --- MODIFIED ---: This entire Select component is now for cities */}
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Cities" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent>{businessTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select>
                    <Select value={selectedRating} onValueChange={setSelectedRating}>
                      <SelectTrigger className="w-full md:w-[180px]"><div className="flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Any Rating" /></div></SelectTrigger>
                      <SelectContent>{ratingOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </CardContent>
                {isFiltered && (<CardFooter><Button variant="ghost" onClick={handleResetFilters} className="text-sm text-muted-foreground"><X className="w-4 w-4 mr-2" /> Reset Filters</Button></CardFooter>)}
              </Card>
              <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-forest">{isLoading ? 'Loading...' : `${filteredDestinations.length} Destination${filteredDestinations.length !== 1 ? 's' : ''} Found`}</h2></div>
              {renderContent()}
            </div>
          </div>
          <Footer />
        </div>
      )}
    </>
  );
};

export default Destinations;

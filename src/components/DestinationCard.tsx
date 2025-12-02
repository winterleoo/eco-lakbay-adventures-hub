import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import fallbackImage from '@/assets/zambales-real-village.jpg';
import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'destination-photos';

interface Destination {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  city: string;
  province: string;
  images?: string[];
  rating?: number | null;
  review_count?: number | null;
  status?: string;
}

interface DestinationCardProps {
  destination: Destination;
  onClick: () => void;
  actionButton?: React.ReactNode; // Optional prop for a custom button like "Edit"
}

const getPublicUrlFromPath = (path: string | null | undefined): string => {
  if (!path) return fallbackImage;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

export const DestinationCard: React.FC<DestinationCardProps> = ({ destination, onClick, actionButton }) => {
  return (
    <Card className="group flex flex-col overflow-hidden cursor-pointer" onClick={onClick}>
      <CardHeader className="p-0 relative">
        {destination.status && (
             <div className="absolute top-2 right-2 z-10">
                 <Badge variant={destination.status === 'approved' ? 'default' : 'secondary'} className="capitalize">{destination.status}</Badge>
             </div>
        )}
        <div className="w-full h-48 overflow-hidden">
          <img
            src={getPublicUrlFromPath(destination.images?.[0])}
            alt={destination.business_name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={e => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
        </div>
        <div className="p-4">
          <CardTitle className="text-xl text-forest">{destination.business_name}</CardTitle>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" /> {destination.city}, {destination.province}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between p-4 pt-0">
        <p className="text-muted-foreground mb-4 leading-relaxed h-20 overflow-hidden text-sm">{destination.description}</p>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-amber fill-amber" />
            <span className="font-medium text-sm">{destination.rating?.toFixed(1) || 'N/A'}</span>
            <span className="text-muted-foreground text-xs ml-1">({destination.review_count || 0} reviews)</span>
          </div>
          {/* Render the custom action button if it's provided, otherwise a default */}
          {actionButton}
        </div>
      </CardContent>
    </Card>
  );
};
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download } from 'lucide-react';

// Your bucket name
const PERMITS_BUCKET = 'permits';

// Interfaces for your data shapes
interface Permit {
  id: string;
  permit_type: string;
  file_name: string;
  file_url: string;
  verification_status: string;
}
interface DestinationWithPermits {
  business_name: string;
  destination_permits: Permit[];
}
interface ViewPermitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: DestinationWithPermits | null;
}

export const ViewPermitsModal: React.FC<ViewPermitsModalProps> = ({ isOpen, onClose, destination }) => {
    if (!destination) return null;
    const permits = destination.destination_permits || [];

    // --- THIS IS THE CORRECT LOGIC FOR A PUBLIC BUCKET ---
    const getPublicUrl = (pathOrUrl: string): string => {
        if (!pathOrUrl) return '#';
        
        // If it's already a full URL, trust it and return it directly.
        if (pathOrUrl.startsWith('http')) {
            return pathOrUrl;
        }

        // If it's a simple path, generate the public URL.
        const { data } = supabase.storage
            .from(PERMITS_BUCKET)
            .getPublicUrl(pathOrUrl);
        
        return data.publicUrl;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Permits for: {destination.business_name}</DialogTitle>
                    <DialogDescription>Review the uploaded permits for this destination.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {permits.length > 0 ? (
                        permits.map((permit) => (
                            <div key={permit.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium capitalize truncate">{permit.permit_type.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-muted-foreground truncate">{permit.file_name}</p>
                                    </div>
                                </div>
                                
                                {/* --- The UI is now a simple link again --- */}
                                <Button asChild variant="outline" size="sm" className="ml-4 flex-shrink-0">
                                    <a href={getPublicUrl(permit.file_url)} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4 mr-2" />
                                        View
                                    </a>
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No permits were found for this destination.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
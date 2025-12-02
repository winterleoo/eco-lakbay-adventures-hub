import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from '@/utils/logging';

interface DestinationRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: any;
}

const ratingCriteria = {
  "Tourist Sites": [
    "Are there visible efforts to conserve local biodiversity (e.g., protected species, native plants)?",
    "Does the site have proper waste disposal and recycling facilities?",
    "Are renewable energy sources (e.g., solar panels) used onsite?",
    "Is there signage or guidance encouraging visitors to respect nature and follow sustainable behavior?"
  ],
  "Community Engagement": [
    "Does the site partner with or employ locals for guides, services, or tours?",
    "Are local culture and traditions promoted in the tour or displays?"
  ],
  "Education & Awareness": [
    "Are there eco-educational materials, tours, or information points available?"
  ]
};

const accommodationCriteria = {
  "Food and Waste Management": [
    "Does the establishment offer locally sourced or organic food options?",
    "Are reusable or compostable packaging and utensils used (instead of single-use plastics)? Is food waste managed or composted properly?"
  ],
  "Sustainable Operations": [
    "Are energy-efficient appliances used (e.g., LED lighting, inverter fridges)?",
    "Are water-saving measures in place (e.g., low-flow taps, drinking water stations)?"
  ],
  "Eco Awareness": [
    "Does the café/restaurant promote sustainability through signs, menu notes, or staff messaging?"
  ]
};

const lodgingCriteria = {
  "Energy and Water Conservation": [
    "Does the lodging use energy-efficient lighting, appliances, or solar power?",
    "Are linens/towels reused upon guest approval to conserve water?",
    "Are there low-flow toilets or showers installed?"
  ],
  "Waste Reduction": [
    "Are toiletries provided in bulk dispensers (not single-use plastics)?",
    "Does the lodging offer a recycling bin in each room or shared areas?"
  ],
  "Local and Cultural Support": [
    "Are local goods, crafts, or foods featured in the accommodation or its gift shop?",
    "Does the establishment encourage guests to visit eco-tourism spots or engage in cultural experiences?"
  ]
};

const ratingScale = [
  { value: 1, label: "Strongly Disagree", color: "bg-red-500" },
  { value: 2, label: "Disagree", color: "bg-orange-500" },
  { value: 3, label: "Agree", color: "bg-yellow-500" },
  { value: 4, label: "Strongly Agree", color: "bg-lime-500" },
  { value: 5, label: "Excellent", color: "bg-green-500" }
];

export const DestinationRatingModal = ({ isOpen, onClose, destination }: DestinationRatingModalProps) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const getCategoryFromBusinessType = (businessType: string) => {
    const type = businessType?.toLowerCase() || '';
    if (type.includes('restaurant') || type.includes('café') || type.includes('cafe') || type.includes('food')) return "Cafés and Restaurants";
    if (type.includes('hotel') || type.includes('resort') || type.includes('lodge') || type.includes('accommodation')) return "Lodging";
    return "Tourist Sites";
  };
  
  const selectedCategory = getCategoryFromBusinessType(destination?.business_type);

  const getCurrentCriteria = () => {
    switch (selectedCategory) {
      case "Tourist Sites":
        return [...ratingCriteria["Tourist Sites"], ...ratingCriteria["Community Engagement"], ...ratingCriteria["Education & Awareness"]];
      case "Cafés and Restaurants":
        return [...accommodationCriteria["Food and Waste Management"], ...accommodationCriteria["Sustainable Operations"], ...accommodationCriteria["Eco Awareness"]];
      case "Lodging":
        return [...lodgingCriteria["Energy and Water Conservation"], ...lodgingCriteria["Waste Reduction"], ...lodgingCriteria["Local and Cultural Support"]];
      default:
        return [];
    }
  };

  const handleRatingChange = (criteriaIndex: string, value: string) => {
    setRatings(prev => ({ ...prev, [criteriaIndex]: parseInt(value) }));
  };

  const calculateOverallRating = () => {
    const ratingValues = Object.values(ratings);
    if (ratingValues.length === 0) return { score: 0, label: "Not Rated", color: "bg-gray-400", description: "No ratings yet" };
    const average = ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
    if (average >= 4.5) return { score: 5, label: "Excellent", color: "bg-green-500", description: "Highly Sustainable" };
    if (average >= 3.5) return { score: 4, label: "Good", color: "bg-lime-500", description: "Sustainable" };
    if (average >= 2.5) return { score: 3, label: "Moderate", color: "bg-yellow-500", description: "Developing Sustainability" };
    if (average >= 1.5) return { score: 2, label: "Low", color: "bg-orange-500", description: "Low Sustainability" };
    return { score: 1, label: "Poor", color: "bg-red-500", description: "Unsustainable" };
  };

  const handleSubmitRating = async () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in to submit a rating.", variant: "destructive" });
      return;
    }
    const criteria = getCurrentCriteria();
    if (Object.keys(ratings).length < criteria.length) {
      toast({ title: "Incomplete Rating", description: "Please rate all criteria before submitting.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    
    try {
      const overallRating = calculateOverallRating();
      const ratingData = {
        category: selectedCategory,
        criteria: criteria.map((criterion, index) => ({ question: criterion, score: ratings[index.toString()] }))
      };

      const destinationId = destination.id;

      // Check if user has already rated this destination
      const { data: existingRating } = await supabase
        .from('destination_ratings')
        .select('id')
        .eq('destination_id', destinationId)
        .eq('user_id', user.id)
        .maybeSingle();

      let operation;
      if (existingRating) {
        // Update existing rating
        operation = supabase
          .from('destination_ratings')
          .update({
            rating_data: ratingData,
            overall_score: overallRating.score,
            comments: comments.trim() || null
          })
          .eq('id', existingRating.id);
      } else {
        // --- THIS IS THE FIX ---
        // Insert new rating, now including the user.id
        operation = supabase
          .from('destination_ratings')
          .insert({
            destination_id: destinationId,
            user_id: user.id, // This line ensures the relationship is created
            rating_data: ratingData,
            overall_score: overallRating.score,
            comments: comments.trim() || null
          });
      }

      const { error } = await operation;
      if (error) throw error;
      // Log the calculated overall score, not the non-existent 'rating' variable.
await logAction('new_rating_submitted', {
  destinationId: destination.id,
  destinationName: destination.business_name,
  rating: overallRating.score, // Use the correct variable here
});
      
      toast({ title: "Rating Submitted!", description: `Thank you for rating ${destination?.business_name || destination?.name}.` });
      onClose();

    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({ title: "Error", description: "Failed to submit rating. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const criteria = getCurrentCriteria();
  const overallRating = calculateOverallRating();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-forest">Rate {destination?.business_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">Rate each criterion from 1 (Strongly Disagree) to 5 (Excellent) based on your observation.</p>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2"><Badge variant="outline" className="font-medium">{selectedCategory}</Badge><span className="text-sm text-muted-foreground">Category determined by: {destination?.business_type}</span></div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-forest">{selectedCategory} Criteria</h3>
            {criteria.map((criterion, index) => (
              <Card key={index} className="border-forest/20">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">{criterion}</CardTitle></CardHeader>
                <CardContent>
                  <RadioGroup value={ratings[index.toString()]?.toString() || ""} onValueChange={(value) => handleRatingChange(index.toString(), value)} className="flex gap-4">
                    {ratingScale.map((scale) => (
                      <div key={scale.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={scale.value.toString()} id={`${index}-${scale.value}`} />
                        <Label htmlFor={`${index}-${scale.value}`} className="text-xs cursor-pointer flex items-center gap-1"><div className={`w-3 h-3 rounded-full ${scale.color}`} />{scale.value}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>
          {Object.keys(ratings).length > 0 && (
            <Card className="border-forest bg-forest/5">
              <CardHeader><CardTitle className="text-forest">Overall Rating Preview</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${overallRating.color}`} />
                  <div><div className="font-semibold">{overallRating.label}</div><div className="text-sm text-muted-foreground">{overallRating.description}</div></div>
                  <Badge variant="outline" className="ml-auto">{overallRating.score}/5</Badge>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea id="comments" placeholder="Share your experience and suggestions..." value={comments} onChange={(e) => setComments(e.target.value)} className="min-h-[100px]" />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button variant="eco" onClick={handleSubmitRating} className="flex-1" disabled={submitting}>{submitting ? "Submitting..." : "Submit Rating"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

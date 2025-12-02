import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// --- NEW ---: Import the PDF libraries
import { Loader2, Download, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import { marked } from 'marked';
import html2canvas from "html2canvas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
interface TripPlannerModalProps {
open: boolean;
onOpenChange: (open: boolean) => void;
}
const TripPlannerModal = ({ open, onOpenChange }: TripPlannerModalProps) => {
const [isLoading, setIsLoading] = useState(false);
const [tripPlan, setTripPlan] = useState<string>("");
const [showPlan, setShowPlan] = useState(false);
const { toast } = useToast();
// --- NEW ---: A ref to target the HTML element we want to convert to PDF
// --- NEW ---: State to handle the PDF download process
const [isDownloading, setIsDownloading] = useState(false);
const [formData, setFormData] = useState({
// --- ADDED startingPoint ---
startingPoint: "",
// --- duration is now a string for text input ---
duration: "",

groupSize: 1,
travelStyle: "",
interests: [] as string[],
});
const interestOptions = [
"Nature & Wildlife", "Cultural Heritage", "Food & Cuisine", "Adventure Activities",
"Photography", "Local Communities", "Historical Sites", "Sustainable Farming",
"Arts & Crafts", "Relaxation"
];
const handleInterestChange = (interest: string, checked: boolean) => {
setFormData(prev => ({
...prev,
interests: checked ? [...prev.interests, interest] : prev.interests.filter(i => i !== interest)
}));
};
const handleGeneratePlan = async () => {
// Add startingPoint to the validation check
if (!formData.startingPoint || !formData.duration || !formData.travelStyle || formData.interests.length === 0) {
toast({
title: "Missing Information",
description: "Please fill in all fields to generate your trip plan.",
variant: "destructive",
});
return;
}
setIsLoading(true);
try {
  // The formData now includes the startingPoint
  const { data, error } = await supabase.functions.invoke('generate-trip-plan', {
    body: formData
  });
  if (error) throw error;
  setTripPlan(data.tripPlan);
  setShowPlan(true);
} catch (error: any) {
  console.error('Error generating trip plan:', error);
  toast({ title: "Error", description: `Failed to generate plan: ${error.message}`, variant: "destructive" });
} finally {
  setIsLoading(false);
}
};
const resetForm = () => {
setShowPlan(false);
setTripPlan("");
setFormData({
startingPoint: "", duration: "", groupSize: 1, travelStyle: "", interests: [],
});
};
const handleClose = () => {
resetForm();
onOpenChange(false);
};
// When opening the modal, we still reset, but don't close.
const handleOpen = (isOpen: boolean) => {
if (!isOpen) {
handleClose();
} else {
onOpenChange(true);
}
};

// --- THIS IS THE FINAL AND MOST RELIABLE PDF FUNCTION ---
const handleDownloadPdf = () => {
    if (!tripPlan) { return; }

    setIsDownloading(true);

    try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const margin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const maxWidth = pageWidth - margin * 2;
        let cursorY = margin + 10;

        const addTextWithPageBreaks = (text: string, options: any) => {
            const lines = pdf.splitTextToSize(text, maxWidth);
            lines.forEach((line: string) => {
                if (cursorY + 6 > pageHeight - margin) { // Check if we need a new page
                    pdf.addPage();
                    cursorY = margin;
                }
                pdf.text(line, margin, cursorY, options);
                cursorY += 6; // Move cursor down for the next line
            });
        };
        
        // 1. Process and render each line of the trip plan
         const lines = tripPlan.split('\n');
        lines.forEach(line => {
            // Trim whitespace first for consistent checks
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('##')) { // Catches ##, ###, ####
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(trimmedLine.startsWith('####') ? 14 : trimmedLine.startsWith('###') ? 16 : 18);
                // Replace markdown hashes and asterisks for a clean title
                addTextWithPageBreaks(trimmedLine.replace(/[#*]/g, '').trim(), {});
                cursorY += 2;
            } else if (trimmedLine.startsWith('**')) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(11);
                addTextWithPageBreaks(trimmedLine.replace(/\*/g, '').trim(), {});
            } else if (trimmedLine.startsWith('* ')) {
                // --- THIS IS THE FIX ---
                // We process the line WITHOUT removing the first letter.
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                // We take the line, remove the leading '* ', and then add our own bullet point.
                addTextWithPageBreaks(`  • ${trimmedLine.substring(2)}`, {}); 
            } else if (trimmedLine === '---') {
                cursorY += 2;
                if (cursorY + 4 > pageHeight - margin) { pdf.addPage(); cursorY = margin; }
                pdf.setDrawColor(200);
                pdf.line(margin, cursorY, pageWidth - margin, cursorY);
                cursorY += 4;
            } else {
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                addTextWithPageBreaks(trimmedLine, {}); // Render the plain text line
            }
            cursorY += 1;
        });

        // 2. Add the disclaimer at the very end
        const disclaimerText = "Disclaimer: This AI-generated itinerary is not based on real-time data. Please verify all details before your trip.";
        if (cursorY + 20 > pageHeight - margin) { // Check if we need a new page for the disclaimer
            pdf.addPage();
            cursorY = margin;
        }
        cursorY += 10;
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        addTextWithPageBreaks(disclaimerText, {});

        pdf.save("EcoLakbay-Trip-Plan.pdf");

    } catch (error) {
        console.error("Error creating PDF:", error);
        toast({ title: "PDF Creation Failed", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
};
return (
<Dialog open={open} onOpenChange={handleOpen}>
<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
<DialogHeader>
<DialogTitle className="text-2xl text-forest">
{showPlan ? "Your AI-Generated Trip Plan" : "Plan Your Eco-Adventure"}
</DialogTitle>
</DialogHeader>

{showPlan ? (
             <div className="space-y-4">
        {/* --- MODIFIED ---: We add the ref to this div */}
           <div className="bg-muted rounded-lg p-6 prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                        {tripPlan}
                    </div>
        <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 !text-amber-600" />
          <AlertTitle className="font-semibold !text-amber-800 dark:!text-amber-200">AI-Generated Content</AlertTitle>
          <AlertDescription className="!text-amber-700 dark:!text-amber-300">
            This itinerary is based on the generative knowledge of the AI. Please verify details with establishments before your trip.
          </AlertDescription>
        </Alert>      
        {/* --- MODIFIED ---: The button layout is updated */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { setShowPlan(false); setTripPlan(""); }} variant="outline" className="flex-grow">
            Modify Plan
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="flex-grow">
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Generating..." : "Download as PDF"}
          </Button>
          <Button onClick={handleClose} variant="eco" className="flex-grow">
            Close
          </Button>
        </div>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* --- 1. NEW `startingPoint` Input --- */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="startingPoint">Where is your starting point or accommodation? *</Label>
            <Input
              id="startingPoint"
              placeholder="e.g., My hotel in Angeles City"
              value={formData.startingPoint}
              onChange={(e) => setFormData(prev => ({ ...prev, startingPoint: e.target.value }))}
            />
          </div>
          
          {/* --- 2. MODIFIED `duration` Input --- */}
          <div className="space-y-2">
            <Label htmlFor="duration">Trip Duration (e.g., "3 days", "a weekend") *</Label>
            <Input
              id="duration"
              type="text"
              placeholder="e.g., 3 days and 2 nights"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            />
          </div>

      

          <div className="space-y-2">
            <Label htmlFor="groupSize">Group Size *</Label>
            <Input
              id="groupSize"
              type="number"
              min="1" max="50"
              value={formData.groupSize}
              onChange={(e) => setFormData(prev => ({ ...prev, groupSize: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="travelStyle">Travel Style *</Label>
            <Select value={formData.travelStyle} onValueChange={(value) => setFormData(prev => ({ ...prev, travelStyle: value }))}>
              <SelectTrigger><SelectValue placeholder="Select travel style" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Budget Backpacker">Budget Backpacker</SelectItem>
                <SelectItem value="Comfort Traveler">Comfort Traveler</SelectItem>
                <SelectItem value="Luxury Explorer">Luxury Explorer</SelectItem>
              
                <SelectItem value="Adventure Seeker">Adventure Seeker</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Interests (Select at least one) *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {interestOptions.map((interest) => (
              <div key={interest} className="flex items-center space-x-2">
                <Checkbox id={interest} checked={formData.interests.includes(interest)} onCheckedChange={(checked) => handleInterestChange(interest, !!checked)} />
                <Label htmlFor={interest} className="text-sm font-normal cursor-pointer">{interest}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button onClick={handleClose} variant="outline" className="flex-1">Cancel</Button>
          <Button onClick={handleGeneratePlan} disabled={isLoading} variant="eco" className="flex-1">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Generating Your Plan..." : "Generate Trip Plan"}
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
);
};
export default TripPlannerModal;

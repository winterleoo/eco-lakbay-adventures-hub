import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PermitUpload } from "@/components/PermitUpload";
import { ImageUploader, ImageUploaderRef } from "@/components/ImageUploader";
import { Loader2, CheckCircle, Building, MapPin, Phone, Mail, Globe, Star, FileCheck, Camera } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, Unlock } from "lucide-react";
import { Clock } from "lucide-react"; // Import a new icon for the section

const DestinationRegistration = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'info' | 'photos' | 'permits' | 'complete'>('info');
  const [createdDestinationId, setCreatedDestinationId] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  const [formData, setFormData] = useState({
    businessName: "", businessType: "", description: "", address: "",
    city: "", province: "", phone: "", email: "", website: "",
    sustainabilityPractices: "",
     listingType: "private",
         operatingHours: "", // New
    peakDays: "", 
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAndContinue = async () => {
    if (!user) {
      toast({ title: "Authentication Required", variant: "destructive" });
      return;
    }
    const requiredFields = ['businessName', 'businessType', 'description', 'address', 'city', 'province', 'email'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData].trim()) {
        toast({ title: "Missing Information", description: `Please fill in all required fields.`, variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('destinations').insert({
        owner_id: user.id, business_name: formData.businessName, business_type: formData.businessType,
        description: formData.description, address: formData.address, city: formData.city,
        province: formData.province, phone: formData.phone || null, email: formData.email,
        website: formData.website || null, sustainability_practices: formData.sustainabilityPractices || null,
          listing_type: formData.listingType,    operating_hours: formData.operatingHours || null, // New
        peak_days: formData.peakDays || null,    
      }).select('id').single();
      
      if (error) throw error;
      
      if (data) {
        setCreatedDestinationId(data.id);
        setStep('photos'); // Move to the NEW photos step
        toast({ title: "Step 1 Complete", description: "Business information saved." });
      }
    } catch (error: any) {
      toast({ title: "Error Saving", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handlePhotosSubmitted = async () => {
    if (!imageUploaderRef.current || !createdDestinationId) return;

    setIsSubmitting(true);
    // Call the child component's upload function and wait for the URLs
    const publicUrls = await imageUploaderRef.current.triggerUpload();
    
    // `triggerUpload` will return null if it fails or has no files
    if (publicUrls) {
      // If upload was successful, update the destination in the database with the image URLs
      const { error } = await supabase
        .from('destinations')
        .update({ images: publicUrls })
        .eq('id', createdDestinationId);

      if (error) {
        toast({ title: "Error Saving Photos", description: error.message, variant: "destructive" });
      }  
      if (formData.listingType === 'public') {
        setStep('complete');
      } else {
        // Otherwise, proceed to the permits step as normal.
        setStep('permits');
      }
    }
    setIsSubmitting(false);
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-forest mb-4">Join EcoLakbay as a Partner</h1>
            <p className="text-lg text-muted-foreground">Register your eco-friendly establishment to join the sustainable tourism movement.</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-forest">Registration Application</CardTitle>
              <CardDescription>
                {step === 'info' && "Step 1 of 3: Provide your business information."}
                {step === 'photos' && "Step 2 of 3: Upload photos of your destination."}
                {step === 'permits' && "Step 3 of 3: Upload required verification documents."}
                {step === 'complete' && "Application Submitted!"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'info' && (
                
                <div className="space-y-6">
                  
                  {/* --- NEW ---: Add Listing Type selection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-forest">Listing Type</h3>
                    <RadioGroup 
                        defaultValue="private" 
                        onValueChange={(value: "private" | "public") => handleInputChange("listingType", value)}
                        className="grid md:grid-cols-2 gap-4"
                    >
                      <Label htmlFor="private-listing" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="private" id="private-listing" className="sr-only" />
                        <Lock className="w-8 h-8 mb-2" />
                        <span className="font-semibold">Private Establishment</span>
                        <span className="text-sm text-muted-foreground text-center">e.g., Hotel, Restaurant, Resort. Requires business permits for verification.</span>
                      </Label>
                      <Label htmlFor="public-listing" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="public" id="public-listing" className="sr-only" />
                        <Unlock className="w-8 h-8 mb-2" />
                        <span className="font-semibold">Public Destination</span>
                        <span className="text-sm text-muted-foreground text-center">e.g., National Park, Trail, Public Beach. No business permits required.</span>
                      </Label>
                    </RadioGroup>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-forest">Business Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="businessName">Business Name *</Label><Input id="businessName" placeholder="e.g., Pampanga Eco Farm" value={formData.businessName} onChange={(e) => handleInputChange("businessName", e.target.value)} required /></div>
                      <div className="space-y-2"><Label htmlFor="businessType">Business Type *</Label><Select onValueChange={(value) => handleInputChange("businessType", value)} value={formData.businessType}><SelectTrigger><SelectValue placeholder="Select business type" /></SelectTrigger><SelectContent><SelectItem value="hotel">Hotel/Resort</SelectItem><SelectItem value="restaurant">Restaurant/Café</SelectItem><SelectItem value="attraction">Tourist Attraction</SelectItem><SelectItem value="tour">Tour Operator</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="description">Business Description *</Label><Textarea id="description" placeholder="Describe your business, services, and what makes it special..." className="min-h-[120px]" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} required /></div>
                  </div>
                  <div className="space-y-4"><h3 className="text-lg font-semibold text-forest flex items-center gap-2"><MapPin className="w-5 h-5" />Location Information</h3>
                    <div className="space-y-2"><Label htmlFor="address">Street Address *</Label><Input id="address" placeholder="Enter complete street address" value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} required /></div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="city">City/Municipality *</Label><Input id="city" placeholder="e.g., San Fernando" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} required /></div>
                      <div className="space-y-2"><Label htmlFor="province">Province *</Label><Input id="province" placeholder="e.g., Pampanga" value={formData.province} onChange={(e) => handleInputChange("province", e.target.value)} required /></div>
                    </div>
                  </div>
                  <div className="space-y-4"><h3 className="text-lg font-semibold text-forest">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="phone" className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone Number</Label><Input id="phone" type="tel" placeholder="+63 900 000 0000" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="email" className="flex items-center gap-2"><Mail className="w-4 h-4" />Email Address *</Label><Input id="email" type="email" placeholder="business@example.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="website" className="flex items-center gap-2"><Globe className="w-4 h-4" />Website (Optional)</Label><Input id="website" type="url" placeholder="https://yourwebsite.com" value={formData.website} onChange={(e) => handleInputChange("website", e.target.value)} /></div>
                  </div>
                  <div className="space-y-4"><h3 className="text-lg font-semibold text-forest">Sustainability Practices</h3>
                    <div className="space-y-2"><Label htmlFor="sustainabilityPractices">Tell us about your environmental initiatives</Label><Textarea id="sustainabilityPractices" placeholder="Describe your eco-friendly practices, waste reduction efforts, community involvement, etc." className="min-h-[120px]" value={formData.sustainabilityPractices} onChange={(e) => handleInputChange("sustainabilityPractices", e.target.value)} /></div>
                  </div>
                      {/* --- NEW ---: Add Operating Hours & Peak Days section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-forest flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Operating Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="operatingHours">Operating Hours</Label>
                        <Input 
                            id="operatingHours" 
                            placeholder="e.g., 9:00 AM - 5:00 PM, Tue-Sun" 
                            value={formData.operatingHours} 
                            onChange={(e) => handleInputChange("operatingHours", e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="peakDays">Peak Days / Season</Label>
                        <Input 
                            id="peakDays" 
                            placeholder="e.g., Weekends, December-February" 
                            value={formData.peakDays} 
                            onChange={(e) => handleInputChange("peakDays", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t">
                    <Button type="button" size="lg" onClick={handleSaveAndContinue} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save & Continue to Photos</Button>
                  </div>
                </div>
              )}
               {step === 'photos' && createdDestinationId && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-forest flex items-center gap-2"><Camera className="w-5 h-5" /> Upload Photos</h3>
                  {/* Pass the ref to the ImageUploader component */}
                  <ImageUploader ref={imageUploaderRef} destinationId={createdDestinationId} />
                  <div className="flex justify-between pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setStep('info')}>Back to Business Info</Button>
                    <Button type="button" onClick={handlePhotosSubmitted} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Photos & Continue
                    </Button>
                  </div>
                </div>
              )}
               {/* --- MODIFIED ---: The permit step UI has a "Skip" button for public listings */}
              {step === 'permits' && user && createdDestinationId && (
                <div className="space-y-6">
                   <Alert>
                      <FileCheck className="h-4 w-4" />
                      <AlertTitle>Verification Documents</AlertTitle>
                      <AlertDescription>
                        As a private establishment, you are required to upload business permits for verification. This ensures trust and safety within the EcoLakbay community.
                      </AlertDescription>
                  </Alert>

                  <PermitUpload userId={user.id} destinationId={createdDestinationId} onPermitsUploaded={() => setStep('complete')} />
                  
                  <div className="flex justify-between pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setStep('photos')}>Back to Photos</Button>
                    {/* Allow skipping if it was mistakenly set to private */}
                    <Button type="button" variant="ghost" onClick={() => setStep('complete')}>Skip for now</Button>
                  </div>
                </div>
              )}
              {step === 'complete' && (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Registration Submitted!</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Thank you! Your application is complete and will be reviewed within 5-7 business days.
                  </p>
                  <Button onClick={() => navigate('/my-destinations')}>Go to Your Dashboard</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DestinationRegistration;

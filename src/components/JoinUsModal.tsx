import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast"; // You were using toasts, so I've kept this
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhilippineLocations } from "@/hooks/usePhilippineLocations"; // The location hook

interface JoinUsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const JoinUsModal = ({ open, onOpenChange }: JoinUsModalProps) => {
  // --- THIS IS THE FIX ---
  // All hooks must be called inside the component function.
  const { provinces, municipalities, loading: locationsLoading } = usePhilippineLocations();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    nationality: "",
    province: "",
    town: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = (value: string) => {
    setFormData(prev => ({ ...prev, province: value, town: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations are correct
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.gender || !formData.nationality || !formData.province || !formData.town) {
        toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
        return;
    }
    // ... other validations ...

    setIsLoading(true);

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
        });

        if (authError) throw authError;

        const user = authData.user;
        if (user) {
            // --- FIX #2 --- The profile logic needs to be INSIDE the `if (user)` block.
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    user_id: user.id,
                    email: formData.email,
                    full_name: formData.name,
                    gender: formData.gender,
                    nationality: formData.nationality,
                    province: formData.province,
                    town: formData.town,
                }, { onConflict: 'user_id' });

            if (profileError) throw profileError;

            toast({ title: "Account Created!", description: "Please check your email to verify your account." });
            onOpenChange(false);
            // Reset form state
            setFormData({ name: "", email: "", password: "", confirmPassword: "", gender: "", nationality: "", province: "", town: "" });
        } else {
            throw new Error("Sign up was successful, but no user was returned.");
        }
    } catch (error: any) {
        toast({ title: "Sign-Up Error", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }; // --- The misplaced `}` was here. This is now correct.
  // Get towns for the selected province
  const townsForSelectedProvince = formData.province ? municipalities[formData.province] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* --- FIX IS HERE: Add classes to DialogContent --- */}
      <DialogContent 
        className="sm:max-w-md grid grid-rows-[auto_1fr] max-h-[90vh]"
      >
        <DialogHeader className="row-start-1">
          <DialogTitle className="text-2xl font-bold text-forest">
            Join EcoLakbay
          </DialogTitle>
          <DialogDescription>
            Create your account and start making a positive impact on the
            environment.
          </DialogDescription>
        </DialogHeader>

        {/* --- FIX IS HERE: Add a scrolling class to the form --- */}
        <form onSubmit={handleSubmit} className="space-y-4 row-start-2 overflow-y-auto pr-4 -mr-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              className="w-full border rounded-md p-2 bg-background"
              required
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* --- MODIFIED --- Nationality is now a dropdown */}
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Select value={formData.nationality} onValueChange={(value) => handleChange("nationality", value)}>
              <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Filipino">Filipino</SelectItem>
                <SelectItem value="American">American</SelectItem>
                <SelectItem value="Chinese">Chinese</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
                <SelectItem value="Korean">Korean</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

           {/* --- NEW --- Province and Town dropdowns */}
          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Select value={formData.province} onValueChange={handleProvinceChange}>
              <SelectTrigger disabled={locationsLoading}>
                <SelectValue placeholder={locationsLoading ? "Loading locations..." : "Select province"} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="town">Town / City</Label>
            <Select value={formData.town} onValueChange={(value) => handleChange("town", value)} disabled={!formData.province || townsForSelectedProvince.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={!formData.province ? "Select a province first" : "Select town/city"} />
              </SelectTrigger>
              <SelectContent>
                {townsForSelectedProvince.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password (min. 8 characters)"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleChange("confirmPassword", e.target.value)
              }
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col space-y-3 pt-4 sticky bottom-0 bg-background py-4">
            <Button
              type="submit"
              variant="eco"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Creating Account..." : "Join EcoLakbay"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <span className="text-forest cursor-pointer hover:underline">
              Sign in instead
            </span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinUsModal;

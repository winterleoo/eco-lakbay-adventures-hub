import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhilippineLocations } from "@/hooks/usePhilippineLocations";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const { provinces, municipalities, loading: locationsLoading } = usePhilippineLocations();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", gender: "", nationality: "Filipino",
    province: "", town: "", role: "user"
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProvinceChange = (value: string) => {
    setFormData(prev => ({ ...prev, province: value, town: '' }));
  };
  
  const resetForm = () => {
      setFormData({ name: "", email: "", password: "", gender: "", nationality: "Filipino", province: "", town: "", role: "user" });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.province || !formData.town) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Use the powerful admin method to create a user
      const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm the email, as the admin is creating it
      });

      if (authError) throw authError;
      if (!user) throw new Error("User creation failed in authentication.");

      // Create the corresponding profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: user.id,
        email: formData.email,
        full_name: formData.name,
        gender: formData.gender,
        nationality: formData.nationality,
        province: formData.province,
        town: formData.town,
      });
      if (profileError) throw profileError;

      // If the admin chose 'admin' role, add an entry to user_roles
      if (formData.role === 'admin') {
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: user.id,
          role: 'admin',
        });
        if (roleError) throw roleError;
      }

      toast({ title: "User Created Successfully!" });
      resetForm();
      onUserCreated(); // This calls the parent to refresh data and close the modal

    } catch (error: any) {
      toast({ title: "Error Creating User", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const townsForSelectedProvince = formData.province ? municipalities[formData.province] || [] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md grid grid-rows-[auto_1fr] max-h-[90vh]">
        <DialogHeader className="row-start-1">
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Manually create a new user account for the platform.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 row-start-2 overflow-y-auto pr-4 -mr-4">
          {/* Form fields are almost identical to JoinUsModal */}
          <div className="space-y-2"><Label>Full Name *</Label><Input value={formData.name} onChange={e => handleChange("name", e.target.value)} required /></div>
          <div className="space-y-2"><Label>Email *</Label><Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} required /></div>
          <div className="space-y-2"><Label>Password *</Label><Input type="password" value={formData.password} onChange={e => handleChange("password", e.target.value)} required /></div>
          <div className="space-y-2"><Label>Gender</Label><Select value={formData.gender} onValueChange={value => handleChange("gender", value)}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Prefer not to say">Prefer not to say</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Nationality</Label><Select value={formData.nationality} onValueChange={value => handleChange("nationality", value)}><SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger><SelectContent><SelectItem value="Filipino">Filipino</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Province *</Label><Select value={formData.province} onValueChange={handleProvinceChange}><SelectTrigger disabled={locationsLoading}><SelectValue placeholder={locationsLoading ? "Loading..." : "Select province"} /></SelectTrigger><SelectContent>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Town / City *</Label><Select value={formData.town} onValueChange={value => handleChange("town", value)} disabled={!formData.province}><SelectTrigger><SelectValue placeholder="Select town/city" /></SelectTrigger><SelectContent>{townsForSelectedProvince.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Role *</Label><Select value={formData.role} onValueChange={value => handleChange("role", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
          <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isLoading} className="w-full">{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create User</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
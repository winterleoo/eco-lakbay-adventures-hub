import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Camera, Save, Mail, MapPin } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhilippineLocations } from "@/hooks/usePhilippineLocations"; // The new hook

const UserAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { provinces, municipalities, loading: locationsLoading } = usePhilippineLocations();

  // --- MODIFIED ---: Profile state now includes province and town
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    province: "",
    town: "",
    avatar_url: "",
    gender: "",
    nationality: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          province: data.province || "", // New field
        town: data.town || "", 
          avatar_url: data.avatar_url || "",
          gender: data.gender || "",
          nationality: data.nationality || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to fetch profile",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updatePayload = {
        full_name: profile.full_name,
        bio: profile.bio,
        province: profile.province, // New field
      town: profile.town,        
        avatar_url: profile.avatar_url,
        gender: profile.gender,
        nationality: profile.nationality,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description:
          (error as any).message || "Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setProfile((prev) => ({ ...prev, avatar_url: data.publicUrl }));

      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", user.id);

      toast({
        title: "Success",
        description: "Profile picture uploaded and saved.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const townsForSelectedProvince = profile.province ? municipalities[profile.province] || [] : [];

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-forest mb-2">
              Account Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your profile and account preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Profile Picture */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Profile Picture
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-700">
                <Avatar className="w-full h-full">
                  <AvatarImage
                    src={profile.avatar_url}
                    className="object-cover w-full h-full"
                  />
                  <AvatarFallback className="text-2xl bg-muted flex items-center justify-center">
                    {getInitials(profile.full_name) ||
                      user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="w-full">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button asChild disabled={uploading} className="w-full">
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Change Picture"}
                    </span>
                  </Button>
                </Label>

                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>


            {/* Profile Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={user.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      placeholder="Enter your full name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          full_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* 🟢 Gender & Nationality */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={profile.gender}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          gender: e.target.value,
                        }))
                      }
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>

                   <div className="space-y-2">
    <Label htmlFor="nationality">Nationality</Label>
    <select
      id="nationality"
      value={profile.nationality}
      onChange={(e) => setProfile((prev) => ({ ...prev, nationality: e.target.value }))}
      className="w-full border rounded-md p-2"
    >
      <option value="">Select nationality</option>
      <option value="Filipino">Filipino</option>
      <option value="American">American</option>
      <option value="Chinese">Chinese</option>
      <option value="Japanese">Japanese</option>
      <option value="Korean">Korean</option>
      <option value="Indonesian">Indonesian</option>
      <option value="Vietnamese">Vietnamese</option>
      <option value="Thai">Thai</option>
      <option value="Singaporean">Singaporean</option>
      <option value="Malaysian">Malaysian</option>
      <option value="Other">Other</option>
    </select>
  </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select 
                    value={profile.province} 
                    onValueChange={(value) => setProfile(prev => ({ ...prev, province: value, town: '' }))} // Reset town when province changes
                  >
                    <SelectTrigger disabled={locationsLoading}>
                      <SelectValue placeholder={locationsLoading ? "Loading provinces..." : "Select province"} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="town">Town / City</Label>
                  <Select 
                    value={profile.town} 
                    onValueChange={(value) => setProfile(prev => ({ ...prev, town: value }))}
                    disabled={!profile.province || townsForSelectedProvince.length === 0} // Disable if no province is selected
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!profile.province ? "Select a province first" : "Select town/city"} />
                    </SelectTrigger>
                    <SelectContent>
                      {townsForSelectedProvince.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px]"
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                  />
                </div>

                <Button
                  onClick={updateProfile}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserAccount;

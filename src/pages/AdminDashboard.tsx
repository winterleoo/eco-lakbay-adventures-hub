import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit2, Users, TrendingUp, MapPin, Search, MoreHorizontal, Archive, FileText, Download, Loader2, Clock, Star, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis,
} from "recharts";

import { ViewPermitsModal } from "@/components/ViewPermitsModal";
import { EditDestinationModal } from "@/components/EditDestinationModal";
import { CreateUserModal } from "@/components/CreateUserModal";

interface LogEntry {
  id: number;
  created_at: string;
  action: string;
  details: {
    userName?: string;
    destinationName?: string;
    status?: string;
    [key: string]: any;
  };
  profiles: {
    full_name: string;
  } | null;
}

const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'secondary', approved: 'default', rejected: 'destructive', archived: 'outline',
};

const PAGE_SIZE = 10;

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [profile, setProfile] = useState<any>(null);
  const [allDestinations, setAllDestinations] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allRatings, setAllRatings] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loadingData, setLoadingData] = useState(true);

  // Pagination State
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [destinationsPage, setDestinationsPage] = useState(1);
  const [hasMoreDestinations, setHasMoreDestinations] = useState(true);
  const [loadingMoreDestinations, setLoadingMoreDestinations] = useState(false);

  // Modal State
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingDestinationPermits, setViewingDestinationPermits] = useState<any>(null);
  const [isPermitsModalOpen, setIsPermitsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, searchTerm]);

  const logAction = async (action: string, details: object) => {
    try {
      const { error } = await supabase.from('audit_log').insert({ user_id: user?.id, action, details });
      if (error) console.error("Error logging action:", error);
    } catch (err) {
      console.error("Failed to log action:", err);
    }
  };

  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      setActivityLogPage(1);
      setDestinationsPage(1);
      setHasMoreLogs(true);
      setHasMoreDestinations(true);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      setProfile(profileData);

      const { data: destData, error: destError } = await supabase.from('destinations').select('*, destination_permits(*)').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1);
      if (destError) throw destError;
      setAllDestinations(destData || []);
      if ((destData || []).length < PAGE_SIZE) setHasMoreDestinations(false);
      
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      const { data: ratingsData, error: ratingsError } = await supabase.from('destination_ratings').select(`*, destinations!inner(business_name), profiles!inner(full_name)`).order('created_at', { ascending: false });
      if (ratingsError) throw ratingsError;
      setAllRatings(ratingsData || []);
      
      const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact', head: true });
      const { data: logData, error: logError } = await supabase.from('audit_log').select(`*, profiles(full_name)`).order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1);
      if (logError) throw logError;
      setActivityLog(logData || []);
      if ((logData || []).length < PAGE_SIZE) setHasMoreLogs(false);

    } catch (error: any) {
        toast({ title: "Data Loading Error", description: `Failed to load admin data: ${error.message}.`, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };
  
  const loadMoreLogs = async () => {
    if (loadingMoreLogs || !hasMoreLogs) return;
    setLoadingMoreLogs(true);
    const from = activityLogPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: newLogs, error } = await supabase.from('audit_log').select(`*, profiles(full_name)`).order('created_at', { ascending: false }).range(from, to);
    if (error) {
      toast({ title: "Error", description: "Could not load more activity.", variant: "destructive" });
    } else if (newLogs) {
      setActivityLog(prev => [...prev, ...newLogs]);
      setActivityLogPage(prev => prev + 1);
      if (newLogs.length < PAGE_SIZE) setHasMoreLogs(false);
    }
    setLoadingMoreLogs(false);
  };

  const loadMoreDestinations = async () => {
    if (loadingMoreDestinations || !hasMoreDestinations) return;
    setLoadingMoreDestinations(true);
    const from = destinationsPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: newDests, error } = await supabase.from('destinations').select('*, destination_permits(*)').order('created_at', { ascending: false }).range(from, to);
    if (error) {
      toast({ title: "Error", description: "Could not load more destinations.", variant: "destructive" });
    } else if (newDests) {
      setAllDestinations(prev => [...prev, ...newDests]);
      setDestinationsPage(prev => prev + 1);
      if (newDests.length < PAGE_SIZE) setHasMoreDestinations(false);
    }
    setLoadingMoreDestinations(false);
  };
  
  useEffect(() => { if (user) loadAdminData(); }, [user]);

  const handleStatusUpdate = async (destinationId: string, status: 'approved' | 'rejected' | 'archived', destinationName: string) => {
    await logAction('destination_status_changed', { destinationId, destinationName, status });
    const { error } = await supabase.from('destinations').update({ status, updated_at: new Date().toISOString() }).eq('id', destinationId);
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Destination has been ${status}.` });
      setAllDestinations(prevDests => prevDests.map(dest => dest.id === destinationId ? { ...dest, status } : dest));
    }
  };

  // ... (Other handlers: handleUpdateUser, handleDestinationDeleted, etc. remain the same)
    const handleUpdateUser = async (userId: string, updates: any) => { /* ... */ };
    const handleDestinationDeleted = () => { /* ... */ };
    const handleOpenEditModal = (dest: any) => { /* ... */ };
    const handleCloseEditModal = () => { /* ... */ };
    const handleSaveEditModal = () => { /* ... */ };
    const handleOpenPermitsModal = (dest: any) => { /* ... */ };
    const handleClosePermitsModal = () => { /* ... */ };
    const handleDeleteUser = async (userIdToDelete: string) => { /* ... */ };
    const handleUserCreated = () => { /* ... */ };

  const formatLogEntry = (log: LogEntry) => { /* ... (this function is unchanged) */ return { icon: <div/>, message: '' } };

  if (loadingData) { /* ... (loading spinner is unchanged) */ }
  
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const totalDestinations = allDestinations.length;
  const totalUsers = allUsers.length;

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="bg-gradient-to-r from-red-600 to-red-800 py-20">{/* Header */}</div>
        <div className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">{/* Stat Cards */}</div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">{/* Infographics */}</div>
              
              <div className="grid grid-cols-1 gap-8">
                <Card className="shadow-eco">{/* Recent Activity Log with Pagination Button */}</Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
                <Card className="shadow-eco xl:col-span-3">{/* Manage All Destinations with Pagination Button */}</Card>

                {/* --- FIX: Restored Recent Ratings Card Content --- */}
                <Card className="shadow-eco">
                  <CardHeader><CardTitle className="text-xl text-forest">Recent Ratings</CardTitle></CardHeader>
                  <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                          {allRatings.slice(0, 10).map((rating: any) => (
                              <div key={rating.id} className="p-4 bg-gradient-card rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                      <div>
                                          <h4 className="font-semibold text-forest">{rating.destinations?.business_name}</h4>
                                          <p className="text-sm text-muted-foreground">by {rating.profiles?.full_name}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                          <span className="text-sm font-medium">{rating.overall_score}/5</span>
                                      </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{new Date(rating.created_at).toLocaleDateString()}</p>
                                  {rating.comments && <p className="text-sm mt-2 italic line-clamp-2">{rating.comments}</p>}
                              </div>
                          ))}
                          {allRatings.length === 0 && <p className="text-center text-muted-foreground py-8">No ratings yet</p>}
                      </div>
                  </CardContent>
                </Card>
                {/* --- END FIX --- */}

                {/* --- FIX: Restored All Users Card Content --- */}
                <Card className="shadow-eco xl:col-span-2">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl text-forest flex items-center gap-2"><Users className="h-5 w-5" /> All Users</CardTitle>
                        <Button onClick={() => setIsCreateUserModalOpen(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2"/> Create User
                        </Button>
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {filteredUsers.map((u: any) => (
                        <div key={u.user_id} className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10"><AvatarFallback>{u.full_name?.charAt(0) || u.email?.charAt(0)}</AvatarFallback></Avatar>
                            <div>
                              <h4 className="font-semibold text-forest">{u.full_name || "Anonymous"}</h4>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                              <p className="text-xs text-muted-foreground">Joined: {new Date(u.created_at || u.joined_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right"><div className="font-bold text-amber-600">{u.points || 0} pts</div></div>
                            <Dialog onOpenChange={(open) => !open && setEditingUser(null)}>
                                <DialogTrigger asChild><Button size="sm" variant="outline" onClick={() => setEditingUser(u)}><Edit2 className="w-4 w-4" /></Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Edit User: {editingUser?.full_name || editingUser?.email}</DialogTitle></DialogHeader>
                                    {editingUser && (
                                    <div className="space-y-4">
                                        <div><Label>Full Name</Label><Input defaultValue={editingUser.full_name || ""} onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})} /></div>
                                        <div><Label>Points</Label><Input type="number" defaultValue={editingUser.points || 0} onChange={(e) => setEditingUser({...editingUser, points: parseInt(e.target.value)})} /></div>
                                        <div><Label>Bio</Label><Input defaultValue={editingUser.bio || ""} onChange={(e) => setEditingUser({...editingUser, bio: e.target.value})} /></div>
                                        <div><Label>Location</Label><Input defaultValue={editingUser.location || ""} onChange={(e) => setEditingUser({...editingUser, location: e.target.value})} /></div>
                                        <Button onClick={() => handleUpdateUser(editingUser.user_id, editingUser)} className="w-full">Update User</Button>
                                    </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="destructive" disabled={u.email === user?.email}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete <strong className="text-foreground">{u.full_name || u.email}</strong> and all their data.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(u.user_id)} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {/* --- END FIX --- */}
              </div>
            </div>
        </div>
        <Footer />
      </div>
      {/* Modals */}
      <ViewPermitsModal isOpen={isPermitsModalOpen} onClose={handleClosePermitsModal} destination={viewingDestinationPermits} />
      <CreateUserModal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} onUserCreated={handleUserCreated} />
      <EditDestinationModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleSaveEditModal} onDelete={handleDestinationDeleted} destination={editingDestination} />
    </>
  );
};

export default AdminDashboard;

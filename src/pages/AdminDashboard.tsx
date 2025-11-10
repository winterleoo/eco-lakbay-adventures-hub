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

interface Destination {
  id: string;
  business_name: string;
  city: string;
  province: string;
  status: string;
  destination_permits: any[];
   owner_id: string; // Ensure this is part of the type
  owner_profile: {
      full_name: string;
  } | null;
  
   admin_profile: { full_name: string; } | null;
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

            // 1. Fetch destinations WITHOUT joins
            const { data: destData, error: destError } = await supabase
                .from('destinations')
                .select('*, destination_permits(*)')
                .order('created_at', { ascending: false })
                .range(0, PAGE_SIZE - 1);

            if (destError) throw destError;
            if (!destData) {
                setAllDestinations([]);
                // Still need to fetch other data even if destinations are empty
            } else {
                // 2. Fetch all user profiles separately
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('user_id, full_name');
                if (profilesError) throw profilesError;

                // 3. Manually "join" them in JavaScript
                const destinationsWithOwners = (destData || []).map(dest => {
                    const ownerProfile = profiles.find(p => p.user_id === dest.owner_id);
                    return {
                        ...dest,
                        owner_profile: ownerProfile ? { full_name: ownerProfile.full_name } : null,
                    };
                });

                setAllDestinations(destinationsWithOwners as Destination[]);
            }
      if ((destData || []).length < PAGE_SIZE) setHasMoreDestinations(false);
      
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      const { data: ratingsData, error: ratingsError } = await supabase.from('destination_ratings').select(`*, destinations!inner(business_name), profiles!inner(full_name)`).order('created_at', { ascending: false });
      if (ratingsError) throw ratingsError;
      setAllRatings(ratingsData || []);
      
      const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact', head: true });
      
      // --- CHANGE 1: Fetch the count of ONLY active ('approved') destinations ---
      const { count: activeDestinationsCount, error: activeDestError } = await supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');
      if (activeDestError) throw activeDestError;

      const { data: logData, error: logError } = await supabase.from('audit_log').select(`*, profiles(full_name)`).order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1);
      if (logError) throw logError;
      setActivityLog(logData || []);
      if ((logData || []).length < PAGE_SIZE) setHasMoreLogs(false);
      
      // --- CHANGE 2: Add the new active destination count to the stats object ---
      setStats({
          totalPosts: postsCount || 0,
          totalActiveDestinations: activeDestinationsCount || 0,
      });

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

        try {
            // Fetch destinations and profiles separately
            const { data: newDests, error: destError } = await supabase.from('destinations').select('*, destination_permits(*)').order('created_at', { ascending: false }).range(from, to);
            if (destError) throw destError;
            
            const { data: profiles, error: profilesError } = await supabase.from('profiles').select('user_id, full_name');
            if (profilesError) throw profilesError;

            // Manually join the new data
            if (newDests && profiles) {
                const newDestinationsWithOwners = newDests.map(dest => {
                    const ownerProfile = profiles.find(p => p.user_id === dest.owner_id);
                    return { ...dest, owner_profile: ownerProfile ? { full_name: ownerProfile.full_name } : null };
                });
                setAllDestinations(prev => [...prev, ...newDestinationsWithOwners]);
                setDestinationsPage(prev => prev + 1);
                if (newDests.length < PAGE_SIZE) setHasMoreDestinations(false);
            }
        } catch (error: any) {
             toast({ title: "Error", description: "Could not load more destinations.", variant: "destructive" });
        } finally {
            setLoadingMoreDestinations(false);
        }
    };
  
  useEffect(() => {
    if (user) loadAdminData();
  }, [user]);

const handleStatusUpdate = async (destinationId: string, status: 'approved' | 'rejected' | 'archived', destinationName: string) => {
    // Logging the action at the start is perfect.
    await logAction('destination_status_changed', { destinationId, destinationName, status });

    // Step 1: Update the database. This is correct.
    const { error } = await supabase
        .from('destinations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', destinationId);

    if (error) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        return;
    }
    
    // If the database update is successful:
    toast({ title: "Success", description: `Destination has been ${status}.` });

    // Step 2: Optimistically update the UI state. This is correct.
    setAllDestinations(prevDests => 
        prevDests.map(dest => 
            dest.id === destinationId ? { ...dest, status } : dest
        )
    );

    // Step 3: Refresh the stats. This is correct.
    const { count } = await supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved');
    setStats(prevStats => ({ ...prevStats, totalActiveDestinations: count || 0 }));
    
    // --- THIS IS THE FIX ---
    // The if condition now includes 'archived', so the email function will be called.
    if (status === 'approved' || status === 'rejected' || status === 'archived') {
        // Show a temporary "sending email" toast
        const sendingToast = toast({ title: "Sending Notification...", description: "Notifying the destination owner by email." });
        
        const { error: functionError } = await supabase.functions.invoke('send-status-email', {
            body: { destinationId, status }
        });

        // Dismiss the "sending" toast
        sendingToast.dismiss();

        if (functionError) {
            toast({
                title: "Email Failed",
                description: `Status was updated, but the email could not be sent. Error: ${functionError.message}`,
                variant: "destructive"
            });
        } else {
            toast({ title: "Notification Sent!", description: "The destination owner has been notified." });
        }
    }
};

  const handleUpdateUser = async (userId: string, updates: any) => {
    const { id, user_id, joined_at, email, ...updateData } = updates;
    const { error } = await supabase.from('profiles').update(updateData).eq('user_id', userId);
    if (error) {
      toast({ title: "User update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated successfully" });
      await logAction('user_profile_updated', { userId, userName: updates.full_name });
      setEditingUser(null);
      loadAdminData();
    }
  };

  const handleDestinationDeleted = () => {
    logAction('destination_deleted', { destinationId: editingDestination?.id, destinationName: editingDestination?.business_name });
    setIsEditModalOpen(false);
    setEditingDestination(null);
    loadAdminData();
  };

  const handleOpenEditModal = (dest: any) => { setEditingDestination(dest); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setEditingDestination(null); setIsEditModalOpen(false); };
  const handleSaveEditModal = () => { logAction('destination_details_updated', { destinationId: editingDestination?.id, destinationName: editingDestination?.business_name }); handleCloseEditModal(); toast({ title: "Success", description: "Destination details updated." }); loadAdminData(); };
  const handleOpenPermitsModal = (dest: any) => { setViewingDestinationPermits(dest); setIsPermitsModalOpen(true); };
  const handleClosePermitsModal = () => { setViewingDestinationPermits(null); setIsPermitsModalOpen(false); };

  const formatLogEntry = (log: LogEntry) => {
    let icon = <Clock className="h-4 w-4 text-muted-foreground" />;
    let message = <span className="text-muted-foreground">{log.profiles?.full_name || 'A user'}</span>;
    let actionText = '';
    switch(log.action) {
      case 'destination_status_changed':
        actionText = ` ${log.details.status} the destination "${log.details.destinationName}".`;
        if (log.details.status === 'approved') icon = <CheckCircle className="h-4 w-4 text-green-500" />; 
        else if (log.details.status === 'archived') icon = <Archive className="h-4 w-4 text-muted-foreground" />;
        else icon = <XCircle className="h-4 w-4 text-red-500" />;
        break;
      case 'user_profile_updated':
        actionText = ` updated the profile for "${log.details.userName}".`; icon = <Edit2 className="h-4 w-4 text-blue-500" />;
        break;
      case 'destination_deleted':
        actionText = ` deleted the destination "${log.details.destinationName}".`; icon = <Archive className="h-4 w-4 text-destructive" />;
        break;
      case 'destination_details_updated':
        actionText = ` updated the details for "${log.details.destinationName}".`; icon = <Edit2 className="h-4 w-4 text-blue-500" />;
        break;
      case 'new_rating_submitted':
        icon = <Star className="h-4 w-4 text-amber-500" />; actionText = ` submitted a ${log.details.rating}-star review for "${log.details.destinationName}".`;
        break;
      default:
        actionText = ` performed an action: ${log.action}.`;
    }
    return { icon, message: <>{message}{actionText}</> };
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation /><div className="flex-grow flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-forest"/></div><Footer />
      </div>
    );
  }
  
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const totalUsers = allUsers.length;

   const handleDeleteUser = async (userToDelete: { user_id: string; full_name?: string; email: string; }) => {
        // Prevent Super Admin from being deleted
        if (userToDelete.email === 'johnleomedina@gmail.com') {
          toast({ title: "Action Forbidden", description: "The Super Admin account cannot be deleted.", variant: "destructive" });
          return;
        }

        try {
            // We now call the database function directly using rpc()
            const { data, error } = await supabase.rpc('hard_delete_user', {
                user_id_to_delete: userToDelete.user_id
            });

            if (error) {
                // This error will be the specific PostgreSQL error, much more informative!
                // It will be "Permission denied..." if a non-admin somehow calls this.
                throw error;
            }

            toast({ title: "User Deleted", description: `${userToDelete.full_name || userToDelete.email} has been permanently removed.` });

            // Optimistic UI Update: Remove the user from the local state for an instant refresh
            setAllUsers(currentUsers => currentUsers.filter(u => u.user_id !== userToDelete.user_id));
            
            // Log the action
            await logAction('user_deleted', { 
                deletedUserId: userToDelete.user_id,
                deletedUserName: userToDelete.full_name || userToDelete.email
            });

        } catch (error: any) {
            toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
        }
    };

  const handleUserCreated = () => {
    setIsCreateUserModalOpen(false);
    loadAdminData();
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="bg-gradient-to-r from-red-600 to-red-800 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-6">
                    <Avatar className="w-20 h-20"><AvatarFallback className="bg-white text-red-600 text-2xl font-bold">{userName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                    <div>
                        <div className="flex items-center gap-3 mb-2"><h1 className="text-4xl font-bold">Admin Dashboard</h1><Badge variant="destructive">ADMIN</Badge></div>
                        <p className="text-xl text-white/90">Managing EcoLakbay Platform</p>
                    </div>
                </div>
            </div>
        </div>
        <div className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="shadow-eco"><CardContent className="p-6 text-center"><Users className="w-8 h-8 text-blue-600 mx-auto mb-2" /><div className="text-3xl font-bold text-blue-600 mb-2">{totalUsers}</div><div className="text-sm text-muted-foreground">Total Users</div></CardContent></Card>
                
                {/* --- CHANGE 3: The stat card now displays the active destination count and new label --- */}
                <Card className="shadow-eco">
                    <CardContent className="p-6 text-center">
                        <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalActiveDestinations || 0}</div>
                        <div className="text-sm text-muted-foreground">Active Destinations</div>
                    </CardContent>
                </Card>
                
                <Card className="shadow-eco"><CardContent className="p-6 text-center"><TrendingUp className="w-8 h-8 text-amber-600 mx-auto mb-2" /><div className="text-3xl font-bold text-amber-600 mb-2">{stats.totalPosts || 0}</div><div className="text-sm text-muted-foreground">Community Posts</div></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <Card className="shadow-eco">
                  <CardHeader><CardTitle className="text-xl text-forest">Gender Ratio</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie dataKey="value" data={[{ name: "Male", value: allUsers.filter(u => u.gender === "Male").length }, { name: "Female", value: allUsers.filter(u => u.gender === "Female").length }, { name: "Other", value: allUsers.filter(u => u.gender && !["Male", "Female"].includes(u.gender)).length }]} cx="50%" cy="50%" outerRadius={80} label>
                          <Cell fill="#2563eb" /><Cell fill="#db2777" /><Cell fill="#10b981" />
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="shadow-eco">
                    <CardHeader><CardTitle className="text-xl text-forest">Nationality Distribution</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.entries(allUsers.reduce((acc, u) => { let nat = u.nationality || "Not Specified"; acc[nat] = (acc[nat] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}>
                                <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#16a34a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="shadow-eco">
                    <CardHeader><CardTitle className="text-xl text-forest">Top Towns / Cities</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={Object.entries(allUsers.reduce((acc, u) => { if (u.town) { acc[u.town] = (acc[u.town] || 0) + 1; } return acc; }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)}>
                                <XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#f59e0b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 gap-8 mb-8">
                <Card className="shadow-eco">
                 <CardHeader><CardTitle className="text-xl text-forest">Recent Activity Log</CardTitle></CardHeader>
                 <CardContent>
                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                     {activityLog.length > 0 ? activityLog.map(log => {
                       const { icon, message } = formatLogEntry(log);
                       return (
                         <div key={log.id} className="flex items-start gap-3">
                           <div className="mt-1">{icon}</div>
                           <div className="flex-1">
                             <p className="text-sm">{message}</p>
                             <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                           </div>
                         </div>
                       );
                     }) : (<p className="text-center text-muted-foreground py-8">No recent activity found.</p>)}
                   </div>
                   {hasMoreLogs && (
                     <div className="text-center mt-4">
                       <Button onClick={loadMoreLogs} disabled={loadingMoreLogs} variant="outline">
                         {loadingMoreLogs ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>) : ('Load More')}
                       </Button>
                     </div>
                   )}
                 </CardContent>
               </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Card className="shadow-eco xl:col-span-3">
                  <CardHeader><CardTitle className="text-xl text-forest">Manage All Destinations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {allDestinations.map((dest) => (
                        <div key={dest.id} className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                          <div>
                            <p className="font-semibold">{dest.business_name}</p>
                            <p className="text-sm text-muted-foreground">{dest.city}, {dest.province}</p>
                           {dest.owner_profile && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Registered by: <strong>{dest.owner_profile.full_name}</strong>
                                                    </p>
                                                )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusColors[dest.status] || 'default'} className="capitalize w-24 justify-center">{dest.status}</Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenPermitsModal(dest)}><FileText className="mr-2 h-4 w-4" />View Permits</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenEditModal(dest)}><Edit2 className="mr-2 h-4 w-4" />Update Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(dest.id, 'approved', dest.business_name)} disabled={dest.status === 'approved'}>Approve</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(dest.id, 'rejected', dest.business_name)} disabled={dest.status === 'rejected'}>Reject</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(dest.id, 'archived', dest.business_name)} className="text-destructive" disabled={dest.status === 'archived'}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMoreDestinations && (
                      <div className="text-center mt-4">
                        <Button onClick={loadMoreDestinations} disabled={loadingMoreDestinations} variant="outline">
                          {loadingMoreDestinations ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>) : ('Load More Destinations')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                                          <Star className="h-4 w-4 text-amber-500" />
                                          <span className="text-sm font-medium">{rating.overall_score}/5</span>
                                      </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{new Date(rating.created_at).toLocaleDateString()}</p>
                                  {rating.comments && <p className="text-sm mt-2 italic line-clamp-2">"{rating.comments}"</p>}
                              </div>
                          ))}
                          {allRatings.length === 0 && <p className="text-center text-muted-foreground py-8">No ratings yet</p>}
                      </div>
                  </CardContent>
                </Card>

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
                        <Input placeholder="Search users by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
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
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(u)}  className="bg-destructive hover:bg-destructive/90">
                                                        Confirm Delete
                                                    </AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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

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

// --- PAGINATION: Define a constant for how many items to fetch per page ---
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

  // --- PAGINATION: State for Activity Log ---
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  // --- PAGINATION: State for Destinations ---
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
      // Reset pagination state on full reload
      setActivityLogPage(1);
      setDestinationsPage(1);
      setHasMoreLogs(true);
      setHasMoreDestinations(true);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      setProfile(profileData);

      // --- PAGINATION: Fetch only the first page of destinations ---
      const { data: destData, error: destError } = await supabase.from('destinations').select('*, destination_permits(*)').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1);
      if (destError) throw destError;
      setAllDestinations(destData || []);
      if ((destData || []).length < PAGE_SIZE) {
        setHasMoreDestinations(false);
      }
      
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      const { data: ratingsData, error: ratingsError } = await supabase.from('destination_ratings').select(`*, destinations!inner(business_name), profiles!inner(full_name)`).order('created_at', { ascending: false });
      if (ratingsError) throw ratingsError;
      setAllRatings(ratingsData || []);
      
      const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact', head: true });
      const { count: calculatorCount } = await supabase.from('calculator_entries').select('id', { count: 'exact', head: true });

      // --- PAGINATION: Fetch only the first page of the activity log ---
      const { data: logData, error: logError } = await supabase
        .from('audit_log')
        .select(`*, profiles(full_name)`)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);
        
      if (logError) throw logError;
      setActivityLog(logData || []);
      if ((logData || []).length < PAGE_SIZE) {
        setHasMoreLogs(false);
      }

    } catch (error: any) {
        toast({ title: "Data Loading Error", description: `Failed to load admin data: ${error.message}.`, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };
  
  // --- PAGINATION: Function to load more activity logs ---
  const loadMoreLogs = async () => {
    if (loadingMoreLogs || !hasMoreLogs) return;
    setLoadingMoreLogs(true);
    const from = activityLogPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: newLogs, error } = await supabase
      .from('audit_log')
      .select(`*, profiles(full_name)`)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      toast({ title: "Error", description: "Could not load more activity.", variant: "destructive" });
    } else if (newLogs) {
      setActivityLog(prev => [...prev, ...newLogs]);
      setActivityLogPage(prev => prev + 1);
      if (newLogs.length < PAGE_SIZE) {
        setHasMoreLogs(false);
      }
    }
    setLoadingMoreLogs(false);
  };

  // --- PAGINATION: Function to load more destinations ---
  const loadMoreDestinations = async () => {
    if (loadingMoreDestinations || !hasMoreDestinations) return;
    setLoadingMoreDestinations(true);
    const from = destinationsPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const { data: newDests, error } = await supabase
      .from('destinations')
      .select('*, destination_permits(*)')
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (error) {
      toast({ title: "Error", description: "Could not load more destinations.", variant: "destructive" });
    } else if (newDests) {
      setAllDestinations(prev => [...prev, ...newDests]);
      setDestinationsPage(prev => prev + 1);
      if (newDests.length < PAGE_SIZE) {
        setHasMoreDestinations(false);
      }
    }
    setLoadingMoreDestinations(false);
  };
  
  useEffect(() => {
    if (user) loadAdminData();
  }, [user]);

  const handleStatusUpdate = async (destinationId: string, status: 'approved' | 'rejected' | 'archived', destinationName: string) => {
    await logAction('destination_status_changed', { destinationId, destinationName, status });
    const { error } = await supabase.from('destinations').update({ status, updated_at: new Date().toISOString() }).eq('id', destinationId);
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Destination has been ${status}.` });
      // --- PAGINATION: Update state locally instead of full reload ---
      setAllDestinations(prevDests => prevDests.map(dest => 
        dest.id === destinationId ? { ...dest, status } : dest
      ));
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
    loadAdminData(); // Full reload is okay after a deletion
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
        else icon = <XCircle className="h-4 w-4 text-red-500" />;
        break;
      case 'user_profile_updated':
        actionText = ` updated the profile for "${log.details.userName}".`;
        icon = <Edit2 className="h-4 w-4 text-blue-500" />;
        break;
      case 'destination_deleted':
        actionText = ` deleted the destination "${log.details.destinationName}".`;
        icon = <Archive className="h-4 w-4 text-destructive" />;
        break;
      case 'destination_details_updated':
        actionText = ` updated the details for "${log.details.destinationName}".`;
        icon = <Edit2 className="h-4 w-4 text-blue-500" />;
        break;
      case 'new_rating_submitted':
        icon = <Star className="h-4 w-4 text-amber-500" />;
        actionText = ` submitted a ${log.details.rating}-star review for "${log.details.destinationName}".`;
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
  const totalDestinations = allDestinations.length; // This now shows the count of loaded destinations
  const totalUsers = allUsers.length;

  const handleDeleteUser = async (userIdToDelete: string) => {
    try {
      const { error } = await supabase.functions.invoke('hard-delete-user', { body: { user_id_to_delete: userIdToDelete } });
      if (error) throw error;
      toast({ title: "User Deleted", description: "The user has been permanently removed."});
      await logAction('user_deleted', { deletedUserId: userIdToDelete });
      loadAdminData();
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive"});
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
                <Card className="shadow-eco"><CardContent className="p-6 text-center"><MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" /><div className="text-3xl font-bold text-green-600 mb-2">{totalDestinations}</div><div className="text-sm text-muted-foreground">Loaded Destinations</div></CardContent></Card>
                <Card className="shadow-eco"><CardContent className="p-6 text-center"><TrendingUp className="w-8 h-8 text-amber-600 mx-auto mb-2" /><div className="text-3xl font-bold text-amber-600 mb-2">{stats.totalPosts || 0}</div><div className="text-sm text-muted-foreground">Community Posts</div></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <Card className="shadow-eco">{/* Gender Ratio Card */}</Card>
                <Card className="shadow-eco">{/* Nationality Distribution Card */}</Card>
                <Card className="shadow-eco">{/* Top Towns / Cities Card */}</Card>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
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

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
                <Card className="shadow-eco xl:col-span-3">
                  <CardHeader><CardTitle className="text-xl text-forest">Manage All Destinations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {allDestinations.map((dest) => (
                        <div key={dest.id} className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                          <div>
                            <p className="font-semibold">{dest.business_name}</p>
                            <p className="text-sm text-muted-foreground">{dest.city}, {dest.province}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusColors[dest.status] || 'default'} className="capitalize w-24 justify-center">{dest.status}</Badge>
                            <DropdownMenu>{/* Dropdown Menu content */}</DropdownMenu>
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
                    <CardContent>{/* Recent Ratings Content */}</CardContent>
                </Card>

                <Card className="shadow-eco xl:col-span-2">
                  <CardHeader>{/* All Users Header */}</CardHeader>
                  <CardContent>{/* All Users Content */}</CardContent>
                </Card>
              </div>
            </div>
        </div>
        <Footer />
      </div>

      <ViewPermitsModal isOpen={isPermitsModalOpen} onClose={handleClosePermitsModal} destination={viewingDestinationPermits} />
      <CreateUserModal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} onUserCreated={handleUserCreated} />
      <EditDestinationModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleSaveEditModal} onDelete={handleDestinationDeleted} destination={editingDestination} />
    </>
  );
};

export default AdminDashboard;

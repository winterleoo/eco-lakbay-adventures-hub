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

  // --- PAGINATION: State for Activity Log pagination ---
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);

  // --- PAGINATION: State for Destinations pagination ---
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
      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      setProfile(profileData);

      // --- PAGINATION: Fetch the first page of destinations ---
      const { data: destData, error: destError } = await supabase.from('destinations').select('*, destination_permits(*)').order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1);
      if (destError) throw destError;
      setAllDestinations(destData || []);
      if (destData.length < PAGE_SIZE) setHasMoreDestinations(false); // Check if there's more to load

      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      const { data: ratingsData, error: ratingsError } = await supabase.from('destination_ratings').select(`*, destinations!inner(business_name), profiles!inner(full_name)`).order('created_at', { ascending: false });
      if (ratingsError) throw ratingsError;
      setAllRatings(ratingsData || []);
        
      const { count: postsCount } = await supabase.from('posts').select('id', { count: 'exact', head: true });
      const { count: calculatorCount } = await supabase.from('calculator_entries').select('id', { count: 'exact', head: true });
      
      // --- PAGINATION: Fetch the first page of the activity log ---
      const { data: logData, error: logError } = await supabase
        .from('audit_log')
        .select(`*, profiles(full_name)`)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);
        
      if (logError) throw logError;
      setActivityLog(logData || []);
      if(logData.length < PAGE_SIZE) setHasMoreLogs(false); // Check if there's more to load

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
      // Refresh only the specific item instead of the whole list for better UX
      setAllDestinations(prev => prev.map(d => d.id === destinationId ? {...d, status} : d));
    }
  };

  // ... (other handler functions like handleUpdateUser, handleDestinationDeleted, etc. remain the same)
  const handleUpdateUser = async (userId: string, updates: any) => { /* ... */ };
  const handleDestinationDeleted = () => { /* ... */ };
  const handleOpenEditModal = (dest: any) => { setEditingDestination(dest); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setEditingDestination(null); setIsEditModalOpen(false); };
  const handleSaveEditModal = () => { logAction('destination_details_updated', { destinationId: editingDestination?.id, destinationName: editingDestination?.business_name }); handleCloseEditModal(); toast({ title: "Success", description: "Destination details updated." }); loadAdminData(); };
  const handleOpenPermitsModal = (dest: any) => { setViewingDestinationPermits(dest); setIsPermitsModalOpen(true); };
  const handleClosePermitsModal = () => { setViewingDestinationPermits(null); setIsPermitsModalOpen(false); };
  const handleDeleteUser = async (userIdToDelete: string) => { /* ... */ };
  const handleUserCreated = () => { setIsCreateUserModalOpen(false); loadAdminData(); };

  const formatLogEntry = (log: LogEntry) => { /* ... (this function remains unchanged) */ return { icon: <div/>, message: '' } };

  if (loadingData) { /* ... (this block remains unchanged) */ }
  
  // ... (some variable declarations remain the same)
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navigation />
        {/* ... (Header section remains unchanged) */}

        <div className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* ... (Stats and Infographics Cards remain unchanged) */}

              {/* User Activity Log */}
              <Card className="shadow-eco xl:col-span-1">
                <CardHeader><CardTitle className="text-xl text-forest">Recent Activity Log</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {activityLog.length > 0 ? activityLog.map(log => {
                      const { icon, message } = formatLogEntry(log);
                      return (
                        <div key={log.id} className="flex items-start gap-3">
                          {/* ... (log item rendering) */}
                        </div>
                      );
                    }) : (<p className="text-center text-muted-foreground py-8">No recent activity found.</p>)}
                  </div>
                  {/* --- PAGINATION: Add Load More button for Activity Log --- */}
                  {hasMoreLogs && (
                    <div className="text-center mt-4">
                      <Button onClick={loadMoreLogs} disabled={loadingMoreLogs} variant="outline">
                        {loadingMoreLogs ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>


              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <Card className="shadow-eco xl:col-span-3">
                  <CardHeader><CardTitle className="text-xl text-forest">Manage All Destinations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {allDestinations.map((dest) => (
                           <div key={dest.id} className="flex items-center justify-between p-4 bg-gradient-card rounded-lg">
                                {/* ... (destination item rendering) */}
                           </div>
                        ))}
                    </div>
                     {/* --- PAGINATION: Add Load More button for Destinations --- */}
                    {hasMoreDestinations && (
                        <div className="text-center mt-4">
                            <Button onClick={loadMoreDestinations} disabled={loadingMoreDestinations} variant="outline">
                                {loadingMoreDestinations ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                                ) : (
                                    'Load More Destinations'
                                )}
                            </Button>
                        </div>
                    )}
                  </CardContent>
                </Card>
                {/* ... (Other cards like Recent Ratings and All Users remain) */}
              </div>
            </div>
        </div>
        <Footer />
      </div>
      {/* ... (Modals remain unchanged) */}
    </>
  );
};

export default AdminDashboard;

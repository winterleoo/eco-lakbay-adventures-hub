import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // --- THIS IS THE FIX ---
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MoreHorizontal, Users, Shield, TrendingUp, Activity, Search, Plus, Edit, BarChart3, Trash2, Clock, PieChart as PieChartIcon, MapPin } from "lucide-react";
import { Navigate } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, Archive, FileText, Download, Loader2, Star, CheckCircle, XCircle } from "lucide-react";
interface Destination {
  id: string;
  business_name: string;
  city: string;
  province: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  admin_profile: {
    full_name: string;
  } | null;
}
const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  pending: 'secondary', approved: 'default', rejected: 'destructive', archived: 'outline',
};
interface LogEntry {
  id: number;
  created_at: string;
  action: string;
  details: { [key: string]: any; };
  profiles: { full_name: string; } | null;
}

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, loading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", bio: "", location: "" });
  const [stats, setStats] = useState({
    totalUsers: 0, totalPosts: 0, totalDestinations: 0, totalAdmins: 0,
    pendingDestinations: 0
  });
  const [userGrowthChartData, setUserGrowthChartData] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]); // --- MODIFIED ---
  const [destinationStatusChartData, setDestinationStatusChartData] = useState<any[]>([]);
    const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
     const [loadingData, setLoadingData] = useState(true); 

  const isSuperAdmin = user?.email === 'johnleomedina@gmail.com' && isAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllData();
    }
  }, [isSuperAdmin]);

   // --- MODIFIED ---: Modify the destinations fetch query
     const fetchAllData = async () => {
        setLoadingData(true); // Assuming you have setLoading defined
        try {
            // Fetch users and roles
            const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
            if (profilesError) throw profilesError;
            const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('user_id, role');
            if (rolesError) throw rolesError;
            const usersWithRoles = profiles.map(p => ({ ...p, role: userRoles.find(ur => ur.user_id === p.user_id)?.role || 'user' }));
            setUsers(usersWithRoles);

            // Fetch destinations and logs in parallel for efficiency
            const [destResponse, logResponse] = await Promise.all([
                supabase.from('destinations').select(`*, admin_profile:admin_id(full_name)`).order('created_at', { ascending: false }),
                supabase.from('audit_log').select(`*, profiles(full_name)`).order('created_at', { ascending: false }).limit(20)
            ]);

            if (destResponse.error) throw destResponse.error;
            setDestinations(destResponse.data as Destination[] || []);

            if (logResponse.error) throw logResponse.error;
            setActivityLog(logResponse.data || []);
            
            // Fetch stats and charts
            await fetchStats();
            await fetchChartData(profiles || []);

        } catch (error: any) {
            toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false); // Assuming you have this state
        }
    };
    
    useEffect(() => {
        if (isSuperAdmin) fetchAllData();
    }, [isSuperAdmin]);
     const formatLogEntry = (log: LogEntry) => {
        let icon = <Clock className="h-4 w-4 text-muted-foreground" />;
        let message = <span>{log.profiles?.full_name || 'A user'}</span>;
        let actionText = '';

        switch(log.action) {
            case 'destination_status_changed':
                actionText = ` ${log.details.status} "${log.details.destinationName}".`;
                if (log.details.status === 'approved') icon = <CheckCircle className="h-4 w-4 text-green-500" />;
                else icon = <XCircle className="h-4 w-4 text-red-500" />;
                break;
            // ... include all your other cases for different log types
            default:
                actionText = ` performed action: ${log.action}.`;
        }
        return { icon, message: <>{message}{actionText}</> };
    };


  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    if (profilesError) throw profilesError;
    const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('user_id, role');
    if (rolesError) throw rolesError;
    const usersWithRoles = profiles?.map(profile => ({ ...profile, role: userRoles?.find(ur => ur.user_id === profile.user_id)?.role || 'user' }));
    setUsers(usersWithRoles || []);
  };

  const fetchStats = async () => {
    const [usersResult, postsResult, destinationsResult, adminsResult, pendingDestinationsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('posts').select('id', { count: 'exact' }),
      supabase.from('destinations').select('id', { count: 'exact' }),
      supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'admin'),
      supabase.from('destinations').select('id', { count: 'exact' }).eq('status', 'pending'),
    ]);
    setStats({
      totalUsers: usersResult.count || 0,
      totalPosts: postsResult.count || 0,
      totalDestinations: destinationsResult.count || 0,
      totalAdmins: adminsResult.count || 0,
      pendingDestinations: pendingDestinationsResult.count || 0,
    });
  };

  const fetchChartData = async () => {
    const { data: userGrowth, error: userGrowthError } = await supabase.rpc('get_daily_user_signups');
    if (userGrowthError) console.error("Error fetching user growth:", userGrowthError);
    else setUserGrowthChartData(userGrowth.map((d: any) => ({ ...d, date: new Date(d.signup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })));

    const { data: destStatus, error: destStatusError } = await supabase.rpc('get_destination_status_counts');
    if (destStatusError) console.error("Error fetching destination statuses:", destStatusError);
    else setDestinationStatusChartData(destStatus);
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert([{ user_id: userId, role: 'admin' }]);
      if (error) throw error;
      toast({ title: "Success", description: "User promoted to admin." });
      fetchAllData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to promote user.", variant: "destructive" });
    }
  };

  const removeAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_roles').delete().match({ user_id: userId, role: 'admin' });
      if (error) throw error;
      toast({ title: "Success", description: "Admin role removed." });
      fetchAllData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove admin role.", variant: "destructive" });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || "", email: user.email || "", bio: user.bio || "", location: user.location || "" });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name, bio: editForm.bio, location: editForm.location }).eq('user_id', editingUser.user_id);
      if (error) throw error;
      toast({ title: "Success", description: "User updated successfully." });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userIdToDelete: string, userEmail: string) => {
    if (userEmail === 'johnleomedina@gmail.com') {
      toast({ title: "Action Forbidden", description: "The Super Admin account cannot be deleted.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc('hard_delete_user', { user_id_to_delete: userIdToDelete });
      if (error) throw error;
      toast({ title: "Success", description: "User and all their data have been permanently deleted." });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to delete user: ${error.message}`, variant: "destructive" });
    }
  };


  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const PIE_CHART_COLORS: { [key: string]: string } = { approved: "#22c55e", pending: "#f59e0b", rejected: "#ef4444", archived: "#64748b" };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-forest mb-2">Super Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform health, analytics, and user management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Destinations</CardTitle><MapPin className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalDestinations}</div></CardContent></Card>
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Pending Destinations</CardTitle><Clock className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pendingDestinations}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Admins</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalAdmins}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>New Users (Last 7 Days)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={{ count: { label: "New Users" } }} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userGrowthChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Destination Status Breakdown</CardTitle></CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <ChartContainer config={{}} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={destinationStatusChartData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                        {destinationStatusChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[entry.status as keyof typeof PIE_CHART_COLORS] || '#8884d8'} />))}
                      </Pie>
                      <Legend />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

                              {/* Activity Log takes up 1/3 of the width */}
                        <div className="lg:col-span-1 space-y-8">
                           <Card>
                               <CardHeader><CardTitle>Recent Activity Log</CardTitle></CardHeader>
                               <CardContent>
                                   <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                       {activityLog.length > 0 ? activityLog.map(log => {
                                           const { icon, message } = formatLogEntry(log);
                                           return (
                                               <div key={log.id} className="flex items-start gap-3 text-sm">
                                                   <div className="mt-1">{icon}</div>
                                                   <div className="flex-1">
                                                       <p>{message}</p>
                                                       <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                                                   </div>
                                               </div>
                                           );
                                       }) : (<p className="text-center text-muted-foreground py-8">No recent activity.</p>)}
                                   </div>
                               </CardContent>
                            </Card>
                        </div>


          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{user.full_name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.email === 'johnleomedina@gmail.com' ? <Badge variant="destructive">Super Admin</Badge> : user.role === 'admin' ? <Badge variant="secondary">Admin</Badge> : <Badge variant="outline">User</Badge>}
                        <Dialog onOpenChange={(open) => !open && setEditingUser(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-1" />Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
                            {editingUser && (
                              <div className="space-y-4">
                                <div><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} /></div>
                                <div><Label htmlFor="email">Email (Read-only)</Label><Input id="email" value={editForm.email} disabled /></div>
                                <div><Label htmlFor="bio">Bio</Label><Input id="bio" value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} /></div>
                                <div><Label htmlFor="location">Location</Label><Input id="location" value={editForm.location} onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))} /></div>
                                <Button onClick={handleUpdateUser} className="w-full">Update Profile</Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {user.email !== 'johnleomedina@gmail.com' && (
                          user.role !== 'admin' ? 
                            <Button size="sm" onClick={() => promoteToAdmin(user.user_id)}><Plus className="h-4 w-4 mr-1" /> Make Admin</Button> : 
                            <Button size="sm" variant="outline" onClick={() => removeAdminRole(user.user_id)}>Remove Admin</Button>
                        )}
                        {user.email !== 'johnleomedina@gmail.com' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action is irreversible. It will permanently delete this user and all their associated data (posts, destinations, etc.).</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.user_id, user.email)}>Confirm Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SuperAdminDashboard;

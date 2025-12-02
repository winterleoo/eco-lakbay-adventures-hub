import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Medal, Trophy } from "lucide-react";
// --- NEW ---: Import the new modal
import { LeaderboardModal } from "@/components/LeaderboardModal"; 

// --- NEW ---: Gamification and Leveling System
const levels = [
  { name: "Eco Starter", points: 0, icon: <Award className="h-5 w-5 text-yellow-600"/> },
  { name: "Green Apprentice", points: 100, icon: <Award className="h-5 w-5 text-yellow-600"/> },
  { name: "Trailblazer", points: 500, icon: <Medal className="h-5 w-5 text-gray-400"/> },
  { name: "Eco Warrior", points: 1500, icon: <Medal className="h-5 w-5 text-gray-400"/> },
  { name: "Planet Guardian", points: 5000, icon: <Trophy className="h-5 w-5 text-amber-400"/> },
];

const getUserLevel = (points: number) => {
  let currentLevel = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].points) {
      currentLevel = levels[i];
      break;
    }
  }
  const nextLevel = levels.find(l => l.points > currentLevel.points);
  return { currentLevel, nextLevel };
};

// --- Profile Interface for type safety ---
interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  points: number;
}
interface LeaderboardUser {
  user_id: string;
  full_name: string;
  points: number;
  avatar_url?: string;
}

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [fullLeaderboard, setFullLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      // Fetch profile, rank, and leaderboard in parallel
      const [profileResponse, rankResponse, leaderboardResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.rpc('get_user_rank', { p_user_id: user.id }),
        supabase.from('profiles').select('full_name, points').order('points', { ascending: false, nullsLast: true }).limit(5)
      ]);

      if (profileResponse.error) throw profileResponse.error;
      setProfile(profileResponse.data);
      
      if (rankResponse.error) throw rankResponse.error;
      setUserRank(rankResponse.data);

      if (leaderboardResponse.error) throw leaderboardResponse.error;
      setLeaderboard(leaderboardResponse.data);
      
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoadingData(false);
    }
  };
  const fetchFullLeaderboard = async () => {
    setIsLeaderboardModalOpen(true);
    setLeaderboardLoading(true);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('user_id, full_name, points, avatar_url')
            .order('points', { ascending: false, nullsLast: true });

        if (error) throw error;
        setFullLeaderboard(data || []);
    } catch (error) {
        console.error("Error fetching full leaderboard:", error);
    } finally {
        setLeaderboardLoading(false);
    }
  };

  if (loadingData || !profile) { /* ... your loading component ... */ }

  const userName = profile?.full_name || 'Eco Traveler';
  const userPoints = profile?.points || 0;
  const { currentLevel, nextLevel } = getUserLevel(userPoints);
  
  const progressToNextLevel = nextLevel 
    ? ((userPoints - currentLevel.points) / (nextLevel.points - currentLevel.points)) * 100 
    : 100;

  return (
    <>
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* --- Header Section --- */}
      <div className="bg-gradient-hero py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-6">
          <Avatar className="w-20 h-20 border-4 border-white/50">
            <AvatarFallback className="bg-white text-forest text-2xl font-bold">{userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-bold mb-1 text-white">Welcome back, {userName}!</h1>
            <div className="flex items-center gap-3">
              {currentLevel.icon}
              <p className="text-xl text-white/90">{currentLevel.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* --- NEW "YOUR PROGRESS" CARD --- */}
              <Card className="shadow-eco">
                <CardHeader><CardTitle className="text-2xl text-forest">Your Progress</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center mb-6">
                    <div>
                      <div className="text-3xl font-bold text-amber-500">{userPoints.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-forest">{currentLevel.name}</div>
                      <div className="text-sm text-muted-foreground">Current Badge</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-500">#{userRank || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Global Rank</div>
                    </div>
                  </div>
                  {nextLevel && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progress to {nextLevel.name}</span>
                        <span className="text-sm text-muted-foreground">{userPoints.toLocaleString()} / {nextLevel.points.toLocaleString()}</span>
                      </div>
                      <Progress value={progressToNextLevel} className="h-3" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {(nextLevel.points - userPoints).toLocaleString()} points to the next badge!
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* --- Your Achievements Card (Simplified) --- */}
              <Card className="shadow-eco">
                <CardHeader><CardTitle className="text-xl text-forest">Your Badges</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                    {levels.map((level) => (
                      <div key={level.name} className="flex flex-col items-center">
                        <div className={`p-3 rounded-full ${userPoints >= level.points ? 'bg-amber-100' : 'bg-muted grayscale opacity-60'}`}>
                           {level.icon}
                        </div>
                        <p className={`text-xs mt-2 ${userPoints >= level.points ? 'font-semibold text-forest' : 'text-muted-foreground'}`}>{level.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* --- LEADERBOARD CARD --- */}
            <div className="space-y-6">
              <Card className="shadow-eco">
                <CardHeader>
                  <CardTitle className="text-xl text-forest">Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leaderboard.map((player, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <span className="font-bold text-muted-foreground w-6">{["🏆", "🥈", "🥉"][index] || `${index + 1}.`}</span>
                           <p className={`font-medium ${player.full_name === profile.full_name ? 'text-forest' : ''}`}>{player.full_name}</p>
                        </div>
                        <Badge variant="secondary">{player.points.toLocaleString()} pts</Badge>
                      </div>
                    ))}
                  </div>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-6" 
                      onClick={fetchFullLeaderboard}
                    >
                      View Full Leaderboard
                  </Button>

                </CardContent>
              </Card>
            </div>
          </div>
      </div>
      <Footer />
    </div>
      <LeaderboardModal 
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        users={fullLeaderboard}
        loading={leaderboardLoading}
        currentUser_id={user?.id}
      />
    </>
  );
};

export default UserDashboard;
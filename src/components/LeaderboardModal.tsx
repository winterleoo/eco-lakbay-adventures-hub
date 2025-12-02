import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Define the shape of a user on the leaderboard
interface LeaderboardUser {
  user_id: string;
  full_name: string;
  points: number;
  avatar_url?: string;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: LeaderboardUser[];
  loading: boolean;
  currentUser_id?: string; // Optional: to highlight the current user
}

// Helper to generate initials for the avatar fallback
const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

// Helper for rank indicators
const getRankIndicator = (i: number) => ["🏆", "🥈", "🥉"][i] || `${i + 1}.`;

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, users, loading, currentUser_id }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Full Leaderboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          {loading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-forest" />
            </div>
          ) : users.length > 0 ? (
            users.map((user, index) => (
              <div
                key={user.user_id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  user.user_id === currentUser_id ? 'bg-forest/10 border border-forest' : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold w-8 text-center text-lg text-muted-foreground">
                    {getRankIndicator(index)}
                  </span>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.full_name}</span>
                </div>
                <Badge variant={index < 3 ? "gold" : "secondary"}>{user.points?.toLocaleString() || 0} pts</Badge>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">Leaderboard is empty.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
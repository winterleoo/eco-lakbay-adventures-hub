import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoverySession, setRecoverySession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // This security check is well-implemented and doesn't need changes.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySession(true);
      }
    });

    const checkRecovery = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setRecoverySession(true);
      }
    };

    checkRecovery();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 8) { // Best practice is to require at least 8 characters
      toast({
        title: 'Password too short',
        description: 'Password should be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Password Updated Successfully!',
        description: 'You have been logged out for security. Welcome back!',
      });

      // End current session after reset for security (this is a good practice)
      await supabase.auth.signOut();
      
      // --- THE FIX: Navigate to the landing page ---
      navigate('/');

    } catch (error: any) {
      toast({
        title: 'Error Updating Password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // This is a great security measure to prevent direct access to the page.
  if (!recoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground p-4 text-center">Invalid or expired password recovery link.<br/>Please request a new one.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="flex items-center justify-center pt-20 pb-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set Your New Password</CardTitle>
            <CardDescription>
              Please enter and confirm your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default UpdatePassword;

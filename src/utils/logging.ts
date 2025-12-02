import { supabase } from '@/integrations/supabase/client';

export const logAction = async (action: string, details: object = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Cannot log action: no user is logged in.");
      return;
    }
    
    const { error } = await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      details,
    });
    
    if (error) {
      console.error("Error logging action:", error);
    }
  } catch (err) {
    console.error("Failed to get user for logging:", err);
  }
};
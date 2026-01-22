import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserRoleResult {
  isMaster: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleResult {
  const { user } = useAuth();

  const { data: isMaster = false, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'master')
        .maybeSingle();

      if (error) {
        console.error('[useUserRole] Error checking master role:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { isMaster, isLoading };
}

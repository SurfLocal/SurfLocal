import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        console.log('[useAdmin] No user, setting isAdmin to false');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('[useAdmin] Checking admin status for user:', user.id);
      try {
        const data = await api.auth.checkAdmin();
        console.log('[useAdmin] Admin check response:', data);
        setIsAdmin(data.is_admin || false);
      } catch (error) {
        console.error('[useAdmin] Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};

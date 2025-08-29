import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { BusinessService } from '@/agent3-features/business/business-service';
import type { Database } from '@/agent1-foundation/config/supabase-client';

type Business = Database['public']['Tables']['businesses']['Row'];

export function useBusiness() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const loadBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get existing business for this user
        let businessData = await BusinessService.getBusinessByOwner(user.id);
        
        // If no business exists, create one
        if (!businessData) {
          businessData = await BusinessService.createBusiness({
            name: user.user_metadata?.name || 'My Business',
            owner_id: user.id,
            subscription_tier: 'free',
            settings: {
              auto_sync: true,
              batch_size: 50,
              mobile_first: true
            },
            billing_info: {},
            usage_metrics: {
              api_calls: 0,
              storage_mb: 0
            }
          });
        }
        
        setBusiness(businessData);
      } catch (err) {
        console.error('Error loading business:', err);
        setError(err instanceof Error ? err.message : 'Failed to load business');
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [user]);

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!business) return;
    
    try {
      const updatedBusiness = await BusinessService.updateBusiness(business.id, updates);
      setBusiness(updatedBusiness);
      return updatedBusiness;
    } catch (err) {
      console.error('Error updating business:', err);
      throw err;
    }
  };

  const refreshBusiness = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const businessData = await BusinessService.getBusinessByOwner(user.id);
      setBusiness(businessData);
    } catch (err) {
      console.error('Error refreshing business:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh business');
    } finally {
      setLoading(false);
    }
  };

  return {
    business,
    loading,
    error,
    updateBusiness,
    refreshBusiness
  };
}

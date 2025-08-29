import { useState, useEffect, useCallback } from 'react';
import { StripeService, SubscriptionPlan } from './stripe-service';
import Stripe from 'stripe';

export interface BillingState {
  customer: Stripe.Customer | null;
  subscription: Stripe.Subscription | null;
  paymentMethods: Stripe.PaymentMethod[];
  invoices: Stripe.Invoice[];
  upcomingInvoice: Stripe.Invoice | null;
  currentPlan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
}

export interface UsageLimits {
  users: { used: number; limit: number };
  scans: { used: number; limit: number };
  aiRequests: { used: number; limit: number };
  storage: { used: string; limit: string };
}

// Main billing hook
export function useBilling() {
  const [state, setState] = useState<BillingState>({
    customer: null,
    subscription: null,
    paymentMethods: [],
    invoices: [],
    upcomingInvoice: null,
    currentPlan: null,
    loading: true,
    error: null,
  });

  const updateState = useCallback((updates: Partial<BillingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load billing data
  const loadBillingData = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      // This would typically call your API which then calls Stripe
      const response = await fetch('/api/billing/customer', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load billing data');
      }

      const data = await response.json();
      
      updateState({
        customer: data.customer,
        subscription: data.subscription,
        paymentMethods: data.paymentMethods || [],
        invoices: data.invoices || [],
        upcomingInvoice: data.upcomingInvoice,
        currentPlan: data.currentPlan,
        loading: false,
      });
    } catch (error) {
      updateState({
        loading: false,
        error: error.message,
      });
    }
  }, [updateState]);

  // Create checkout session
  const createCheckoutSession = useCallback(async (priceId: string) => {
    try {
      updateState({ loading: true, error: null });

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      updateState({
        loading: false,
        error: error.message,
      });
    }
  }, [updateState]);

  // Create portal session
  const createPortalSession = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      updateState({
        loading: false,
        error: error.message,
      });
    }
  }, [updateState]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (immediately: boolean = false) => {
    try {
      updateState({ loading: true, error: null });

      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ immediately }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await loadBillingData();
    } catch (error) {
      updateState({
        loading: false,
        error: error.message,
      });
    }
  }, [updateState, loadBillingData]);

  // Reactivate subscription
  const reactivateSubscription = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });

      const response = await fetch('/api/billing/reactivate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      await loadBillingData();
    } catch (error) {
      updateState({
        loading: false,
        error: error.message,
      });
    }
  }, [updateState, loadBillingData]);

  // Load data on mount
  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  return {
    ...state,
    actions: {
      reload: loadBillingData,
      createCheckoutSession,
      createPortalSession,
      cancelSubscription,
      reactivateSubscription,
    },
  };
}

// Usage tracking hook
export function useUsageTracking() {
  const [usage, setUsage] = useState<UsageLimits>({
    users: { used: 0, limit: 3 },
    scans: { used: 0, limit: 500 },
    aiRequests: { used: 0, limit: 10 },
    storage: { used: '0MB', limit: '1GB' },
  });
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/billing/usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load usage data');
      }

      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const trackUsage = useCallback(async (type: 'scan' | 'ai_request', quantity: number = 1) => {
    try {
      await fetch('/api/billing/track-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ type, quantity }),
      });

      // Reload usage data
      await loadUsage();
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  }, [loadUsage]);

  const isOverLimit = useCallback((type: keyof UsageLimits): boolean => {
    const limit = usage[type];
    if (typeof limit.limit === 'number') {
      return limit.limit !== -1 && limit.used >= limit.limit;
    }
    return false;
  }, [usage]);

  const getUsagePercentage = useCallback((type: keyof UsageLimits): number => {
    const limit = usage[type];
    if (typeof limit.limit === 'number' && limit.limit !== -1) {
      return Math.min((limit.used / limit.limit) * 100, 100);
    }
    return 0;
  }, [usage]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  return {
    usage,
    loading,
    actions: {
      reload: loadUsage,
      track: trackUsage,
    },
    utils: {
      isOverLimit,
      getUsagePercentage,
    },
  };
}

// Subscription status hook
export function useSubscriptionStatus() {
  const { subscription, currentPlan } = useBilling();

  const isActive = subscription?.status === 'active';
  const isCanceled = subscription?.cancel_at_period_end;
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isIncomplete = subscription?.status === 'incomplete';

  const daysUntilRenewal = subscription?.current_period_end
    ? Math.ceil((subscription.current_period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const daysInTrial = subscription?.trial_end
    ? Math.ceil((subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    isActive,
    isCanceled,
    isTrialing,
    isPastDue,
    isIncomplete,
    daysUntilRenewal,
    daysInTrial,
    currentPlan,
    subscription,
  };
}

// Payment methods hook
export function usePaymentMethods() {
  const { paymentMethods, loading } = useBilling();
  const [updating, setUpdating] = useState(false);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setUpdating(true);

      const response = await fetch('/api/billing/payment-methods/default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      // Reload billing data
      window.location.reload();
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    } finally {
      setUpdating(false);
    }
  }, []);

  const removePaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setUpdating(true);

      const response = await fetch(`/api/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      // Reload billing data
      window.location.reload();
    } catch (error) {
      console.error('Failed to remove payment method:', error);
    } finally {
      setUpdating(false);
    }
  }, []);

  return {
    paymentMethods,
    loading: loading || updating,
    actions: {
      setDefault: setDefaultPaymentMethod,
      remove: removePaymentMethod,
    },
  };
}

// Plan comparison hook
export function usePlanComparison() {
  const { currentPlan } = useBilling();
  const plans = StripeService.PLANS;

  const getRecommendedPlan = useCallback((usage: UsageLimits): SubscriptionPlan | null => {
    // Logic to recommend a plan based on current usage
    if (usage.users.used > 3 || usage.scans.used > 500 || usage.aiRequests.used > 10) {
      return plans.find(p => p.id === 'starter') || null;
    }
    
    if (usage.users.used > 10 || usage.scans.used > 5000 || usage.aiRequests.used > 100) {
      return plans.find(p => p.id === 'professional') || null;
    }
    
    return plans.find(p => p.id === 'free') || null;
  }, [plans]);

  const compareFeatures = useCallback((planA: SubscriptionPlan, planB: SubscriptionPlan) => {
    const differences = {
      users: planB.limits.users - planA.limits.users,
      scans: planB.limits.scans - planA.limits.scans,
      aiRequests: planB.limits.aiRequests - planA.limits.aiRequests,
      price: planB.price - planA.price,
    };

    return differences;
  }, []);

  return {
    plans,
    currentPlan,
    utils: {
      getRecommendedPlan,
      compareFeatures,
    },
  };
}

// Invoice management hook
export function useInvoices() {
  const { invoices, upcomingInvoice, loading } = useBilling();

  const downloadInvoice = useCallback(async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  }, []);

  const retryPayment = useCallback(async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to retry payment');
      }

      // Reload billing data
      window.location.reload();
    } catch (error) {
      console.error('Failed to retry payment:', error);
    }
  }, []);

  return {
    invoices,
    upcomingInvoice,
    loading,
    actions: {
      download: downloadInvoice,
      retryPayment,
    },
  };
}
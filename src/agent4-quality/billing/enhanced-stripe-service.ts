/**
 * Enhanced Stripe Billing Service
 * Manages subscriptions, payments, and billing operations
 */

import Stripe from 'stripe';
import { supabase } from '@/agent1-foundation/database/supabase-client';
import { eventBus } from '@/shared/events/event-bus';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20'
});

export interface SubscriptionPlan {
  id: string;
  name: 'free' | 'pro' | 'enterprise';
  displayName: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    products: number;
    users: number;
    apiCalls: number;
    storage: number; // in GB
    countingSessions: number;
    customReports: boolean;
    aiFeatures: boolean;
    prioritySupport: boolean;
  };
  stripePriceId?: string;
}

export interface BillingInfo {
  customerId: string;
  subscriptionId?: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: PaymentMethod;
  usage: UsageMetrics;
  invoices: Invoice[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface UsageMetrics {
  products: number;
  users: number;
  apiCalls: number;
  storage: number;
  countingSessions: number;
  percentageUsed: number;
}

export interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'open' | 'draft' | 'void';
  dueDate?: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  pdfUrl?: string;
}

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Up to 100 products',
      '1 user',
      'Basic inventory tracking',
      'Mobile app access',
      'Basic reports'
    ],
    limits: {
      products: 100,
      users: 1,
      apiCalls: 1000,
      storage: 1,
      countingSessions: 5,
      customReports: false,
      aiFeatures: false,
      prioritySupport: false
    }
  },
  {
    id: 'pro',
    name: 'pro',
    displayName: 'Professional',
    price: 49,
    interval: 'month',
    features: [
      'Up to 1,000 products',
      '5 users',
      'Advanced inventory management',
      'AI product recognition',
      'Custom reports & analytics',
      'Priority email support',
      'API access',
      'Cycle counting'
    ],
    limits: {
      products: 1000,
      users: 5,
      apiCalls: 10000,
      storage: 10,
      countingSessions: -1, // unlimited
      customReports: true,
      aiFeatures: true,
      prioritySupport: false
    },
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly'
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited products',
      'Unlimited users',
      'Advanced AI features',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Custom training',
      'API priority access',
      'Advanced security',
      'Multi-location support'
    ],
    limits: {
      products: -1, // unlimited
      users: -1, // unlimited
      apiCalls: -1, // unlimited
      storage: 100,
      countingSessions: -1, // unlimited
      customReports: true,
      aiFeatures: true,
      prioritySupport: true
    },
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
  }
];

class EnhancedStripeService {
  /**
   * Create a Stripe customer
   */
  async createCustomer(
    businessId: string,
    email: string,
    name?: string
  ): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          businessId
        }
      });

      // Store customer ID in database
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: customer.id })
        .eq('id', businessId);

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays: number = 14
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          platform: 'scanstock-pro'
        }
      });

      // Update business subscription status
      const plan = SUBSCRIPTION_PLANS.find(p => p.stripePriceId === priceId);
      if (plan) {
        await this.updateBusinessSubscription(customerId, plan.name, subscription.id);
      }

      eventBus.broadcast('billing:subscription:created', {
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      });

      // Update business subscription
      const plan = SUBSCRIPTION_PLANS.find(p => p.stripePriceId === newPriceId);
      if (plan) {
        await this.updateBusinessSubscription(
          subscription.customer as string,
          plan.name,
          subscriptionId
        );
      }

      eventBus.broadcast('billing:subscription:updated', {
        subscriptionId,
        newPlan: plan?.name
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediately,
        ...(immediately && { cancel_at: Math.floor(Date.now() / 1000) })
      });

      if (immediately) {
        await this.updateBusinessSubscription(
          subscription.customer as string,
          'free',
          null
        );
      }

      eventBus.broadcast('billing:subscription:cancelled', {
        subscriptionId,
        immediately
      });

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setDefault: boolean = false
  ): Promise<void> {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      if (setDefault) {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }

      eventBus.broadcast('billing:payment_method:added', {
        customerId,
        paymentMethodId
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Get billing info
   */
  async getBillingInfo(businessId: string): Promise<BillingInfo | null> {
    try {
      // Get business data
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (!business?.stripe_customer_id) return null;

      // Get Stripe customer
      const customer = await stripe.customers.retrieve(business.stripe_customer_id, {
        expand: ['subscriptions', 'sources']
      }) as Stripe.Customer;

      // Get current subscription
      const subscriptions = customer.subscriptions?.data || [];
      const activeSubscription = subscriptions.find(s => s.status === 'active' || s.status === 'trialing');

      // Get current plan
      let currentPlan = SUBSCRIPTION_PLANS[0]; // Default to free
      if (activeSubscription) {
        const priceId = activeSubscription.items.data[0].price.id;
        currentPlan = SUBSCRIPTION_PLANS.find(p => p.stripePriceId === priceId) || SUBSCRIPTION_PLANS[0];
      }

      // Get usage metrics
      const usage = await this.getUsageMetrics(businessId, currentPlan);

      // Get payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: business.stripe_customer_id,
        type: 'card'
      });

      // Get recent invoices
      const invoicesData = await stripe.invoices.list({
        customer: business.stripe_customer_id,
        limit: 10
      });

      const invoices: Invoice[] = invoicesData.data.map(inv => ({
        id: inv.id,
        amount: inv.amount_paid / 100,
        status: inv.status as any,
        dueDate: inv.due_date ? new Date(inv.due_date * 1000) : undefined,
        paidAt: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : undefined,
        invoiceUrl: inv.hosted_invoice_url || undefined,
        pdfUrl: inv.invoice_pdf || undefined
      }));

      // Build billing info
      const billingInfo: BillingInfo = {
        customerId: business.stripe_customer_id,
        subscriptionId: activeSubscription?.id,
        plan: currentPlan,
        status: activeSubscription?.status as any || 'canceled',
        currentPeriodEnd: activeSubscription?.current_period_end 
          ? new Date(activeSubscription.current_period_end * 1000) 
          : undefined,
        cancelAtPeriodEnd: activeSubscription?.cancel_at_period_end || false,
        paymentMethod: paymentMethods.data[0] ? {
          id: paymentMethods.data[0].id,
          type: 'card',
          brand: paymentMethods.data[0].card?.brand,
          last4: paymentMethods.data[0].card?.last4 || '',
          expiryMonth: paymentMethods.data[0].card?.exp_month,
          expiryYear: paymentMethods.data[0].card?.exp_year,
          isDefault: true
        } : undefined,
        usage,
        invoices
      };

      return billingInfo;
    } catch (error) {
      console.error('Error getting billing info:', error);
      return null;
    }
  }

  /**
   * Get usage metrics
   */
  private async getUsageMetrics(
    businessId: string,
    plan: SubscriptionPlan
  ): Promise<UsageMetrics> {
    // Get product count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Get user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Get API usage (from AI usage table)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: apiCalls } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get counting session count
    const { count: sessionCount } = await supabase
      .from('cycle_count_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Calculate storage (simplified)
    const storageGB = 0.5; // Mock value

    // Calculate percentage used
    const usageRatios = [
      plan.limits.products > 0 ? (productCount || 0) / plan.limits.products : 0,
      plan.limits.users > 0 ? (userCount || 0) / plan.limits.users : 0,
      plan.limits.apiCalls > 0 ? (apiCalls || 0) / plan.limits.apiCalls : 0,
      plan.limits.storage > 0 ? storageGB / plan.limits.storage : 0
    ];

    const percentageUsed = Math.max(...usageRatios) * 100;

    return {
      products: productCount || 0,
      users: userCount || 0,
      apiCalls: apiCalls || 0,
      storage: storageGB,
      countingSessions: sessionCount || 0,
      percentageUsed
    };
  }

  /**
   * Update business subscription in database
   */
  private async updateBusinessSubscription(
    customerId: string,
    plan: 'free' | 'pro' | 'enterprise',
    subscriptionId: string | null
  ): Promise<void> {
    await supabase
      .from('businesses')
      .update({
        subscription: plan,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId);
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    signature: string,
    payload: string
  ): Promise<void> {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdate(subscription);
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(deletedSub);
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSucceeded(invoice);
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(failedInvoice);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const priceId = subscription.items.data[0].price.id;
    const plan = SUBSCRIPTION_PLANS.find(p => p.stripePriceId === priceId);
    
    if (plan) {
      await this.updateBusinessSubscription(
        subscription.customer as string,
        plan.name,
        subscription.id
      );
    }

    eventBus.broadcast('billing:subscription:updated', {
      subscriptionId: subscription.id,
      status: subscription.status
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.updateBusinessSubscription(
      subscription.customer as string,
      'free',
      null
    );

    eventBus.broadcast('billing:subscription:deleted', {
      subscriptionId: subscription.id
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    eventBus.broadcast('billing:payment:succeeded', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Create alert for payment failure
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('stripe_customer_id', invoice.customer)
      .single();

    if (business) {
      await supabase
        .from('alerts')
        .insert({
          type: 'payment_failed',
          severity: 'critical',
          title: 'Payment Failed',
          message: `Payment of $${invoice.amount_due / 100} failed. Please update your payment method.`,
          business_id: business.id
        });
    }

    eventBus.broadcast('billing:payment:failed', {
      invoiceId: invoice.id,
      amount: invoice.amount_due / 100
    });
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(
    businessId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (!business) throw new Error('Business not found');

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan || !plan.stripePriceId) throw new Error('Invalid plan');

      // Create or get customer
      let customerId = business.stripe_customer_id;
      if (!customerId) {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('business_id', businessId)
          .eq('role', 'admin')
          .single();

        customerId = await this.createCustomer(businessId, user?.email || '', business.name);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: plan.stripePriceId,
          quantity: 1
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          businessId,
          planId
        }
      });

      return session.url || '';
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create billing portal session
   */
  async createBillingPortalSession(
    businessId: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('stripe_customer_id')
        .eq('id', businessId)
        .single();

      if (!business?.stripe_customer_id) {
        throw new Error('No Stripe customer found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: business.stripe_customer_id,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw error;
    }
  }
}

export const enhancedStripeService = new EnhancedStripeService();
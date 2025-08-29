import Stripe from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    users: number;
    scans: number;
    aiRequests: number;
    storage: string;
  };
}

export interface UsageRecord {
  subscriptionItemId: string;
  quantity: number;
  timestamp: number;
  action: 'set' | 'increment';
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

export interface CustomerPortalOptions {
  customerId: string;
  returnUrl: string;
  configuration?: string;
}

export interface CheckoutSessionOptions {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  allowPromotionCodes?: boolean;
}

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
    this.webhookSecret = webhookSecret;
  }

  // Subscription Plans Configuration
  static readonly PLANS: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      priceId: 'price_free', // This would be a real Stripe price ID
      price: 0,
      interval: 'month',
      features: [
        'Up to 3 users',
        '500 scans per month',
        '10 AI recognition requests',
        'Basic reporting',
        'Email support'
      ],
      limits: {
        users: 3,
        scans: 500,
        aiRequests: 10,
        storage: '1GB'
      }
    },
    {
      id: 'starter',
      name: 'Starter',
      priceId: 'price_starter',
      price: 29,
      interval: 'month',
      features: [
        'Up to 10 users',
        '5,000 scans per month',
        '100 AI recognition requests',
        'Advanced reporting',
        'Priority email support',
        'Mobile app access'
      ],
      limits: {
        users: 10,
        scans: 5000,
        aiRequests: 100,
        storage: '10GB'
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      priceId: 'price_professional',
      price: 99,
      interval: 'month',
      features: [
        'Unlimited users',
        'Unlimited scans',
        '1,000 AI recognition requests',
        'Custom reporting & analytics',
        'API access',
        'Phone & chat support',
        'Custom integrations',
        'Advanced security features'
      ],
      limits: {
        users: -1, // Unlimited
        scans: -1,
        aiRequests: 1000,
        storage: '100GB'
      }
    }
  ];

  // Customer Management
  async createCustomer(email: string, name: string, metadata?: Stripe.MetadataParam): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });

      return customer;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async updateCustomer(customerId: string, data: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, data);
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      if (error.code === 'resource_missing') {
        return null;
      }
      throw new Error(`Failed to retrieve customer: ${error.message}`);
    }
  }

  // Subscription Management
  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      trialDays?: number;
      prorationBehavior?: Stripe.SubscriptionCreateParams.ProrationBehavior;
      metadata?: Stripe.MetadataParam;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          ...options?.metadata,
          created_at: new Date().toISOString(),
        },
      };

      if (options?.trialDays) {
        subscriptionParams.trial_period_days = options.trialDays;
      }

      if (options?.prorationBehavior) {
        subscriptionParams.proration_behavior = options.prorationBehavior;
      }

      return await this.stripe.subscriptions.create(subscriptionParams);
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, updates);
    } catch (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    options?: { 
      immediately?: boolean;
      reason?: string;
    }
  ): Promise<Stripe.Subscription> {
    try {
      if (options?.immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId, {
          invoice_now: true,
          prorate: true,
        });
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancellation_reason: options?.reason || 'user_requested',
            cancelled_at: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      if (error.code === 'resource_missing') {
        return null;
      }
      throw new Error(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  async listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });

      return subscriptions.data;
    } catch (error) {
      throw new Error(`Failed to list subscriptions: ${error.message}`);
    }
  }

  // Usage-Based Billing (for AI API calls)
  async recordUsage(usageRecord: UsageRecord): Promise<Stripe.UsageRecord> {
    try {
      return await this.stripe.subscriptionItems.createUsageRecord(
        usageRecord.subscriptionItemId,
        {
          quantity: usageRecord.quantity,
          timestamp: usageRecord.timestamp,
          action: usageRecord.action,
        }
      );
    } catch (error) {
      throw new Error(`Failed to record usage: ${error.message}`);
    }
  }

  async getUsageRecords(
    subscriptionItemId: string,
    options?: {
      startingAfter?: string;
      endingBefore?: string;
      limit?: number;
    }
  ): Promise<Stripe.UsageRecord[]> {
    try {
      const usageRecords = await this.stripe.subscriptionItems.listUsageRecordSummaries(
        subscriptionItemId,
        options
      );

      return usageRecords.data;
    } catch (error) {
      throw new Error(`Failed to get usage records: ${error.message}`);
    }
  }

  // Checkout Session Management
  async createCheckoutSession(options: CheckoutSessionOptions): Promise<Stripe.Checkout.Session> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: options.priceId,
            quantity: 1,
          },
        ],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        allow_promotion_codes: options.allowPromotionCodes || false,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        metadata: {
          created_at: new Date().toISOString(),
        },
      };

      if (options.customerId) {
        sessionParams.customer = options.customerId;
      } else if (options.customerEmail) {
        sessionParams.customer_email = options.customerEmail;
      }

      if (options.trialDays) {
        sessionParams.subscription_data = {
          trial_period_days: options.trialDays,
        };
      }

      return await this.stripe.checkout.sessions.create(sessionParams);
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription'],
      });
    } catch (error) {
      if (error.code === 'resource_missing') {
        return null;
      }
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  // Customer Portal
  async createPortalSession(options: CustomerPortalOptions): Promise<Stripe.BillingPortal.Session> {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: options.customerId,
        return_url: options.returnUrl,
        configuration: options.configuration,
      });
    } catch (error) {
      throw new Error(`Failed to create portal session: ${error.message}`);
    }
  }

  // Payment Methods
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  // Webhook Handling
  async constructWebhookEvent(body: string, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  // Invoice Management
  async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice | null> {
    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch (error) {
      if (error.code === 'invoice_upcoming_none') {
        return null;
      }
      throw new Error(`Failed to get upcoming invoice: ${error.message}`);
    }
  }

  async listInvoices(
    customerId: string,
    options?: { limit?: number; startingAfter?: string }
  ): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: options?.limit || 10,
        starting_after: options?.startingAfter,
      });

      return invoices.data;
    } catch (error) {
      throw new Error(`Failed to list invoices: ${error.message}`);
    }
  }

  // Utility Methods
  getPlanById(planId: string): SubscriptionPlan | null {
    return StripeService.PLANS.find(plan => plan.id === planId) || null;
  }

  getPlanByPriceId(priceId: string): SubscriptionPlan | null {
    return StripeService.PLANS.find(plan => plan.priceId === priceId) || null;
  }

  formatCurrency(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Stripe amounts are in cents
  }

  // Private webhook handlers
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
    // Update user's subscription status in database
    // Send welcome email
    // Enable features
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    // Update user's subscription status in database
    // Handle plan changes
    // Update feature access
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    // Downgrade user to free plan
    // Send cancellation confirmation email
    // Disable premium features
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id);
    // Update payment status in database
    // Send receipt email
    // Extend subscription period
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
    // Update payment status in database
    // Send payment failure notification
    // Start dunning process if applicable
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    console.log('Customer created:', customer.id);
    // Create customer record in database
    // Send welcome email
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    console.log('Customer updated:', customer.id);
    // Update customer record in database
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Checkout completed:', session.id);
    // Activate subscription
    // Send confirmation email
    // Update user permissions
  }
}

// Error types for better error handling
export class StripeServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string
  ) {
    super(message);
    this.name = 'StripeServiceError';
  }
}

// Helper functions
export function isStripeError(error: any): error is Stripe.StripeError {
  return error?.type?.startsWith('Stripe');
}

export function handleStripeError(error: Stripe.StripeError): StripeServiceError {
  return new StripeServiceError(
    error.message,
    error.code,
    error.type
  );
}
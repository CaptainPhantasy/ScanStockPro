import { StripeService } from '../../billing/stripe-service';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'updated@example.com'
      })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active'
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active'
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled'
      }),
      list: jest.fn().mockResolvedValue({
        data: []
      })
    },
    subscriptionItems: {
      createUsageRecord: jest.fn().mockResolvedValue({
        id: 'ur_test123',
        quantity: 10
      }),
      listUsageRecordSummaries: jest.fn().mockResolvedValue({
        data: []
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          payment_status: 'paid'
        })
      }
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/test'
        })
      }
    },
    paymentMethods: {
      list: jest.fn().mockResolvedValue({
        data: []
      })
    },
    invoices: {
      retrieveUpcoming: jest.fn().mockResolvedValue({
        id: 'in_upcoming',
        amount_due: 2900
      }),
      list: jest.fn().mockResolvedValue({
        data: []
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_test123' } }
      })
    }
  }))
});

describe('StripeService', () => {
  let stripeService: StripeService;

  beforeEach(() => {
    stripeService = new StripeService('sk_test_123', 'whsec_test');
  });

  describe('Customer Management', () => {
    test('should create customer successfully', async () => {
      const customer = await stripeService.createCustomer(
        'test@example.com',
        'Test User',
        { businessId: 'biz_123' }
      );

      expect(customer.id).toBe('cus_test123');
      expect(customer.email).toBe('test@example.com');
      expect(customer.name).toBe('Test User');
    });

    test('should retrieve customer by ID', async () => {
      const customer = await stripeService.getCustomer('cus_test123');
      
      expect(customer).not.toBeNull();
      expect(customer?.id).toBe('cus_test123');
    });

    test('should update customer details', async () => {
      const updatedCustomer = await stripeService.updateCustomer('cus_test123', {
        email: 'updated@example.com'
      });

      expect(updatedCustomer.id).toBe('cus_test123');
      expect(updatedCustomer.email).toBe('updated@example.com');
    });

    test('should handle non-existent customer', async () => {
      const mockRetrieve = jest.fn().mockRejectedValue({ code: 'resource_missing' });
      (stripeService as any).stripe.customers.retrieve = mockRetrieve;

      const customer = await stripeService.getCustomer('cus_nonexistent');
      expect(customer).toBeNull();
    });
  });

  describe('Subscription Management', () => {
    test('should create subscription successfully', async () => {
      const subscription = await stripeService.createSubscription(
        'cus_test123',
        'price_test123'
      );

      expect(subscription.id).toBe('sub_test123');
      expect(subscription.customer).toBe('cus_test123');
      expect(subscription.status).toBe('active');
    });

    test('should create subscription with trial period', async () => {
      const subscription = await stripeService.createSubscription(
        'cus_test123',
        'price_test123',
        { trialDays: 14 }
      );

      expect(subscription.id).toBe('sub_test123');
    });

    test('should update subscription', async () => {
      const updatedSubscription = await stripeService.updateSubscription(
        'sub_test123',
        { metadata: { updated: 'true' } }
      );

      expect(updatedSubscription.id).toBe('sub_test123');
    });

    test('should cancel subscription immediately', async () => {
      const canceledSubscription = await stripeService.cancelSubscription(
        'sub_test123',
        { immediately: true }
      );

      expect(canceledSubscription.status).toBe('canceled');
    });

    test('should schedule subscription cancellation', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true
      });
      (stripeService as any).stripe.subscriptions.update = mockUpdate;

      const subscription = await stripeService.cancelSubscription(
        'sub_test123',
        { immediately: false, reason: 'user_requested' }
      );

      expect(subscription.cancel_at_period_end).toBe(true);
    });

    test('should list customer subscriptions', async () => {
      const subscriptions = await stripeService.listCustomerSubscriptions('cus_test123');
      expect(Array.isArray(subscriptions)).toBe(true);
    });
  });

  describe('Usage-Based Billing', () => {
    test('should record usage successfully', async () => {
      const usageRecord = {
        subscriptionItemId: 'si_test123',
        quantity: 10,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment' as const
      };

      const result = await stripeService.recordUsage(usageRecord);
      
      expect(result.id).toBe('ur_test123');
      expect(result.quantity).toBe(10);
    });

    test('should get usage records', async () => {
      const records = await stripeService.getUsageRecords('si_test123');
      expect(Array.isArray(records)).toBe(true);
    });

    test('should handle usage recording errors', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('Invalid subscription item'));
      (stripeService as any).stripe.subscriptionItems.createUsageRecord = mockCreate;

      const usageRecord = {
        subscriptionItemId: 'si_invalid',
        quantity: 10,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment' as const
      };

      await expect(stripeService.recordUsage(usageRecord)).rejects.toThrow('Failed to record usage');
    });
  });

  describe('Checkout Sessions', () => {
    test('should create checkout session', async () => {
      const options = {
        priceId: 'price_test123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerEmail: 'test@example.com'
      };

      const session = await stripeService.createCheckoutSession(options);
      
      expect(session.id).toBe('cs_test123');
      expect(session.url).toBe('https://checkout.stripe.com/test');
    });

    test('should create checkout session with existing customer', async () => {
      const options = {
        customerId: 'cus_test123',
        priceId: 'price_test123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialDays: 14
      };

      const session = await stripeService.createCheckoutSession(options);
      expect(session.id).toBe('cs_test123');
    });

    test('should retrieve checkout session', async () => {
      const session = await stripeService.getCheckoutSession('cs_test123');
      
      expect(session).not.toBeNull();
      expect(session?.id).toBe('cs_test123');
    });
  });

  describe('Customer Portal', () => {
    test('should create portal session', async () => {
      const portalSession = await stripeService.createPortalSession({
        customerId: 'cus_test123',
        returnUrl: 'https://example.com/account'
      });

      expect(portalSession.url).toBe('https://billing.stripe.com/test');
    });
  });

  describe('Invoice Management', () => {
    test('should get upcoming invoice', async () => {
      const invoice = await stripeService.getUpcomingInvoice('cus_test123');
      
      expect(invoice).not.toBeNull();
      expect(invoice?.id).toBe('in_upcoming');
    });

    test('should handle no upcoming invoice', async () => {
      const mockRetrieve = jest.fn().mockRejectedValue({ code: 'invoice_upcoming_none' });
      (stripeService as any).stripe.invoices.retrieveUpcoming = mockRetrieve;

      const invoice = await stripeService.getUpcomingInvoice('cus_test123');
      expect(invoice).toBeNull();
    });

    test('should list customer invoices', async () => {
      const invoices = await stripeService.listInvoices('cus_test123');
      expect(Array.isArray(invoices)).toBe(true);
    });
  });

  describe('Webhook Handling', () => {
    test('should construct webhook event', async () => {
      const body = 'webhook-body';
      const signature = 'signature';

      const event = await stripeService.constructWebhookEvent(body, signature);
      
      expect(event.id).toBe('evt_test123');
      expect(event.type).toBe('customer.subscription.created');
    });

    test('should handle webhook events', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_test123' } },
        created: Date.now()
      };

      // Should not throw error
      await expect(stripeService.handleWebhookEvent(mockEvent as any)).resolves.toBeUndefined();
    });

    test('should handle unknown webhook event types', async () => {
      const mockEvent = {
        id: 'evt_test123',
        type: 'unknown.event.type',
        data: { object: {} },
        created: Date.now()
      };

      // Should not throw error for unknown events
      await expect(stripeService.handleWebhookEvent(mockEvent as any)).resolves.toBeUndefined();
    });
  });

  describe('Plan Management', () => {
    test('should get plan by ID', () => {
      const plan = stripeService.getPlanById('starter');
      
      expect(plan).not.toBeNull();
      expect(plan?.id).toBe('starter');
      expect(plan?.name).toBe('Starter');
    });

    test('should get plan by price ID', () => {
      const plan = stripeService.getPlanByPriceId('price_starter');
      
      expect(plan).not.toBeNull();
      expect(plan?.id).toBe('starter');
    });

    test('should return null for non-existent plan', () => {
      const plan = stripeService.getPlanById('nonexistent');
      expect(plan).toBeNull();
    });

    test('should format currency correctly', () => {
      const formatted = stripeService.formatCurrency(2900); // $29.00 in cents
      expect(formatted).toBe('$29.00');
    });
  });

  describe('Error Handling', () => {
    test('should handle customer creation errors', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('Stripe error'));
      (stripeService as any).stripe.customers.create = mockCreate;

      await expect(stripeService.createCustomer('', '')).rejects.toThrow('Failed to create customer');
    });

    test('should handle subscription creation errors', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('Invalid price ID'));
      (stripeService as any).stripe.subscriptions.create = mockCreate;

      await expect(stripeService.createSubscription('cus_123', 'invalid_price')).rejects.toThrow('Failed to create subscription');
    });

    test('should handle checkout session creation errors', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('Invalid options'));
      (stripeService as any).stripe.checkout.sessions.create = mockCreate;

      const options = {
        priceId: 'invalid',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      };

      await expect(stripeService.createCheckoutSession(options)).rejects.toThrow('Failed to create checkout session');
    });
  });
});
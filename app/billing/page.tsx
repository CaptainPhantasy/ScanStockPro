'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedStripeService, SUBSCRIPTION_PLANS, BillingInfo } from '@/agent4-quality/billing/enhanced-stripe-service';
import { supabase } from '@/agent1-foundation/database/supabase-client';

export default function BillingPage() {
  const router = useRouter();
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userData?.business_id) {
        const info = await enhancedStripeService.getBillingInfo(userData.business_id);
        setBillingInfo(info);
      }
    } catch (error) {
      console.error('Error loading billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setUpgrading(true);
      setSelectedPlan(planId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!userData?.business_id) return;

      // Create checkout session
      const checkoutUrl = await enhancedStripeService.createCheckoutSession(
        userData.business_id,
        planId,
        `${window.location.origin}/billing?success=true`,
        `${window.location.origin}/billing?canceled=true`
      );

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Error creating checkout session. Please try again.');
    } finally {
      setUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!userData?.business_id) return;

      // Create billing portal session
      const portalUrl = await enhancedStripeService.createBillingPortalSession(
        userData.business_id,
        window.location.href
      );

      window.location.href = portalUrl;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Error opening billing portal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and billing</p>
        </div>
      </div>

      {/* Current Plan */}
      {billingInfo && (
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {billingInfo.plan.displayName}
                </p>
                <p className="text-gray-600">
                  ${billingInfo.plan.price}/{billingInfo.plan.interval}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                billingInfo.status === 'active' ? 'bg-green-100 text-green-800' :
                billingInfo.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                billingInfo.status === 'past_due' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {billingInfo.status}
              </span>
            </div>

            {/* Usage Metrics */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Usage This Month</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Products</span>
                    <span>{billingInfo.usage.products} / {
                      billingInfo.plan.limits.products === -1 ? '∞' : billingInfo.plan.limits.products
                    }</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: billingInfo.plan.limits.products === -1 ? '0%' :
                          `${Math.min(100, (billingInfo.usage.products / billingInfo.plan.limits.products) * 100)}%`
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Users</span>
                    <span>{billingInfo.usage.users} / {
                      billingInfo.plan.limits.users === -1 ? '∞' : billingInfo.plan.limits.users
                    }</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: billingInfo.plan.limits.users === -1 ? '0%' :
                          `${Math.min(100, (billingInfo.usage.users / billingInfo.plan.limits.users) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>API Calls</span>
                    <span>{billingInfo.usage.apiCalls} / {
                      billingInfo.plan.limits.apiCalls === -1 ? '∞' : billingInfo.plan.limits.apiCalls
                    }</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: billingInfo.plan.limits.apiCalls === -1 ? '0%' :
                          `${Math.min(100, (billingInfo.usage.apiCalls / billingInfo.plan.limits.apiCalls) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {billingInfo.usage.percentageUsed > 80 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    You're using {billingInfo.usage.percentageUsed.toFixed(0)}% of your plan limits. 
                    Consider upgrading for more resources.
                  </p>
                </div>
              )}
            </div>

            {/* Billing Actions */}
            {billingInfo.subscriptionId && (
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={handleManageBilling}
                  className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 font-medium hover:bg-gray-200"
                >
                  Manage Billing & Payment Methods
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="space-y-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white rounded-lg shadow-sm p-6 border-2 ${
                billingInfo?.plan.id === plan.id ? 'border-blue-600' : 'border-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.displayName}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-600">/{plan.interval}</span>
                  </p>
                </div>
                {billingInfo?.plan.id === plan.id && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {billingInfo?.plan.id !== plan.id && plan.id !== 'free' && (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading}
                  className={`w-full py-3 rounded-lg font-medium ${
                    plan.id === 'enterprise' 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                  } disabled:opacity-50`}
                >
                  {upgrading && selectedPlan === plan.id ? 'Processing...' : 
                   billingInfo && billingInfo.plan.price < plan.price ? 'Upgrade' : 'Select Plan'}
                </button>
              )}

              {billingInfo?.plan.id === plan.id && plan.id !== 'free' && (
                <div className="text-center text-sm text-gray-600">
                  {billingInfo.currentPeriodEnd && (
                    <p>Renews on {new Date(billingInfo.currentPeriodEnd).toLocaleDateString()}</p>
                  )}
                  {billingInfo.cancelAtPeriodEnd && (
                    <p className="text-orange-600 mt-1">Cancels at end of period</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invoices */}
      {billingInfo && billingInfo.invoices.length > 0 && (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingInfo.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pending'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {invoice.invoiceUrl && (
                        <a 
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
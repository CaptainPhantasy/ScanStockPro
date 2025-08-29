import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { enhancedStripeService } from '@/agent4-quality/billing/enhanced-stripe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    await enhancedStripeService.handleWebhook(signature, body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
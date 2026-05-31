import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Payment checkout requested for:', body);
    // Tạo stripe session và lưu vào database
    return NextResponse.json({
      sessionId: 'stripe-session-id-mock',
      checkoutUrl: `https://checkout.stripe.com/pay/mock_session`,
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ error: 'Payment processing error' }, { status: 500 });
  }
}

'use client';

import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/payment';
import CheckoutForm from '@/components/payment/CheckoutForm';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Song {
  title: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const songId = params?.songId as string;
  const licenseType = searchParams?.get('type') || 'commercial';
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!songId || status !== 'authenticated') return;

    const token = (session as { accessToken?: string })?.accessToken;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const fetchPaymentData = async () => {
      try {
        // Fetch song details
        const songRes = await fetch(`${API_URL}/music/songs/${songId}`);
        if (songRes.ok) {
          const songData = await songRes.json();
          setSong(songData);
        }

        // Fetch payment intent
        const res = await fetch(`${API_URL}/payment/create-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            songId,
            licenseType,
          })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to initialize payment');
        }
        
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      }
    };

    fetchPaymentData();
  }, [songId, licenseType, status, session]);

  if (status === 'loading') {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="p-8 text-center text-red-500">Please log in to purchase a license.</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!clientSecret) {
    return <div className="p-8 text-center text-gray-500">Initializing secure checkout...</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white shadow-xl rounded-2xl border border-gray-100">
      <h1 className="text-2xl font-bold mb-2">Secure Checkout</h1>
      <p className="text-gray-600 mb-6">
        Purchasing <span className="font-semibold capitalize">{licenseType}</span> license for <span className="font-bold">{song?.title || 'song'}</span>.
      </p>

      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm 
          onSuccess={() => {
            alert('Payment successful! Your license has been issued.');
            router.push('/dashboard/licenses');
          }} 
        />
      </Elements>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UserLicense {
  id: string;
  licenseType: string;
  licenseKey: string;
  pricePaid: number;
  currency: string;
  createdAt: string;
  song: {
    id: string;
    title: string;
    genre: string;
    fileUrl: string;
  };
}

export default function MyLicensesPage() {
  const { data: session, status } = useSession();
  const [licenses, setLicenses] = useState<UserLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const token = (session as { accessToken?: string })?.accessToken;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchLicenses = async () => {
      try {
        const res = await fetch(`${API_URL}/licenses/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch your licenses');
        }

        const data = await res.json();
        setLicenses(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, [status, session]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-surface-container rounded-2xl border border-glass-border">
        <span className="material-symbols-outlined text-error text-5xl mb-4">lock</span>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-text-secondary text-sm">Please log in to view your purchased music licenses.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center p-8 bg-error-bg/10 rounded-2xl border border-error/20 text-error">
        <span className="material-symbols-outlined text-5xl mb-4">error</span>
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover mb-2">
          My Music Licenses
        </h1>
        <p className="text-text-secondary text-sm">
          Manage your acquired commercial, personal, remix, or exclusive usage rights.
        </p>
      </header>

      {licenses.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-glass-border rounded-3xl p-8 shadow-xl">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-4xl">receipt_long</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Licenses Acquired</h2>
          <p className="text-text-secondary max-w-sm mx-auto text-sm mb-8">
            You haven&apos;t purchased or acquired any music licenses yet. Explore our catalog to get started.
          </p>
          <a
            href="/songs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white dark:text-background font-bold rounded-xl transition shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            Explore Marketplace
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {licenses.map((license) => (
            <div
              key={license.id}
              className="bg-surface border border-glass-border hover:border-primary/30 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden"
            >
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-bl-full pointer-events-none"></div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-2xl">music_note</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-1">{license.song.title}</h3>
                  <p className="text-xs text-text-muted capitalize mb-2">{license.song.genre} • ID: {license.song.id.substring(0, 8)}</p>
                  <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/20 uppercase tracking-wider">
                    {license.licenseType}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-glass-border text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">License Key</span>
                  <span className="text-text-primary font-semibold select-all">{license.licenseKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Price Paid</span>
                  <span className="text-text-primary font-bold">
                    {license.pricePaid === 0 ? 'FREE' : `$${(license.pricePaid / 100).toFixed(2)} ${license.currency}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Issued Date</span>
                  <span className="text-text-primary">{new Date(license.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-glass-border flex gap-3">
                <a
                  href={`/studio/${license.song.id}`}
                  className="flex-1 py-2.5 bg-glass-bg hover:bg-glass-border border border-glass-border rounded-xl text-center text-sm font-semibold transition"
                >
                  Open in Studio
                </a>
                {/* Simulated direct download from R2 */}
                <a
                  href={`${process.env.NEXT_PUBLIC_STORAGE_URL || 'https://r2.cloudflarestorage.com/stemverse-audio'}/${license.song.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-background rounded-xl text-sm font-bold transition shadow-md shadow-primary/10"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

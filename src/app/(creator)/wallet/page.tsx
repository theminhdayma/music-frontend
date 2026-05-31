'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Transaction {
  id: string;
  songId: string;
  eventType: string;
  role: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  createdAt: string;
  song: {
    id: string;
    title: string;
  };
}

interface Wallet {
  balanceUsd: number;
  totalEarned: number;
}

export default function WalletDashboardPage() {
  const { data: session, status } = useSession();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'creator' | 'remixer'>('all');

  useEffect(() => {
    if (status !== 'authenticated') return;

    const token = (session as { accessToken?: string })?.accessToken;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchWalletData = async () => {
      try {
        // Fetch wallet details
        const walletRes = await fetch(`${API_URL}/royalty/wallet`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!walletRes.ok) {
          throw new Error('Failed to fetch wallet details');
        }
        const walletData = await walletRes.json();
        setWallet(walletData);

        // Fetch transaction logs
        const txRes = await fetch(`${API_URL}/royalty/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!txRes.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const txData = await txRes.json();
        setTransactions(txData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
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
        <p className="text-text-secondary text-sm">Please log in to view your virtual wallet and royalty logs.</p>
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

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'creator') return tx.role === 'original_creator';
    if (activeFilter === 'remixer') return tx.role === 'remixer';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-6">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover mb-2">
            My Wallet & Royalty Dashboard
          </h1>
          <p className="text-text-secondary text-sm">
            Track your earnings from original tracks and recursive remix licenses.
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Balance Card */}
        <div className="bg-surface border border-glass-border hover:border-primary/20 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-bl-full pointer-events-none"></div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-text-muted">Available Balance</span>
            <h2 className="text-4xl font-extrabold text-text-primary mt-2">
              ${wallet ? (wallet.balanceUsd / 100).toFixed(2) : '0.00'}
            </h2>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="px-5 py-2 bg-primary hover:bg-primary-hover text-white dark:text-background font-bold text-xs rounded-xl transition shadow-md shadow-primary/10">
              Request Payout
            </button>
            <button className="px-5 py-2 bg-glass-bg hover:bg-glass-border border border-glass-border text-text-primary font-bold text-xs rounded-xl transition">
              Wallet Settings
            </button>
          </div>
        </div>

        {/* Total Earned Card */}
        <div className="bg-surface border border-glass-border hover:border-emerald-500/20 rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-bl-full pointer-events-none"></div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-text-muted">Total Lifetime Earnings</span>
            <h2 className="text-4xl font-extrabold text-emerald-500 mt-2">
              ${wallet ? (wallet.totalEarned / 100).toFixed(2) : '0.00'}
            </h2>
          </div>
          <div className="mt-4 text-xs text-text-muted">
            Includes all original downloads, licensing fees, and recursive remix revenue splits.
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-surface border border-glass-border rounded-3xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-glass-border pb-4">
          <h3 className="text-lg font-bold text-text-primary">Royalty Split Ledger</h3>
          
          {/* Filters */}
          <div className="flex bg-surface-container border border-glass-border p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'all'
                  ? 'bg-primary text-white dark:text-background shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('creator')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'creator'
                  ? 'bg-primary text-white dark:text-background shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Creator
            </button>
            <button
              onClick={() => setActiveFilter('remixer')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeFilter === 'remixer'
                  ? 'bg-primary text-white dark:text-background shadow'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Remixer
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No transactions found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-glass-border text-text-muted text-xs font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Track Title</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Gross</th>
                  <th className="py-3 px-4 text-right">Platform Fee</th>
                  <th className="py-3 px-4 text-right">Net Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-glass-bg/5 transition duration-150">
                    <td className="py-4 px-4 font-mono text-xs text-text-secondary">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 font-semibold text-text-primary">
                      <Link href={`/song/${tx.songId}`} className="hover:text-primary transition">
                        {tx.song?.title || 'Unknown Track'}
                      </Link>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.role === 'original_creator'
                          ? 'bg-purple-950/40 text-purple-400 border border-purple-800/30'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                      }`}>
                        {tx.role === 'original_creator' ? 'Creator' : 'Remixer'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-text-secondary">
                      ${(tx.grossAmount / 100).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-error/80">
                      -${(tx.platformFee / 100).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-emerald-500">
                      +${(tx.netAmount / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden selection:bg-primary/30">
      {/* Nav Shell: SideNavBar (Desktop) */}
      <nav
        aria-label="Sidebar"
        className="hidden md:flex bg-surface/80 backdrop-blur-[20px] fixed left-0 top-0 h-full w-[280px] border-r border-outline-variant/30 shadow-none flex-col py-8 px-4 z-40"
      >
        <div className="flex items-center gap-4 px-4 mb-12">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-primary/20">
            <span className="material-symbols-outlined text-primary text-2xl">graphic_eq</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">StemVerse</h1>
            <p className="text-xs text-on-surface-variant">AI Remix Studio</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 flex-grow">
          <li>
            <Link
              href="/explore"
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">explore</span>
              <span className="text-sm font-semibold">Explore</span>
            </Link>
          </li>
          <li>
            <Link
              href="/studio"
              className="flex items-center gap-4 px-4 py-3 rounded-lg bg-primary/10 text-primary font-bold border-r-2 border-primary scale-95 transition-transform duration-150"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                graphic_eq
              </span>
              <span className="text-sm font-semibold">Studio</span>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard"
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="text-sm font-semibold">Marketplace</span>
            </Link>
          </li>
          <li>
            <Link
              href="/wallet"
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined">account_balance_wallet</span>
              <span className="text-sm font-semibold">Wallet</span>
            </Link>
          </li>
        </ul>
        <div className="mt-auto">
          <Link href="/upload" className="w-full bg-primary text-on-primary text-sm font-semibold py-3 px-4 rounded-lg hover:shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            Create New Remix
          </Link>
          <a
            href="#"
            className="flex items-center gap-4 px-4 py-3 mt-4 rounded-lg text-on-surface-variant font-medium hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-semibold">Settings</span>
          </a>
        </div>
      </nav>

      {/* Nav Shell: TopNavBar */}
      <header className="hidden md:flex bg-background/80 backdrop-blur-md fixed top-0 w-full h-20 ml-[280px] max-w-[calc(100%-280px)] z-30 flex items-center justify-between px-8 border-b border-outline-variant/10">
        <div className="flex items-center flex-grow max-w-md relative focus-within:ring-1 ring-primary rounded-full transition-shadow">
          <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">search</span>
          <input
            className="w-full bg-surface-container-high border-none text-on-surface pl-12 pr-4 py-2.5 rounded-full text-sm focus:ring-0 placeholder:text-on-surface-variant/50"
            placeholder="Search stems, genres, creators..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-variant/50">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-variant/50">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-[280px] md:mt-20 pt-6 pb-[120px] px-4 md:px-8">
        {children}
      </main>
    </div>
  );
}

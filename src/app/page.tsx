'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const [remixPrompt, setRemixPrompt] = useState('');
  const { language, t } = useLanguage();
  
  // Mock data for songs
  const trendingSongs = [
    { id: '1', title: 'Summer Breeze', creator: 'Original Creator', bpm: 110, key: 'Am', genre: 'Synthwave', likes: 142 },
    { id: '2', title: 'Neon Shadows', creator: 'Cyber Synth', bpm: 124, key: 'C#m', genre: 'Cyberpunk', likes: 98 },
    { id: '3', title: 'Echoes of Time', creator: 'Acoustic Nomad', bpm: 85, key: 'G major', genre: 'Lofi', likes: 210 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 transition-colors duration-300">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-text-primary">
          {t("explore.hero_title").split("GitHub + Spotify")[0]}
          <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">GitHub + Spotify</span>
          {t("explore.hero_title").split("GitHub + Spotify")[1] || " for Music Creators"}
        </h1>
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          {language === "en" 
            ? "Upload your original tracks, separate them into stems automatically with AI, license them for remixes, and track derivative ownership with automatic royalty splits."
            : "Tải lên các bài hát gốc của bạn, tự động tách thành các stem bằng AI, cấp quyền cho các bản remix, và theo dõi sơ đồ sở hữu với tính năng tự động chia tiền tác quyền."}
        </p>

        {/* Quick AI Remix Prompt Box */}
        <div className="w-full max-w-xl bg-glass-bg border border-glass-border p-2 rounded-full flex items-center space-x-2 shadow-2xl backdrop-blur-md">
          <input
            type="text"
            placeholder={t("explore.search_placeholder")}
            value={remixPrompt}
            onChange={(e) => setRemixPrompt(e.target.value)}
            className="flex-1 bg-transparent pl-6 pr-4 py-3 text-sm focus:outline-none text-text-primary placeholder-text-muted"
          />
          <Link
            href={`/studio?prompt=${encodeURIComponent(remixPrompt)}`}
            className="bg-secondary hover:bg-secondary-hover text-white dark:text-background font-bold px-8 py-3.5 rounded-full text-sm shadow-lg shadow-secondary/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {t("explore.remix_btn")}
          </Link>
        </div>
      </section>

      {/* Trending Songs Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{t("explore.trending_section")}</h2>
            <p className="text-text-secondary text-sm">{t("explore.trending_subtitle")}</p>
          </div>
          <Link href="/songs" className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
            {language === "en" ? "View All →" : "Xem tất cả →"}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trendingSongs.map((song) => (
            <div
              key={song.id}
              className="bg-glass-bg border border-glass-border p-6 rounded-2xl hover:border-primary/45 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <svg className="w-6 h-6 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" fill="currentColor" />
                      <circle cx="18" cy="16" r="3" fill="currentColor" />
                    </svg>
                  </div>
                  <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full font-semibold">
                    {song.genre}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1 text-text-primary">{song.title}</h3>
                <p className="text-sm text-text-secondary mb-4">by {song.creator}</p>
              </div>

              <div className="flex items-center justify-between border-t border-glass-border pt-4 mt-4 text-xs font-mono text-text-muted">
                <div className="flex space-x-3">
                  <span>⏱ {song.bpm} {t("explore.badges.bpm")}</span>
                  <span>🎹 {song.key}</span>
                </div>
                <Link
                  href={`/song/${song.id}`}
                  className="text-secondary hover:underline flex items-center space-x-1 font-semibold"
                >
                  <span>{language === "en" ? "Listen" : "Nghe"}</span>
                  <span>▶</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-glass-border px-6 py-8 text-center text-sm text-text-muted bg-background/50">
        <p>© {new Date().getFullYear()} StemVerse. All rights reserved.</p>
      </footer>
    </div>
  );
}


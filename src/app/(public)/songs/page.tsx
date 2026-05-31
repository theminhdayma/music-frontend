'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function SongsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const mockSongs = [
    { id: '1', title: 'Summer Breeze', creator: 'Original Creator', bpm: 110, key: 'Am', genre: 'Synthwave', license: 'remix' },
    { id: '2', title: 'Neon Shadows', creator: 'Cyber Synth', bpm: 124, key: 'C#m', genre: 'Cyberpunk', license: 'remix' },
    { id: '3', title: 'Echoes of Time', creator: 'Acoustic Nomad', bpm: 85, key: 'G major', genre: 'Lofi', license: 'personal' },
    { id: '4', title: 'Lofi Nights', creator: 'Chill Beats', bpm: 78, key: 'F major', genre: 'Lofi', license: 'remix' },
    { id: '5', title: 'Future Trap', creator: 'Bass Head', bpm: 140, key: 'Dm', genre: 'Trap', license: 'exclusive' },
  ];

  const filteredSongs = mockSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Explore Tracks</h1>
            <p className="text-gray-400 text-sm">Discover and license modular music assets</p>
          </div>
          <div className="w-full md:w-80 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
            <input
              type="text"
              placeholder="Search by title, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full text-sm text-white focus:outline-none placeholder-gray-500"
            />
          </div>
        </header>

        <div className="space-y-4">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 p-5 rounded-2xl flex items-center justify-between hover:border-gray-700 transition"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-[#8B5CF6] text-xl">
                  🎵
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{song.title}</h3>
                  <p className="text-xs text-gray-400">by {song.creator}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-gray-500">
                  <span className="bg-gray-800 px-2 py-1 rounded">{song.bpm} BPM</span>
                  <span className="bg-gray-800 px-2 py-1 rounded">{song.key}</span>
                  <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-1 rounded">{song.genre}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1 capitalize">License: {song.license}</div>
                  <Link
                    href={`/song/${song.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-[#10B981] hover:underline"
                  >
                    <span>Inspect</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

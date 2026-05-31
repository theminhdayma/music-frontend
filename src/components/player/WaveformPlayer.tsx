'use client';
import React, { useEffect, useState } from 'react';

export default function WaveformPlayer() {
  const [bars, setBars] = useState<number[]>([]);
  const progress = 45; // Mock progress 45%

  useEffect(() => {
    // Generate mock waveform
    const numBars = 100;
    const newBars = [];
    for (let i = 0; i < numBars; i++) {
      newBars.push(Math.max(10, Math.random() * 100));
    }
    setBars(newBars);
  }, []);

  return (
    <section className="bg-surface-container p-6 rounded-xl border border-outline-variant/30">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-on-surface">Master Track</h3>
        <div className="flex items-center gap-3 text-on-surface-variant text-sm">
          <span>01:45</span>
          <span className="text-outline">/</span>
          <span>03:20</span>
        </div>
      </div>
      <div className="relative w-full h-24 flex items-center group cursor-pointer">
        <div 
          className="absolute inset-y-0 left-0 bg-primary/10 rounded-l pointer-events-none transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
        <div className="w-full h-16 flex items-end gap-[2px] relative">
          {bars.map((height, i) => {
            const isPlayed = i < progress;
            return (
              <div
                key={i}
                className={`flex-grow rounded-t-[1px] transition-all duration-200 ${
                  isPlayed 
                    ? 'bg-primary shadow-[0_0_4px_rgba(208,188,255,0.4)]' 
                    : 'bg-surface-variant opacity-60'
                }`}
                style={{ height: `${height}%` }}
              ></div>
            );
          })}
          {/* Playhead Scrubber line */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_8px_rgba(208,188,255,0.8)] z-10 hidden group-hover:block transition-all"
            style={{ left: `${progress}%` }}
          ></div>
        </div>
      </div>
    </section>
  );
}

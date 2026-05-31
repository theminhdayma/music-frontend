import React from 'react';

interface StemControlItemProps {
  name: string;
  icon: string;
  colorClass: string;
  progress: number; // 0 to 100
  isMuted: boolean;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
}

export default function StemControlItem({
  name,
  icon,
  colorClass,
  progress,
  isMuted,
  onMuteToggle,
  onSoloToggle,
}: StemControlItemProps) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-4 transition-all">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-on-surface">
          <span className={`material-symbols-outlined ${colorClass}`}>{icon}</span>
          <span className="text-sm font-semibold">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onSoloToggle}
            className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            Solo
          </button>
          <button
            onClick={onMuteToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? 'bg-error/20 text-error border border-error/30'
                : 'bg-surface-variant text-on-surface-variant hover:text-error hover:bg-error/10'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>
      </div>
      <div className={`h-8 w-full flex items-center gap-[1px] ${isMuted ? 'opacity-20 grayscale' : 'opacity-80'}`}>
        <div
          className="h-full opacity-100 transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundImage: 'repeating-linear-gradient(90deg, #d0bcff 0px, #d0bcff 2px, transparent 2px, transparent 4px)'
          }}
        ></div>
        <div
          className="h-full opacity-20 transition-all duration-300"
          style={{
            width: `${100 - progress}%`,
            backgroundImage: 'repeating-linear-gradient(90deg, #d0bcff 0px, #d0bcff 2px, transparent 2px, transparent 4px)'
          }}
        ></div>
      </div>
    </div>
  );
}

"use client";

import React from 'react';
import { useAudio } from '@/context/AudioContext';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  embedded?: boolean;
  className?: string;
}

export default function VolumeControl({ embedded = false, className = '' }: VolumeControlProps) {
  const { isMuted, volume, toggleMute } = useAudio();

  if (embedded) {
    return (
      <button
        onClick={toggleMute}
        className={`p-1 sm:p-1.5 rounded bg-[#0d0704] border border-[#52351e] text-[#8c6f4b] hover:text-[#ffd700] hover:border-[#8c6d23] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm ${className}`}
        aria-label={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
        title={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e5a842]" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffd700]" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleMute}
      className={`fixed top-4 right-4 z-50 flex items-center justify-center bg-[#1a0e05]/80 border border-[#d4af37]/40 rounded-full p-2.5 backdrop-blur-sm text-[#d4af37] hover:text-[#ffd700] hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.6)] cursor-pointer ${className}`}
      aria-label={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
      title={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
    >
      {isMuted || volume === 0 ? (
        <VolumeX className="w-5 h-5 text-[#e5a842]" />
      ) : (
        <Volume2 className="w-5 h-5 text-[#ffd700]" />
      )}
    </button>
  );
}

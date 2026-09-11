"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getNetworkTier, isSaveDataEnabled } from '@/lib/network-tier';

type AudioContextType = {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playButtonSound: () => void;
  playCoinSound: () => void;
};

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  // Default muted to prevent autoplay blocks and ensure SSR/client hydration match
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (isSaveDataEnabled() || getNetworkTier() === 'slow') {
      setIsMuted(true);
    }
  }, []);
  const [volume, setVolume] = useState(0.6);
  // Mirror mute state in a ref so play() callbacks never read a stale closure
  const isMutedRef = useRef(true);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const buttonSoundRef = useRef<HTMLAudioElement | null>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);

  // Lazy getters to prevent network requests and audio decoding on mount
  const getBgm = useCallback(() => {
    if (!bgmRef.current && typeof window !== 'undefined') {
      const audio = new Audio('/sounds/theme.opus');
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'none';
      bgmRef.current = audio;
    }
    return bgmRef.current;
  }, [volume]);

  const getButtonSound = useCallback(() => {
    if (!buttonSoundRef.current && typeof window !== 'undefined') {
      const audio = new Audio('/sounds/Button sound.m4a');
      audio.preload = 'none';
      buttonSoundRef.current = audio;
    }
    return buttonSoundRef.current;
  }, []);

  const getCoinSound = useCallback(() => {
    if (!coinSoundRef.current && typeof window !== 'undefined') {
      const audio = new Audio('/sounds/coin rush.m4a');
      audio.preload = 'none';
      coinSoundRef.current = audio;
    }
    return coinSoundRef.current;
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (bgmRef.current) {
      if (isMuted) {
        bgmRef.current.pause();
      } else {
        bgmRef.current.play().catch(() => {});
      }
    }
  }, [isMuted]);

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (buttonSoundRef.current) {
        buttonSoundRef.current = null;
      }
      if (coinSoundRef.current) {
        coinSoundRef.current = null;
      }
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (!next) {
        // User explicitly unmuted: initialize BGM if needed and play
        const bgm = getBgm();
        if (bgm) {
          bgm.play().catch(() => {});
        }
      } else if (bgmRef.current) {
        bgmRef.current.pause();
      }
      return next;
    });
  }, [getBgm]);

  const playButtonSound = useCallback(() => {
    if (isMutedRef.current) return;
    const sound = getButtonSound();
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }, [getButtonSound]);

  const playCoinSound = useCallback(() => {
    // Coins sound is kept ON always — does not turn off with the BGM mute button
    const sound = getCoinSound();
    if (sound) {
      sound.currentTime = 0;
      sound.volume = 0.85;
      sound.play().catch(() => {});
    }
  }, [getCoinSound]);

  // Global delegated listener: play the button sound for every button /
  // link / role="button" click anywhere in the app (opt-out via data-no-sound)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-no-sound]')) return;
      if (target.closest('button, a, [role="button"]')) {
        playButtonSound();
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [playButtonSound]);

  return (
    <AudioContext.Provider value={{ isMuted, volume, toggleMute, setVolume, playButtonSound, playCoinSound }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}


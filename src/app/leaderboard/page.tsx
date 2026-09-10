'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AdminRouteGuard from '@/components/uncharted/AdminRouteGuard';
import UnchartedSignboardLeaderboard, {
  LeaderboardEntry,
  ProductStatsEntry,
} from '@/components/uncharted/UnchartedSignboardLeaderboard';
import BackButton from '@/components/BackButton';
import { getNetworkTier, isSaveDataEnabled } from '@/lib/network-tier';

export default function PublicLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [productStats, setProductStats] = useState<ProductStatsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard?limit=50');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      const publicData = data.map(
        (
          entry: LeaderboardEntry & { completedProductsCount?: number },
          index: number
        ) => ({
          name: entry.name || '—',
          department: entry.department,
          totalFeedback: entry.completedProductsCount || 0,
          averageRating: entry.averageRating || 0,
          isCompleted: entry.isCompleted || false,
          shards: entry.shards || [],
          rank: index + 1,
        })
      );
      setLeaderboard(publicData);
      setError('');
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load expedition rankings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProductStats = useCallback(async () => {
    try {
      const response = await fetch('/api/product-stats');
      if (!response.ok) throw new Error('Failed to fetch product stats');
      const data = await response.json();
      setProductStats(data);
    } catch (err) {
      console.error('Error fetching product stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchProductStats();
    const interval = setInterval(() => {
      fetchLeaderboard();
      fetchProductStats();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard, fetchProductStats]);

  // Check network tier before mounting or playing background video
  useEffect(() => {
    const tier = getNetworkTier();
    const saveData = isSaveDataEnabled();
    if (tier !== 'slow' && !saveData) {
      setCanPlayVideo(true);
    }
  }, []);

  // Ensure autoplay works across all browsers & pause when tab is hidden
  useEffect(() => {
    if (!canPlayVideo) return;

    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Leaderboard background video autoplay prevented:', err);
      });
    }

    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.visibilityState === 'hidden') {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [videoError, canPlayVideo]);

  const [isPublicView, setIsPublicView] = useState(false);

  const togglePublicView = useCallback(() => {
    setIsPublicView((prev) => {
      const next = !prev;
      if (typeof document !== 'undefined') {
        if (next) {
          document.body.classList.add('public-display-mode');
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          document.body.classList.remove('public-display-mode');
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPublicView) {
        setIsPublicView(false);
        document.body.classList.remove('public-display-mode');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPublicView) {
        setIsPublicView(false);
        document.body.classList.remove('public-display-mode');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('public-display-mode');
    };
  }, [isPublicView]);

  const [isMuted, setIsMuted] = useState(false);

  // Ensure audio un-mutes upon user interaction
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.85;

    const enableAudio = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 0.85;
        videoRef.current.play().catch(console.warn);
        setIsMuted(false);
      }
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) =>
        window.removeEventListener(evt, enableAudio)
      );
    };

    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) =>
      window.addEventListener(evt, enableAudio, { once: true, passive: true })
    );

    return () => {
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) =>
        window.removeEventListener(evt, enableAudio)
      );
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = 0.85;
      if (!nextMuted) {
        videoRef.current.play().catch(console.warn);
      }
      setIsMuted(nextMuted);
    }
  };

  return (
    <AdminRouteGuard>
      <main className="relative h-screen min-h-screen w-full overflow-hidden bg-black text-foreground flex flex-col justify-center items-center">
        {/* Top Controls: Back to Admin & Public View Toggle (hidden completely in Public View) */}
        {!isPublicView && (
          <div className="fixed left-3 top-3 z-50 flex items-center gap-2">
            <BackButton to="/admin" label="Admin" />
            <button
              type="button"
              onClick={togglePublicView}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded border border-[#6b4728] bg-[#22150e]/95 px-3 font-mono text-xs text-[#c99f58] shadow-md transition select-none hover:border-[#8a5d33] hover:text-[#f3dfa2] active:scale-95"
              title="Toggle Fullscreen Public Display View"
            >
              <span className="text-sm leading-none">⛶</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
                Public View
              </span>
            </button>
          </div>
        )}

        {/* Fallback scenic image behind video */}
        <img
          src="/assets/images/leaderboard_scenic_bg.webp"
          alt="Expedition Background"
          className="pointer-events-none fixed inset-0 h-full w-full object-cover z-0"
        />

        {/* Looping background video */}
        {canPlayVideo && !videoError && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={false}
            playsInline
            preload="auto"
            poster="/assets/images/leaderboard_scenic_bg.webp"
            onError={() => {
              console.error('Failed to load /videos/leaderboard-background.mp4');
              setVideoError(true);
            }}
            className="pointer-events-none fixed inset-0 h-full w-full object-contain md:object-cover z-0"
          >
            <source src="/videos/leaderboard-background.mp4" type="video/mp4" />
          </video>
        )}

        {/* Main Uncharted Signboard Content Centered */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center items-center p-0">
          <UnchartedSignboardLeaderboard
            leaderboard={leaderboard}
            productStats={productStats}
            isLoading={isLoading}
            error={error}
            isAdmin={true}
            isPublicView={isPublicView}
            onTogglePublicView={togglePublicView}
            initialViewMode="products"
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onRefresh={() => {
              fetchLeaderboard();
              fetchProductStats();
            }}
          />
        </div>
      </main>
    </AdminRouteGuard>
  );
}

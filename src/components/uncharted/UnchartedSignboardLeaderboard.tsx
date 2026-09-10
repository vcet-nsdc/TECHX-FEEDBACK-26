'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@/context/UserContext';
import { csvCell } from '@/lib/utils';
import {
  Download,
  Maximize2,
  Minimize2,
  Package,
  RefreshCw,
  Search,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface LeaderboardEntry {
  name: string;
  department: string;
  totalFeedback: number;
  averageRating: number;
  isCompleted: boolean;
  shards: string[];
  rank: number;
  email?: string;
}

export interface ProductStatsEntry {
  productId: string;
  productName: string;
  labName: string;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  totalComments: number;
  lastRated: string | null;
}

interface UnchartedSignboardLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  productStats: ProductStatsEntry[];
  isLoading?: boolean;
  error?: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
  isPublicView?: boolean;
  onTogglePublicView?: () => void;
  initialViewMode?: 'users' | 'products';
}

// Clean lab name to strictly display "Lab 502", "Lab 508", "Lab 509" without any "Chapter 1/2" prefix
function cleanLabName(raw?: string): string {
  if (!raw) return '—';
  const matchNum = raw.match(/\b(5\d{2}|\d{3})\b/);
  if (matchNum) return `Lab ${matchNum[1]}`;
  const lower = raw.toLowerCase();
  if (lower.includes('king') || lower.includes('502') || raw.includes('01')) return 'Lab 502';
  if (lower.includes('forge') || lower.includes('libertalia') || lower.includes('508') || raw.includes('02')) return 'Lab 508';
  if (lower.includes('vault') || lower.includes('devon') || lower.includes('509') || raw.includes('03')) return 'Lab 509';
  const stripped = raw.replace(/Chapter\s*\d+\s*[-—:]*\s*/gi, '').trim();
  return stripped || raw;
}

// Format names into clean, readable Title Case (e.g. "VICTOR SULLIVAN" -> "Victor Sullivan")
function formatExplorerName(name: string): string {
  if (!name) return '—';
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Antiqued Expedition Medal Badge exclusively for Top 3 ranks
function MedalBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const medalConfig = {
    1: {
      ribbonLeft: '#2563eb',
      ribbonRight: '#1d4ed8',
      fillStart: '#fef08a',
      fillMid: '#eab308',
      fillEnd: '#ca8a04',
      stroke: '#f59e0b',
      text: '#451a03',
    },
    2: {
      ribbonLeft: '#3b82f6',
      ribbonRight: '#2563eb',
      fillStart: '#ffffff',
      fillMid: '#cbd5e1',
      fillEnd: '#94a3b8',
      stroke: '#94a3b8',
      text: '#0f172a',
    },
    3: {
      ribbonLeft: '#1d4ed8',
      ribbonRight: '#1e40af',
      fillStart: '#fed7aa',
      fillMid: '#f97316',
      fillEnd: '#c2410c',
      stroke: '#b45309',
      text: '#431407',
    },
  }[rank];

  const gradId = `medal-grad-${rank}`;

  return (
    <div className="inline-flex items-center justify-center select-none" title={`Expedition Rank ${rank}`}>
      <svg width="22" height="25" viewBox="0 0 22 25" fill="none" className="overflow-visible drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={medalConfig.fillStart} />
            <stop offset="45%" stopColor={medalConfig.fillMid} />
            <stop offset="100%" stopColor={medalConfig.fillEnd} />
          </linearGradient>
        </defs>
        {/* Expedition ribbon wings */}
        <polygon points="11,7 4,0 2,8 11,8" fill={medalConfig.ribbonLeft} />
        <polygon points="11,7 18,0 20,8 11,8" fill={medalConfig.ribbonRight} />
        {/* Circular Medallion */}
        <circle cx="11" cy="15.5" r="8" fill={`url(#${gradId})`} stroke={medalConfig.stroke} strokeWidth="1.2" />
        {/* Inner engraved border */}
        <circle cx="11" cy="15.5" r="6.4" fill="none" stroke={medalConfig.stroke} strokeWidth="0.5" strokeDasharray="1.5 1" opacity="0.8" />
        {/* Rank Number */}
        <text
          x="11"
          y="18.8"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="900"
          fontFamily="var(--font-cinzel), 'Cinzel', serif"
          fill={medalConfig.text}
        >
          {rank}
        </text>
      </svg>
    </div>
  );
}

// Rating display on a 5-point scale (score + 5 visual gold stars)
function ScaleRating({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const rounded = safeRating > 0 ? safeRating.toFixed(2) : '5.00';

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0 select-none">
      <span className="font-mono font-bold text-xs sm:text-sm md:text-base text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {rounded}
      </span>
      {/* 5 visual gold stars proportionally filled on a 5-point scale */}
      <div className="hidden xs:inline-flex sm:inline-flex items-center gap-0.5 text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillRatio = Math.max(0, Math.min(1, safeRating - (starIndex - 1)));
          return (
            <span key={starIndex} className="relative inline-block text-[10px] sm:text-xs leading-none">
              <span className="text-[#6d4323]/50">★</span>
              {fillRatio > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden text-amber-400"
                  style={{ width: `${Math.round(fillRatio * 100)}%` }}
                >
                  ★
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const GRID_COLS = "grid grid-cols-[46px_minmax(0,2.1fr)_minmax(0,1.5fr)_78px_110px] sm:grid-cols-[56px_minmax(0,2.1fr)_minmax(0,1.5fr)_90px_128px] md:grid-cols-[66px_minmax(0,2.2fr)_minmax(0,1.6fr)_100px_140px] lg:grid-cols-[72px_minmax(0,2.3fr)_minmax(0,1.6fr)_110px_150px] items-center";

export default function UnchartedSignboardLeaderboard({
  leaderboard,
  productStats,
  isLoading = false,
  error = '',
  isAdmin = false,
  onRefresh,
  isPublicView = false,
  onTogglePublicView,
  initialViewMode = 'products',
  isMuted = false,
  onToggleMute,
}: UnchartedSignboardLeaderboardProps & {
  isMuted?: boolean;
  onToggleMute?: () => void;
}) {
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<'users' | 'products'>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter leaderboard based on search query
  const filteredLeaderboard = useMemo(() => {
    let list = leaderboard;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (b.totalFeedback !== a.totalFeedback) {
        return b.totalFeedback - a.totalFeedback;
      }
      return (b.averageRating || 0) - (a.averageRating || 0);
    });
  }, [leaderboard, searchQuery]);

  // Filter products based on search query AND rank by highest average rating first
  const filteredProducts = useMemo(() => {
    let list = productStats;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.productName?.toLowerCase().includes(q) ||
          p.labName?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      // 1. Highest average rating on top
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }
      // 2. Highest total ratings count as tiebreaker
      return b.totalRatings - a.totalRatings;
    });
  }, [productStats, searchQuery]);

  // Pad to exactly 10 rows to maintain balanced signboard timber frame
  const displayedUsers = useMemo(() => {
    const list = filteredLeaderboard.slice(0, 10);
    const padded = [...list];
    while (padded.length < 10) {
      padded.push({
        name: '',
        department: '',
        totalFeedback: 0,
        averageRating: 0,
        isCompleted: false,
        shards: [],
        rank: padded.length + 1,
      });
    }
    return padded;
  }, [filteredLeaderboard]);

  const displayedProducts = useMemo(() => {
    const list = filteredProducts.slice(0, 10);
    const padded = [...list];
    while (padded.length < 10) {
      padded.push({
        productId: `empty-${padded.length}`,
        productName: '',
        labName: '',
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalComments: 0,
        lastRated: null,
      });
    }
    return padded;
  }, [filteredProducts]);

  // Export CSV for Admin mode
  const handleExportCSV = () => {
    if (viewMode === 'users') {
      const headers = ['Rank', 'Explorer Name', 'Email', 'Department', 'Discoveries', 'Avg Rating'];
      const rows = leaderboard.map((e, idx) => [
        e.rank || idx + 1,
        e.name || '',
        e.email || '',
        e.department || '',
        e.totalFeedback,
        (e.averageRating || 5).toFixed(2),
      ]);
      const csvContent = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `uncharted_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Rank', 'Product Name', 'Lab', 'Total Ratings', 'Average Rating'];
      const rows = productStats.map((p, idx) => [
        idx + 1,
        p.productName,
        cleanLabName(p.labName),
        p.totalRatings,
        p.averageRating.toFixed(2),
      ]);
      const csvContent = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `uncharted_discoveries_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleManualRefresh = () => {
    onRefresh?.();
  };

  // Fixed action icon buttons rendered directly to body
  const actionButtonsPortal = mounted
    ? createPortal(
        <>
          <div
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex items-center gap-2 pointer-events-auto transition-opacity duration-300 ${
              isPublicView ? 'opacity-25 hover:opacity-100' : ''
            }`}
          >
            {!isPublicView && onTogglePublicView && (
              <button
                onClick={onTogglePublicView}
                title="Enter Fullscreen Public Display View"
                className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-[#8a5d33] bg-[#1a0f07]/90 text-[#c99f58] hover:border-[#c99f58] hover:text-[#f3dfa2] shadow-[0_8px_25px_rgba(0,0,0,0.85)] active:scale-90 transition-all cursor-pointer"
              >
                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'users' ? 'products' : 'users')}
              title={viewMode === 'users' ? 'Switch to Products Leaderboard' : 'Switch to Students Leaderboard'}
              className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-[#6d4323]/80 bg-[#120803]/90 text-amber-300 shadow-[0_8px_25px_rgba(0,0,0,0.85)] hover:border-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              {viewMode === 'users' ? (
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
            {isAdmin && !isPublicView && (
              <button
                onClick={handleExportCSV}
                title="Export CSV"
                className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-emerald-600/80 bg-[#120803]/90 text-emerald-400 shadow-[0_8px_25px_rgba(0,0,0,0.85)] hover:border-emerald-400 active:scale-90 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            {onRefresh && (
              <button
                onClick={handleManualRefresh}
                title="Refresh Leaderboard"
                className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-amber-500/80 bg-[#2d180c]/90 text-amber-300 shadow-[0_8px_25px_rgba(0,0,0,0.85)] hover:border-amber-400 active:scale-90 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                className={`flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full border shadow-[0_8px_25px_rgba(0,0,0,0.85)] active:scale-90 transition-all cursor-pointer ${
                  isMuted
                    ? 'border-amber-500/80 bg-[#2d180c]/90 text-amber-400 animate-pulse'
                    : 'border-emerald-600/80 bg-[#120803]/90 text-emerald-400 hover:border-emerald-400'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            )}
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      <div className="relative mx-auto flex w-full h-full max-w-[1920px] flex-col items-center justify-center select-none p-0 pointer-events-none scale-100 sm:scale-[1.01] md:scale-[1.02] lg:scale-[1.03] xl:scale-[1.04] origin-center transition-all duration-300">
        
        {/* Full Signboard Container Centered over Background Video */}
        <div className="relative w-full aspect-[1024/576] max-h-[93vh] flex items-center justify-center">

          {/* 1. TOP "LEADERBOARD" TITLE WITH TIMBER PLANK TEXTURE */}
          <div 
            className="absolute z-10 text-center flex items-center justify-center pointer-events-auto"
            style={{
              top: '0.6%',
              left: '26.0%',
              width: '48.0%',
              height: '13.0%',
            }}
          >
            {/* Wooden plank background texture behind title */}
            <img
              src="/textures/leaderboard-title-plank.webp"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] select-none"
            />

            {/* Distressed Carved "LEADERBOARD" Title */}
            <div className="relative z-10 flex items-center justify-center w-full h-full px-8 sm:px-12 pointer-events-none">
              <h1
                style={{
                  fontFamily: "var(--font-cinzel), var(--font-base02), 'Cinzel', serif",
                  color: '#EFBF04',
                }}
                className="font-black text-xs sm:text-sm md:text-base lg:text-[18px] xl:text-[21px] uppercase tracking-[0.16em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] drop-shadow-[0_0_10px_rgba(239,191,4,0.4)] leading-none select-none text-center"
              >
                LEADERBOARD
              </h1>
            </div>
          </div>

          {/* 2. INNER RECTANGLE: 5-COLUMN UNCHARTED LEADERBOARD TABLE */}
          <div 
            className="absolute z-10 overflow-hidden flex flex-col pointer-events-auto rounded-xs border-2 border-[#5c371b]/70 shadow-[inset_0_2px_14px_rgba(0,0,0,0.95),0_6px_20px_rgba(0,0,0,0.8)] bg-[#120a05]/92"
            style={{
              top: '14.8%',
              left: '16.5%',
              width: '67.0%',
              height: '65.5%',
              fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif",
            }}
          >
            {/* Fetch error banner */}
            {error && leaderboard.length === 0 && (
              <div className="mb-0.5 rounded bg-black/60 px-2 py-0.5 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-red-300">
                {error}
              </div>
            )}

            {/* Loading state */}
            {isLoading && !error && (
              <div className="mb-0.5 rounded bg-black/40 px-2 py-0.5 text-center text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-amber-200/80">
                Charting rankings…
              </div>
            )}

            {/* Header Row: 5 Columns with Uncharted Theme Styling */}
            <div
              className={`${GRID_COLS} bg-[#23140a] border-b-2 border-[#825227]/70 py-1 sm:py-1.5 px-1 sm:px-2 font-black uppercase tracking-wider shrink-0 select-none shadow-md`}
              style={{ color: '#EFBF04' }}
            >
              <div className="text-center font-black text-xs sm:text-sm md:text-base border-r border-[#4e2d14]/60">
                RANK
              </div>
              <div className="text-left pl-2 sm:pl-3 font-black text-xs sm:text-sm md:text-base border-r border-[#4e2d14]/60 truncate">
                {viewMode === 'users' ? 'EXPLORER' : 'PRODUCT NAME'}
              </div>
              <div className="text-left pl-2 sm:pl-3 font-black text-xs sm:text-sm md:text-base border-r border-[#4e2d14]/60 truncate">
                {viewMode === 'users' ? 'DEPARTMENT' : 'LAB'}
              </div>
              <div className="text-center font-black text-[11px] sm:text-xs md:text-sm border-r border-[#4e2d14]/60 truncate">
                {viewMode === 'users' ? 'DISCOVERIES' : 'RATINGS'}
              </div>
              <div className="flex items-center justify-between pl-2 sm:pl-3 pr-1">
                <span className="font-black text-[11px] sm:text-xs md:text-sm truncate">
                  AVG RATING
                </span>
                {!isPublicView && (
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    title="Search"
                    className="opacity-80 hover:opacity-100 transition-opacity p-0.5 cursor-pointer ml-1 text-[#EFBF04]"
                  >
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Search Input */}
            {showSearch && (
              <div className="bg-black/85 px-3 py-1 border-b border-[#825227]/50 flex items-center gap-2 shrink-0">
                <Search className="h-4 w-4 text-[#EFBF04]" />
                <input
                  type="text"
                  placeholder={viewMode === 'users' ? 'Search explorer…' : 'Search product or lab…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm sm:text-base text-amber-100 placeholder-amber-400/50 outline-none font-bold"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm font-bold px-1.5 cursor-pointer text-amber-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* 10 Fixed Rows directly inside the signboard frame */}
            <div className="flex-1 grid grid-rows-10 divide-y-0 overflow-hidden select-none">
              {viewMode === 'users' ? (
                displayedUsers.map((entry, index) => {
                  const isTop3 = index < 3;
                  const isYou = Boolean(
                    user && (
                      (entry.name && user.name && entry.name.toLowerCase() === user.name.toLowerCase()) ||
                      (entry.email && user.email && entry.email.toLowerCase() === user.email.toLowerCase())
                    )
                  );
                  const isPlaceholder = !entry.name;
                  const displayName = entry.name ? formatExplorerName(entry.name) : '—';
                  const department = entry.department || '—';

                  return (
                    <div
                      key={`user-${index}-${entry.name || 'empty'}`}
                      className={`${GRID_COLS} px-1 sm:px-2 py-0 border-b transition-colors leading-tight h-full ${
                        isTop3
                          ? 'bg-gradient-to-r from-[#3b2512]/95 via-[#4a2e16]/95 to-[#3b2512]/95 hover:from-[#482d16] hover:to-[#482d16] border-[#734821]/45 text-[#fef3c7]'
                          : 'bg-[#160d07]/75 hover:bg-[#25150b]/80 border-[#3b200d]/35 text-[#d6c7b2]'
                      } ${isYou ? 'ring-1 ring-amber-400/80' : ''}`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center border-r border-black/30 h-full">
                        {isTop3 ? (
                          <MedalBadge rank={(index + 1) as 1 | 2 | 3} />
                        ) : (
                          <span className="font-black text-xs sm:text-sm md:text-base tracking-wider opacity-90">
                            #{index + 1}
                          </span>
                        )}
                      </div>

                      {/* Explorer Name */}
                      <div className="flex items-center pl-2 sm:pl-3 border-r border-black/30 h-full min-w-0 truncate">
                        <span className={`truncate font-bold text-xs sm:text-sm md:text-base ${isTop3 ? 'text-[#fef3c7]' : 'text-[#e8dcc4]'}`}>
                          {displayName}
                        </span>
                        {isYou && (
                          <span className="ml-1.5 text-[8px] sm:text-[9px] bg-amber-400 text-[#1a0e06] px-1 py-0.2 rounded font-black tracking-wider uppercase shrink-0">
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Department */}
                      <div className="flex items-center pl-2 sm:pl-3 border-r border-black/30 h-full min-w-0 truncate">
                        <span className={`truncate text-[11px] sm:text-xs md:text-sm ${isTop3 ? 'text-amber-200/90' : 'text-[#c4b39b]'}`}>
                          {department}
                        </span>
                      </div>

                      {/* Discoveries (Number of ratings / completed) */}
                      <div className="flex items-center justify-center border-r border-black/30 h-full font-mono font-bold text-xs sm:text-sm md:text-base">
                        <span>{isPlaceholder ? '—' : entry.totalFeedback}</span>
                      </div>

                      {/* Avg Rating (scale of 5) */}
                      <div className="flex items-center pl-2 sm:pl-3 h-full">
                        {isPlaceholder ? (
                          <span className="text-[#6d4323]">—</span>
                        ) : (
                          <ScaleRating rating={entry.averageRating || 5.0} />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                displayedProducts.map((entry, index) => {
                  const isTop3 = index < 3;
                  const isPlaceholder = !entry.productName;

                  return (
                    <div
                      key={`prod-${index}-${entry.productId || 'empty'}`}
                      className={`${GRID_COLS} px-1 sm:px-2 py-0 border-b transition-colors leading-tight h-full ${
                        isTop3
                          ? 'bg-gradient-to-r from-[#3b2512]/95 via-[#4a2e16]/95 to-[#3b2512]/95 hover:from-[#482d16] hover:to-[#482d16] border-[#734821]/45 text-[#fef3c7]'
                          : 'bg-[#160d07]/75 hover:bg-[#25150b]/80 border-[#3b200d]/35 text-[#d6c7b2]'
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center border-r border-black/30 h-full">
                        {isTop3 ? (
                          <MedalBadge rank={(index + 1) as 1 | 2 | 3} />
                        ) : (
                          <span className="font-black text-xs sm:text-sm md:text-base tracking-wider opacity-90">
                            #{index + 1}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <div className="flex items-center pl-2 sm:pl-3 border-r border-black/30 h-full min-w-0 truncate">
                        <span className={`truncate font-bold text-xs sm:text-sm md:text-base ${isTop3 ? 'text-[#fef3c7]' : 'text-[#e8dcc4]'}`}>
                          {entry.productName || '—'}
                        </span>
                      </div>

                      {/* Lab */}
                      <div className="flex items-center pl-2 sm:pl-3 border-r border-black/30 h-full min-w-0 truncate">
                        <span className={`truncate text-[11px] sm:text-xs md:text-sm ${isTop3 ? 'text-amber-200/90' : 'text-[#c4b39b]'}`}>
                          {cleanLabName(entry.labName)}
                        </span>
                      </div>

                      {/* Total Ratings (Number) */}
                      <div className="flex items-center justify-center border-r border-black/30 h-full font-mono font-bold text-xs sm:text-sm md:text-base">
                        <span>{isPlaceholder ? '—' : entry.totalRatings}</span>
                      </div>

                      {/* Avg Rating (scale of 5) */}
                      <div className="flex items-center pl-2 sm:pl-3 h-full">
                        {isPlaceholder ? (
                          <span className="text-[#6d4323]">—</span>
                        ) : (
                          <ScaleRating rating={entry.averageRating || 5.0} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {actionButtonsPortal}
    </>
  );
}

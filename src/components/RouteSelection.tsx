'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useLabs } from '@/context/LabsContext';
import { useAdmin } from '@/context/AdminContext';
import {
  expeditionLabs,
  getSubmittedFeedbackForUser,
  ExpeditionLab,
} from '@/lib/expeditionData';
import ExpeditionStatusHeader from './ExpeditionStatusHeader';
import TreasureCard from './TreasureCard';
import ProductIcon from './ProductIcon';
import { motion } from 'framer-motion';

interface LabSectorConfig {
  number: string;
  bgImage: string;
}

const LAB_CONFIGS: Record<string, LabSectorConfig> = {
  '1': { number: '502', bgImage: '/earthy-cards.png' },
  '2': { number: '508', bgImage: '/icey-cards.png' },
  '3': { number: '509', bgImage: '/lava-cards.png' },
};

function getLabSectorConfig(lab: ExpeditionLab, index: number): LabSectorConfig {
  const byId = LAB_CONFIGS[lab.id];
  if (byId) {
    const customNum = (lab.name + ' ' + (lab.title || '')).match(/\b(5\d{2}|\d{3})\b/);
    if (customNum) {
      return { ...byId, number: customNum[1] };
    }
    return byId;
  }
  const fallbackNumbers = ['502', '508', '509'];
  const fallbackImages = ['/earthy-cards.png', '/icey-cards.png', '/lava-cards.png'];
  return {
    number: fallbackNumbers[index % 3],
    bgImage: fallbackImages[index % 3],
  };
}

export default function RouteSelection() {
  const router = useRouter();
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const userEmail = user?.email || 'user@techx.in';
  const { labs } = useLabs();
  const [feedbackVersion, setFeedbackVersion] = useState(0);

  // Listen for feedback submissions across tabs or components
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      setFeedbackVersion((v) => v + 1);
    };
    window.addEventListener('feedbackSubmitted', handleFeedbackUpdate);
    window.addEventListener('storage', handleFeedbackUpdate);
    return () => {
      window.removeEventListener('feedbackSubmitted', handleFeedbackUpdate);
      window.removeEventListener('storage', handleFeedbackUpdate);
    };
  }, []);

  // Strictly 3 primary sectors with dynamic labs context
  const labList: ExpeditionLab[] = useMemo(() => {
    return [
      labs['1'] || expeditionLabs['1'],
      labs['2'] || expeditionLabs['2'],
      labs['3'] || expeditionLabs['3'],
    ].filter(Boolean);
  }, [labs]);

  // localStorage is read in an effect (not during render) so the server
  // render and first client paint agree — no hydration mismatch.
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  useEffect(() => {
    setSubmittedIds(getSubmittedFeedbackForUser(userEmail));
  }, [userEmail, feedbackVersion]);

  const perLabProgress = useMemo(() => {
    const map: Record<string, { completed: number; total: number; percentage: number; isCompleted: boolean }> = {};
    for (const lab of labList) {
      const cps = lab.checkpoints || [];
      const completed = cps.filter((cp) => submittedIds.includes(cp.id)).length;
      map[lab.id] = {
        completed,
        total: cps.length,
        percentage: cps.length > 0 ? Math.round((completed / cps.length) * 100) : 0,
        isCompleted: cps.length > 0 && completed === cps.length,
      };
    }
    return map;
  }, [labList, submittedIds]);

  // Compute completed sectors and checkpoints
  const completedSectorsCount = labList.filter((lab) => perLabProgress[lab.id]?.isCompleted).length;
  const completedCheckpoints = labList.reduce((acc, lab) => {
    return acc + (perLabProgress[lab.id]?.completed || 0);
  }, 0);

  const [activeLabId, setActiveLabId] = useState<string>('1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('last_active_expedition_lab');
      if (stored) {
        setActiveLabId(stored);
      } else {
        const firstIncomplete =
          labList.find((lab) => {
            const progress = perLabProgress[lab.id];
            return !progress?.isCompleted;
          })?.id || '1';
        setActiveLabId(firstIncomplete);
      }
    }
  }, [userEmail, feedbackVersion, labList, perLabProgress]);

  const handleEnterLab = (labId: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('last_active_expedition_lab', labId);
      } catch { }
    }
    router.push(`/labs/${labId}`);
  };

  return (
    <div className="relative min-h-[100dvh] w-full text-[#2c1a0e] flex flex-col items-center justify-start pt-6 pb-28 sm:pb-32 px-3 sm:px-6 overflow-x-hidden font-['Georgia'] select-none">
      {/* Original Parchment Map Background */}
      <div
        style={{ backgroundImage: `url('/assets/images/expedition_map_bg.webp')` }}
        className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none z-0"
      />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto flex flex-col items-center gap-5">
        {/* Expedition Status Header Plaque */}
        <ExpeditionStatusHeader
          completedCount={completedSectorsCount}
          totalCount={labList.length}
        />

        {/* 3 Authentic Torn Parchment Sector Expedition Cards */}
        <div className="w-full flex flex-col gap-5">
          {labList.map((lab, index) => {
            const progress = perLabProgress[lab.id] || {
              completed: 0,
              total: 0,
              percentage: 0,
              isCompleted: false,
            };
            const isCompleted = progress.isCompleted;
            const sectorPercent = progress.percentage;
            const config = getLabSectorConfig(lab, index);

            return (
              <motion.div
                key={lab.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.1 }}
                className="relative w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.88)] cursor-pointer select-none active:scale-[0.985] transition-transform duration-150 transform-gpu will-change-transform"
                onClick={() => handleEnterLab(lab.id)}
              >
                {/* Torn Parchment Dossier Plaque with Inset Safe Zone */}
                <div
                  style={{
                    backgroundImage: `url('/assets/images/torn-card-bg.webp')`,
                  }}
                  className="relative w-full bg-[length:100%_100%] bg-no-repeat bg-center px-10 sm:px-12 py-6 sm:py-7 flex flex-col justify-between min-h-[205px] text-[#241308] overflow-hidden"
                >
                  {/* Themed Environmental Background Artwork with Very Low Opacity */}
                  <div
                    style={{
                      backgroundImage: `url('${config.bgImage}')`,
                      WebkitMaskImage: `url('/assets/images/torn-card-bg.webp')`,
                      WebkitMaskSize: '100% 100%',
                      maskImage: `url('/assets/images/torn-card-bg.webp')`,
                      maskSize: '100% 100%',
                    }}
                    className="absolute inset-0 bg-cover bg-center opacity-[0.28] mix-blend-multiply pointer-events-none"
                  />
                  {/* Centered Large Ink Stamp with Paper Grain Bleed */}
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 select-none overflow-visible">
                      <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[390px] md:h-[390px] -rotate-[12deg] opacity-[0.78] mix-blend-multiply transition-transform transform-gpu">
                        <Image
                          src="/assets/images/stamp.webp"
                          alt="Completed Stamp"
                          width={500}
                          height={500}
                          priority
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Big LAB 502 / 508 / 509 Title in Crisp, Solid Typography */}
                  <div className="my-auto py-2 flex items-center justify-between">
                    <h2
                      style={{
                        fontFamily: "var(--font-oswald), var(--font-geist-sans), system-ui, -apple-system, sans-serif",
                        letterSpacing: '0.04em',
                      }}
                      className="text-4xl sm:text-5xl font-black text-[#1c0f05] tracking-tight leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      LAB {config.number}
                    </h2>
                    {isCompleted && (
                      <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-800/10 border border-emerald-800/30 px-2 py-0.5 rounded">
                        ✦ Completed
                      </span>
                    )}
                  </div>

                  {/* Mini Progress Track */}
                  <div className="my-1.5 w-full flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-mono font-bold uppercase text-[#7a481c]">
                      <span>Checkpoints: {progress.completed}/{progress.total}</span>
                      <span>{sectorPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#241308]/15 border border-[#7a481c]/25 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(3, sectorPercent)}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-[#b38920] to-[#ffd700] transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Products in Lab with Emojis */}
                  <div className="my-2 w-full">
                    <div className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-[#683f18] mb-1.5 flex items-center justify-between">
                      <span>Products ({lab.checkpoints?.length || 0}):</span>
                      <span>{progress.completed}/{progress.total} Completed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(lab.checkpoints || []).map((cp) => {
                        const isDone = submittedIds.includes(cp.id);
                        return (
                          <div
                            key={cp.id}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10.5px] sm:text-[11px] font-mono border backdrop-blur-[1px] transition-colors ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-950 font-semibold'
                                : 'bg-[#241308]/10 border-[#7a481c]/35 text-[#241308]'
                            }`}
                          >
                            <span className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center overflow-hidden drop-shadow-xs">
                              <ProductIcon icon={cp.icon} fallback="📦" imgClassName="w-full h-full" />
                            </span>
                            <span className="truncate flex-1 font-sans font-bold text-[11px] leading-tight">
                              {cp.name}
                            </span>
                            {isDone && (
                              <span className="text-emerald-700 font-bold text-[10px] shrink-0">✓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Action Button - Authentic Uncharted Stone & Bronze Plaque */}
                  <div className="mt-2 w-full">
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterLab(lab.id);
                        }}
                        className="uncharted-btn-card"
                        aria-label={`Review Lab ${config.number}`}
                      >
                        <div className="btn-inner">
                          <span className="btn-title">REVIEW LAB {config.number}</span>
                          <span className="px-2 py-0.5 text-[9px] bg-black/70 text-emerald-300 rounded-full border border-emerald-500/40 font-mono font-bold uppercase tracking-wider shrink-0">
                            ✦ Completed
                          </span>
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterLab(lab.id);
                        }}
                        className="uncharted-btn-card"
                        aria-label={`Enter Lab ${config.number}`}
                      >
                        <div className="btn-inner">
                          <span className="btn-title">ENTER LAB {config.number}</span>
                          <span className="text-[#e5c386] font-bold text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] shrink-0">
                            ➔
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Unlockable 3-Tier Mystery Treasure Card */}
          <TreasureCard
            completedCount={completedCheckpoints}
            targetCount={7}
            userEmail={userEmail}
            currentLabId={activeLabId}
            lab1Completed={perLabProgress['1']?.isCompleted ?? false}
            lab2Completed={perLabProgress['2']?.isCompleted ?? false}
            lab3Completed={perLabProgress['3']?.isCompleted ?? false}
            completedLabIds={labList.filter((l) => perLabProgress[l.id]?.isCompleted).map((l) => l.id)}
          />
        </div>
      </div>
    </div>
  );
}
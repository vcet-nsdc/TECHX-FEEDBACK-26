'use client';

import React from 'react';

interface ExpeditionStatusHeaderProps {
  completedCount?: number;
  totalCount?: number;
  completedCheckpoints?: number;
  totalCheckpoints?: number;
  overallPercentage?: number;
}

export default function ExpeditionStatusHeader({
  completedCount = 0,
  totalCount = 3,
}: ExpeditionStatusHeaderProps) {
  return (
    <div className="relative w-full max-w-[480px] mx-auto drop-shadow-[0_14px_32px_rgba(0,0,0,0.92)] select-none">
      <div
        style={{
          backgroundImage: `url('/assets/images/expedition_status_bg.webp')`,
          aspectRatio: '520 / 250',
        }}
        className="relative w-full bg-[length:100%_100%] bg-no-repeat bg-center"
      >
        {/* Printable Parchment Safe Zone */}
        <div className="absolute inset-0 pt-[17%] pb-[14%] px-[12%] flex flex-col items-center justify-between text-center">
          {/* Main Themed Heading */}
          <div>
            <h1
              style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
              className="font-black text-lg sm:text-xl tracking-[0.16em] text-[#1c0f05] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] uppercase leading-none"
            >
              LAB STATUS
            </h1>
            <p
              style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
              className="text-[10px] sm:text-xs tracking-[0.18em] text-[#7a481c] uppercase mt-1.5 font-extrabold"
            >
              {completedCount} OF {totalCount} LABS COMPLETED
            </p>
          </div>

          {/* 3 Circular Sector Badge Indicators */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 my-auto">
            {Array.from({ length: totalCount }).map((_, idx) => {
              const isCompleted = idx < completedCount;
              const badgeLabel = ['502', '508', '509'][idx] || `0${idx + 1}`;
              return (
                <div
                  key={idx}
                  style={{ fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif" }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-[10px] sm:text-[11px] shadow-md transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#854d0e] border-2 border-[#fffbeb] text-[#1c1917] shadow-md'
                      : 'bg-gradient-to-b from-[#2b1708] via-[#1a0f05] to-[#0d0702] border-2 border-[#8c6d23] text-[#d4af37]'
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-xs text-[#1c1917]">✦</span>
                  ) : (
                    badgeLabel
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
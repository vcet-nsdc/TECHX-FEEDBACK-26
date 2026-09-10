'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ThankYouScreenProps {
  userName?: string;
  userEmail?: string;
}

export default function ThankYouScreen({ userName, userEmail }: ThankYouScreenProps) {
  const [isReDownloading, setIsReDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const cleanName = (userName || 'Explorer').trim().toUpperCase();

  const handleDownloadAgain = async () => {
    setIsReDownloading(true);
    setDownloadSuccess(false);

    const cleanFileName = `TechX_2026_Certificate_${cleanName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    try {
      const downloadUrl = `/api/certificate?name=${encodeURIComponent(cleanName)}&t=${Date.now()}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('API failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to re-download certificate:', err);
    } finally {
      setIsReDownloading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full text-[#f5ebd7] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-['Georgia'] select-none">
      {/* Background with Parchment & Underwater overlay */}
      <div
        style={{ backgroundImage: `url('/assets/images/expedition_map_bg.webp')` }}
        className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none z-0 brightness-40"
      />
      <div
        style={{ backgroundImage: `url('/treasure.png')` }}
        className="fixed inset-0 w-full h-full bg-cover bg-center opacity-10 pointer-events-none z-0"
      />

      {/* Main Thank You Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1c0f05] via-[#2c180b] to-[#120802] p-6 sm:p-9 md:p-10 text-center shadow-[0_0_60px_rgba(212,175,55,0.45)] overflow-hidden"
      >
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#d4af37]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#8b261d]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Golden Trophy Medallion */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#8b5a2b] p-1 shadow-[0_0_35px_rgba(212,175,55,0.65)] flex items-center justify-center animate-pulse">
            <div className="w-full h-full rounded-full bg-[#1a0c03] flex items-center justify-center text-3xl sm:text-4xl">
              🏆
            </div>
          </div>
        </div>

        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#fef08a] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3">
          <span>✦ EXPEDITION OFFICIALLY CONCLUDED ✦</span>
        </div>

        <h1
          style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
          className="text-2xl sm:text-3xl md:text-4xl font-black text-[#ffd700] tracking-wide leading-tight"
        >
          THANK YOU FOR YOUR FEEDBACK!
        </h1>

        <p className="text-sm sm:text-base font-mono text-[#d4b988] mt-1 mb-4">
          TechX 2026 Research Expedition &bull; VCET-NSDC
        </p>

        <div className="w-36 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-4" />

        <p className="text-xs sm:text-sm text-[#e6d5c1] font-serif leading-relaxed mb-6">
          Thank you, <strong className="text-[#ffd700] font-sans">{cleanName}</strong>! Your comprehensive feedback and observations have been recorded and sealed in the permanent archive. Your official Certificate of Discovery has been generated and issued.
        </p>

        {/* Expedition Statistics Summary Plaque */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 p-3.5 rounded-2xl bg-[#120702]/80 border border-[#8b6943]/40 shadow-inner">
          <div className="flex flex-col items-center py-1">
            <span className="text-xl sm:text-2xl font-black text-[#ffd700]">4</span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[#a07246] uppercase tracking-wider">
              Labs Explored
            </span>
          </div>
          <div className="flex flex-col items-center py-1">
            <span className="text-xl sm:text-2xl font-black text-[#ffd700]">31</span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[#a07246] uppercase tracking-wider">
              Reviews Sealed
            </span>
          </div>
          <div className="flex flex-col items-center py-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">1</span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[#a07246] uppercase tracking-wider">
              Relic Secured
            </span>
          </div>
          <div className="flex flex-col items-center py-1">
            <span className="text-xl sm:text-2xl font-black text-[#fef08a]">✓</span>
            <span className="text-[9px] sm:text-[10px] font-mono text-[#a07246] uppercase tracking-wider">
              Cert Issued
            </span>
          </div>
        </div>

        {/* Sealed Route Access Notice */}
        <div className="my-5 p-3 rounded-xl bg-[#8b261d]/15 border border-[#8b261d]/40 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#fca5a5] font-mono">
          <span>🔒</span>
          <span>Expedition Completed • Route navigation is permanently closed.</span>
        </div>

        {/* Download Success Notice */}
        {downloadSuccess && (
          <div className="mb-3 py-1.5 px-3 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-200 font-mono text-xs font-bold text-center animate-pulse">
            ✓ Certificate re-downloaded successfully!
          </div>
        )}

        {/* Re-download button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDownloadAgain}
            disabled={isReDownloading}
            style={{
              fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif",
              clipPath:
                'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
            }}
            className="w-full py-3 px-5 bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer border border-[#fff9d6] disabled:opacity-50"
          >
            <span>{isReDownloading ? 'Generating Certificate...' : '⬇ Re-download Certificate (PNG)'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

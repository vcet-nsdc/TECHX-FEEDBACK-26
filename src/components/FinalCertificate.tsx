'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { motion } from 'framer-motion';

interface SectorBadge {
  num: string;
  name: string;
  code: string;
}

const SECTORS: SectorBadge[] = [
  { num: '502', name: 'Jungle Sector', code: 'LAB 502' },
  { num: '508', name: 'Glacier Sector', code: 'LAB 508' },
  { num: '509', name: 'Volcano Sector', code: 'LAB 509' },
  { num: '510', name: 'Desert Sector', code: 'LAB 510' },
];

export default function FinalCertificate() {
  const { user } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [mountedName, setMountedName] = useState('');

  // Hydrate stored user session name on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const session = localStorage.getItem('user_session');
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed?.name) setMountedName(parsed.name);
        }
      } catch {}
    }
  }, []);

  const rawName = (user?.name || mountedName || 'Explorer').trim();
  const displayName = rawName.toUpperCase();
  const displayEmail = user?.email || 'agent@techx.in';
  const displayDept = user?.department || 'Field Reconnaissance';

  // Format today's date in grand expedition style
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Strict History Lock: trap browser back button on /finish
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const emailKey = displayEmail.trim().toLowerCase();
    if (emailKey) {
      localStorage.setItem(`techx_certificate_downloaded_${emailKey}`, 'true');
      localStorage.setItem(`techx_expedition_concluded_${emailKey}`, 'true');
    }
    localStorage.setItem('techx_certificate_downloaded_global', 'true');
    localStorage.setItem('techx_expedition_concluded_global', 'true');

    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [displayEmail]);

  // Client-side canvas certificate generation (100% reliable, zero server font dependencies)
  const generateCanvasCertificate = async (name: string): Promise<HTMLCanvasElement> => {
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = '/certificate/certificate.png';

    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load certificate image template'));
      }
    });

    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1414;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // 1. Draw base certificate image template
    ctx.drawImage(img, 0, 0, 2000, 1414);

    // 2. "PROUDLY PRESENTED TO" label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5c3a1e';
    ctx.font = 'bold 26px Cinzel, Georgia, "Times New Roman", serif';
    ctx.fillText('P R O U D L Y   P R E S E N T E D   T O', 1000, 550);

    // 3. Participant Name with responsive font sizing
    let fontSize = 78;
    if (name.length > 28) {
      fontSize = 46;
    } else if (name.length > 20) {
      fontSize = 58;
    } else if (name.length > 14) {
      fontSize = 68;
    }

    // High contrast warm outline backing so name pops on top of parchment grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `bold ${fontSize}px Cinzel, Georgia, "Times New Roman", serif`;
    ctx.fillText(name, 1000, 637);

    // Primary rich dark lettering
    ctx.fillStyle = '#140701';
    ctx.font = `bold ${fontSize}px Cinzel, Georgia, "Times New Roman", serif`;
    ctx.fillText(name, 1000, 635);

    return canvas;
  };

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    const cleanFileName = `TechX_2026_Certificate_${displayName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    try {
      // Primary: High-fidelity client-side canvas render (ensures name is ALWAYS rendered on Netlify & mobile)
      const canvas = await generateCanvasCertificate(displayName);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
      );

      if (!blob) throw new Error('Canvas blob export failed');

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('Canvas certificate generation failed, trying API fallback:', err);
      try {
        const downloadUrl = `/api/certificate?name=${encodeURIComponent(displayName)}&t=${Date.now()}`;
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = cleanFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      } catch (fallbackErr) {
        console.error('All certificate download methods failed:', fallbackErr);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [displayName]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-start py-8 sm:py-12 px-3 sm:px-6 overflow-x-hidden text-[#f5ebd7] select-none">
      {/* Background: Expedition Map with Atmospheric Vignette */}
      <div
        style={{ backgroundImage: `url('/assets/images/expedition_map_bg.webp')` }}
        className="fixed inset-0 w-full h-full bg-cover bg-center pointer-events-none z-0"
      />
      <div className="fixed inset-0 w-full h-full bg-radial from-[#150a03]/85 via-[#0b0502]/95 to-[#040201] pointer-events-none z-0" />

      {/* Main Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center gap-6"
      >
        {/* Top Explorer Achievement Plaque */}
        <div className="text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/45 text-[#fde047] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 shadow-[0_0_12px_rgba(212,175,55,0.25)]">
            <span>✦ EXPEDITION RECORD SEALED ✦</span>
          </div>

          <h1
            style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
            className="text-2xl sm:text-3xl md:text-4xl font-black text-[#ffd700] tracking-wider drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] text-center"
          >
            CERTIFICATE OF DISCOVERY
          </h1>

          <p className="text-xs sm:text-sm text-[#d4af37]/90 font-mono tracking-wide mt-1">
            TECHX 2026 // OFFICIAL ARCHIVE OF HONOR
          </p>

          <div className="mt-2 text-xs sm:text-sm font-mono text-[#c4a482]">
            Awarded to Explorer: <strong className="text-[#ffd700] font-bold">{displayName}</strong>
          </div>
        </div>

        {/* The Official Certificate Showcase Frame */}
        <div className="relative w-full rounded-2xl border-2 border-[#d4af37] bg-[#120803] p-2.5 sm:p-4 shadow-[0_0_50px_rgba(212,175,55,0.35)] overflow-hidden">
          <div className="relative w-full rounded-xl overflow-hidden border border-[#8c6d23]/80 shadow-2xl bg-[#0a0502]">
            {/* Base Certificate Template Image */}
            <img
              src="/certificate/certificate.png"
              alt="TechX 2026 Certificate of Discovery"
              className="w-full h-auto block object-contain pointer-events-none"
            />

            {/* Dynamic Name Overlay positioned on the certificate plaque */}
            <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none">
              {/* "PROUDLY PRESENTED TO" label */}
              <div
                style={{
                  top: '38.8%',
                  fontFamily: "var(--font-cinzel), 'Cinzel', 'Times New Roman', Georgia, serif",
                }}
                className="absolute text-[7px] sm:text-[10px] md:text-[12px] lg:text-[14px] font-bold tracking-[0.2em] text-[#5c3a1e] uppercase"
              >
                PROUDLY PRESENTED TO
              </div>

              {/* Participant Name */}
              <div
                style={{
                  top: '44.8%',
                  fontFamily: "var(--font-cinzel), 'Cinzel', 'Times New Roman', Georgia, serif",
                }}
                className="absolute text-xs sm:text-lg md:text-xl lg:text-2xl font-black tracking-wider text-[#140701] drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)] drop-shadow-[0_0_6px_rgba(212,175,55,0.35)] px-4 max-w-[85%] text-center uppercase"
              >
                {displayName}
              </div>
            </div>

            {/* Verified & Archived Seal Stamp (Diagonal Ribbon) */}
            <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[8px] sm:text-[10px] font-mono font-bold py-0.5 px-2 rounded -rotate-3 shadow-md tracking-wider">
              VERIFIED // TECHX 2026
            </div>
          </div>
        </div>

        {/* 4 Completed Research Sectors — Themed Explorer Dossier Plaque */}
        <div className="w-full rounded-2xl border border-[#8c6d23]/50 bg-gradient-to-b from-[#180f08]/95 via-[#130b05]/95 to-[#0b0602] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#8c6d23]/35 pb-2.5 mb-3.5">
            <span
              style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
              className="text-xs sm:text-sm font-bold text-[#e6c265] uppercase tracking-wider"
            >
              Surveys Completed Across All Sectors
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-[#d4af37]">
              4 / 4 CONCLUDED ✦
            </span>
          </div>

          {/* 4 Clean Themed Sector Cards (NO Roman numbers, only Lab Name and Themed Sealed Badge) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SECTORS.map((sector) => (
              <div
                key={sector.num}
                className="relative rounded-xl border border-[#8c6d23]/40 bg-[#22140a]/80 p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-md hover:border-[#b38920]/60 transition-colors"
              >
                {/* Lab Name */}
                <div
                  style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
                  className="text-xs sm:text-sm font-black text-[#ffd700] tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                >
                  {sector.code}
                </div>

                {/* Themed Antique Wax Seal Tag */}
                <div className="mt-2 inline-flex items-center justify-center px-2.5 py-0.5 rounded bg-[#2d0f09]/80 border border-[#8b261d]/60 text-[#fca5a5] font-mono text-[9px] sm:text-[9.5px] font-bold uppercase tracking-widest shadow-inner">
                  ✦ SEALED ✦
                </div>
              </div>
            ))}
          </div>

          {/* Explorer Credentials Info Bar */}
          <div className="mt-4 pt-3 border-t border-[#8c6d23]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-[#c4a482] font-mono">
            <div>
              <span>Explorer: </span>
              <strong className="text-[#fef08a]">{displayName}</strong> ({displayDept})
            </div>
            <div>
              <span>Date of Issue: </span>
              <strong className="text-[#fef08a]">{currentDate}</strong>
            </div>
          </div>
        </div>

        {/* Download Success Notice */}
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 font-mono text-xs font-bold text-center shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
          >
            ✓ Certificate downloaded successfully to your device!
          </motion.div>
        )}

        {/* Actions Plaque */}
        <div className="w-full flex flex-col gap-3">
          {/* Re-Download Certificate Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif",
              clipPath:
                'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
            }}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.985] transition flex items-center justify-center gap-2 cursor-pointer border border-[#fff9d6] disabled:opacity-50"
          >
            <span>
              {isDownloading ? 'Generating Certificate...' : '⬇ DOWNLOAD YOUR CERTIFICATE (PNG)'}
            </span>
          </button>

          {/* Claim Your Reward & Social Reach Challenge Plaque */}
          <div className="w-full p-4 sm:p-5 rounded-xl bg-[#120a04]/95 border-2 border-[#8c6d23]/60 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-center flex flex-col gap-3.5">
            {/* Header */}
            <div className="flex flex-col items-center gap-1">
              <h3
                style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
                className="text-base sm:text-xl font-black text-[#ffd700] uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center gap-2"
              >
                <span>🏆</span>
                <span>Claim Your Reward</span>
              </h3>
              <p className="text-xs sm:text-sm font-bold text-[#e6c265] font-mono tracking-tight">
                Complete both tasks to participate in the Social Reach Challenge:
              </p>
            </div>

            {/* Task Grid (LinkedIn & Instagram) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {/* LinkedIn Task */}
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#1a0f07] border border-[#0a66c2]/50 hover:border-[#0a66c2] transition shadow-inner flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔵</span>
                  <span className="font-bold text-sm text-[#e8d5b5] font-mono tracking-wide uppercase">
                    LinkedIn
                  </span>
                </div>
                <p className="text-xs text-[#cfbda8] font-serif leading-relaxed">
                  Post your TECHX Certificate and mention{' '}
                  <a
                    href="https://www.linkedin.com/in/vcet-nsdc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#60a5fa] hover:text-[#93c5fd] underline decoration-[#60a5fa]/60 transition cursor-pointer"
                  >
                    VCET NSDC
                  </a>
                </p>
                <a
                  href="https://www.linkedin.com/in/vcet-nsdc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 w-full py-1.5 px-3 rounded bg-[#0a66c2]/20 hover:bg-[#0a66c2]/35 border border-[#0a66c2]/60 text-xs font-mono font-bold text-[#93c5fd] flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>Open LinkedIn</span>
                  <span>➔</span>
                </a>
              </div>

              {/* Instagram Task */}
              <div className="p-3 sm:p-3.5 rounded-lg bg-[#1a0f07] border border-[#e1306c]/50 hover:border-[#e1306c] transition shadow-inner flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📸</span>
                  <span className="font-bold text-sm text-[#e8d5b5] font-mono tracking-wide uppercase">
                    Instagram
                  </span>
                </div>
                <p className="text-xs text-[#cfbda8] font-serif leading-relaxed">
                  Post your TECHX Certificate and tag{' '}
                  <a
                    href="https://www.instagram.com/vcet.nsdc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#f472b6] hover:text-[#fbcfe8] underline decoration-[#f472b6]/60 transition cursor-pointer"
                  >
                    @vcet.nsdc
                  </a>
                </p>
                <a
                  href="https://www.instagram.com/vcet.nsdc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 w-full py-1.5 px-3 rounded bg-[#e1306c]/20 hover:bg-[#e1306c]/35 border border-[#e1306c]/60 text-xs font-mono font-bold text-[#fbcfe8] flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>Open Instagram</span>
                  <span>➔</span>
                </a>
              </div>
            </div>

            {/* Highest Reach Wins Banner */}
            <div className="p-3 sm:p-3.5 rounded-lg bg-gradient-to-r from-[#8c6d23]/25 via-[#ffd700]/20 to-[#8c6d23]/25 border border-[#d4af37]/70 shadow-md flex flex-col items-center gap-1 text-center">
              <div className="text-xs sm:text-sm font-black text-[#ffd700] uppercase tracking-wider flex items-center justify-center gap-1.5">
                <span>🏆</span>
                <span>HIGHEST REACH WINS!</span>
                <span>🎁</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#f5e6cc] leading-snug max-w-lg">
                The participant with the highest combined reach across Instagram + LinkedIn will win an <span className="text-[#ffd700] underline decoration-[#ffd700]/60">EXCLUSIVE GIFT FROM NSDC!</span> 🎁🔥
              </p>
            </div>

            {/* Complete Both Action Footer */}
            <div className="pt-1 text-xs sm:text-sm font-black text-[#ffd700] tracking-wider font-mono uppercase text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Complete Both → Share → Maximize Your Reach → WIN! 🏆
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}



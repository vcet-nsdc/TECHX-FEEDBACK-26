'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  department?: string;
}

export default function CertificateModal({
  isOpen,
  onClose,
  userEmail: _userEmail,
  userName,
  department: _department,
}: CertificateModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Fixed participant name from user profile / session (non-editable)
  const fallbackStoredName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const session = localStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed?.name || '';
      }
    } catch {}
    return '';
  }, []);

  const cleanName = (userName || user?.name || fallbackStoredName || 'Explorer').trim();
  const displayName = cleanName.toUpperCase();

  // Client-side canvas generator (primary, 100% reliable across Netlify, mobile, offline)
  const generateCertificateCanvas = async (): Promise<HTMLCanvasElement> => {
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
        img.onerror = () => reject(new Error('Failed to load certificate template image'));
      }
    });

    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1414;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // 1. Draw base certificate template image
    ctx.drawImage(img, 0, 0, 2000, 1414);

    // 2. "PROUDLY PRESENTED TO"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5c3a1e';
    ctx.font = 'bold 26px Cinzel, Georgia, "Times New Roman", serif';
    ctx.fillText('P R O U D L Y   P R E S E N T E D   T O', 1000, 550);

    // 3. Participant Name in large, prominent lettering
    let fontSize = 78;
    if (displayName.length > 28) {
      fontSize = 46;
    } else if (displayName.length > 20) {
      fontSize = 58;
    } else if (displayName.length > 14) {
      fontSize = 68;
    }

    // High contrast warm outline backing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `bold ${fontSize}px Cinzel, Georgia, "Times New Roman", serif`;
    ctx.fillText(displayName, 1000, 637);

    ctx.fillStyle = '#140701';
    ctx.font = `bold ${fontSize}px Cinzel, Georgia, "Times New Roman", serif`;
    ctx.fillText(displayName, 1000, 635);

    return canvas;
  };

  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    const cleanFileName = `TechX_2026_Certificate_${displayName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

    try {
      // Primary: High-fidelity client-side canvas render (ensures name is ALWAYS rendered on Netlify & mobile)
      const canvas = await generateCertificateCanvas();
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

      // Persist expedition conclusion & certificate downloaded
      if (typeof window !== 'undefined') {
        const emailKey = (_userEmail || user?.email || '').trim().toLowerCase();
        if (emailKey) {
          localStorage.setItem(`techx_certificate_downloaded_${emailKey}`, 'true');
          localStorage.setItem(`techx_expedition_concluded_${emailKey}`, 'true');
        }
        localStorage.setItem('techx_certificate_downloaded_global', 'true');
        localStorage.setItem('techx_expedition_concluded_global', 'true');
        window.dispatchEvent(new Event('certificateDownloaded'));
        window.dispatchEvent(new Event('storage'));
      }

      setDownloadSuccess(true);
      setTimeout(() => {
        onClose();
        router.push('/finish');
      }, 700);
    } catch (err) {
      console.warn('Canvas download failed, trying server API fallback:', err);
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

        if (typeof window !== 'undefined') {
          const emailKey = (_userEmail || user?.email || '').trim().toLowerCase();
          if (emailKey) {
            localStorage.setItem(`techx_certificate_downloaded_${emailKey}`, 'true');
            localStorage.setItem(`techx_expedition_concluded_${emailKey}`, 'true');
          }
          localStorage.setItem('techx_certificate_downloaded_global', 'true');
          localStorage.setItem('techx_expedition_concluded_global', 'true');
          window.dispatchEvent(new Event('certificateDownloaded'));
          window.dispatchEvent(new Event('storage'));
        }

        setDownloadSuccess(true);
        setTimeout(() => {
          onClose();
          router.push('/finish');
        }, 700);
      } catch (fallbackErr) {
        console.error('All certificate download methods failed:', fallbackErr);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl my-auto rounded-2xl border-2 border-[#b38920] bg-gradient-to-b from-[#1f1207] via-[#2c1a0e] to-[#120a03] p-4 sm:p-6 md:p-7 text-[#f5ebd7] shadow-[0_0_50px_rgba(212,175,55,0.4)] overflow-hidden"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close certificate modal"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-[#1c0f05]/90 text-[#f5ebd7] border border-[#8b6943]/60 flex items-center justify-center font-bold text-sm cursor-pointer z-30 hover:bg-[#8b261d] transition active:scale-95 shadow-md"
          >
            ✕
          </button>

          {/* Modal Header */}
          <div className="flex flex-col items-center text-center pb-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/60 text-[#fde047] font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1.5 shadow-xs">
              <span>✦ YOUR CERTIFICATE HAS BEEN GENERATED ✦</span>
            </div>
            <h2
              style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
              className="text-lg sm:text-2xl font-black text-[#ffd700] tracking-wide"
            >
              CERTIFICATE OF DISCOVERY
            </h2>
            <p className="text-xs sm:text-sm text-[#c4a482] font-mono mt-0.5">
              Awarded for active evaluation & participation in TechX 2026
            </p>
          </div>

          {/* Non-editable Participant Name Plaque */}
          <div className="my-2.5 px-4 py-2.5 rounded-xl bg-[#140a02]/80 border border-[#8c6d23]/50 flex items-center justify-between gap-3">
            <span
              style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
              className="text-xs font-bold text-[#a07246] uppercase tracking-wider"
            >
              Certificate Issued To:
            </span>
            <span
              style={{ fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif" }}
              className="text-sm sm:text-base font-black text-[#ffd700] tracking-wide uppercase"
            >
              {displayName}
            </span>
          </div>

          {/* Certificate Live Preview (Template Image with Dynamic Name Overlay - NO CENTER LINE) */}
          <div className="relative my-2 rounded-xl overflow-hidden border-2 border-[#d4af37]/80 shadow-[0_0_25px_rgba(0,0,0,0.85)] bg-[#0f0702] select-none">
            {/* The Actual Certificate Image Template */}
            <img
              src="/certificate/certificate.png"
              alt="TechX 2026 Certificate Template"
              className="w-full h-auto block object-contain pointer-events-none"
            />

            {/* Dynamic Participant Name Overlay on Top of the Certificate */}
            <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none">
              {/* "PROUDLY PRESENTED TO" label */}
              <div
                style={{
                  top: '38.8%',
                  fontFamily: "var(--font-cinzel), 'Cinzel', 'Times New Roman', Georgia, serif",
                }}
                className="absolute text-[8px] sm:text-[11px] md:text-[13px] lg:text-[15px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-[#5c3a1e] uppercase"
              >
                PROUDLY PRESENTED TO
              </div>

              {/* Participant Name */}
              <div
                style={{
                  top: '44.8%',
                  fontFamily: "var(--font-cinzel), 'Cinzel', 'Times New Roman', Georgia, serif",
                }}
                className="absolute text-sm sm:text-xl md:text-2xl lg:text-3xl font-black tracking-wider text-[#140701] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] px-4 max-w-[85%] text-center uppercase"
              >
                {displayName}
              </div>
            </div>
          </div>

          {/* Download Success Banner */}
          {downloadSuccess && (
            <div className="mt-3 py-1.5 px-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-200 font-mono text-xs font-bold text-center animate-pulse shadow-sm">
              ✓ High-resolution certificate generated and downloaded to your device!
            </div>
          )}

          {/* Action Buttons: Go to Certificate Page (Primary) & Direct Download */}
          <div className="w-full mt-4 pt-3 border-t border-[#8c6d23]/40 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const emailKey = (_userEmail || user?.email || '').trim().toLowerCase();
                  if (emailKey) {
                    localStorage.setItem(`techx_certificate_downloaded_${emailKey}`, 'true');
                    localStorage.setItem(`techx_expedition_concluded_${emailKey}`, 'true');
                  }
                  localStorage.setItem('techx_certificate_downloaded_global', 'true');
                  localStorage.setItem('techx_expedition_concluded_global', 'true');
                  window.dispatchEvent(new Event('certificateDownloaded'));
                }
                onClose();
                router.push('/finish');
              }}
              style={{
                fontFamily: "var(--font-cinzel), 'Cinzel', Georgia, serif",
                clipPath:
                  'polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)',
              }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#996515] text-[#140802] font-black text-sm sm:text-base uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer border border-[#fff9d6]"
            >
              <span>📜 GO TO CERTIFICATE & REWARDS PAGE</span>
              <span className="text-base leading-none">➔</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isDownloading}
              className="w-full py-2 px-4 rounded-lg bg-[#241308]/60 hover:bg-[#241308] border border-[#8c6d23]/50 text-[#e6c265] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isDownloading ? 'Downloading...' : '⬇ Or Download PNG Directly'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

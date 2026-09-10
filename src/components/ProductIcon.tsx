"use client";

import React from 'react';

// Detect whether an icon value is an image URL instead of an emoji.
// Supports: absolute http(s) URLs, root-relative paths (files in /public),
// and data: URIs.
export function isImageUrlIcon(icon: string | undefined | null): boolean {
  if (!icon) return false;
  const value = icon.trim();
  if (!value) return false;
  return (
    /^https?:\/\//i.test(value) ||
    /^data:image\//i.test(value) ||
    (value.startsWith('/') && /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(value))
  );
}

interface ProductIconProps {
  icon: string | undefined | null;
  fallback?: string;
  className?: string;
  imgClassName?: string;
}

// Renders the product logo: an <img> when the stored icon is an image URL,
// otherwise the emoji character itself.
export default function ProductIcon({
  icon,
  fallback = '📦',
  className = '',
  imgClassName = '',
}: ProductIconProps) {
  const value = (icon || '').trim() || fallback;

  if (isImageUrlIcon(value)) {
    return (
      <img
        src={value}
        alt=""
        draggable={false}
        className={`object-contain select-none ${imgClassName || 'w-full h-full'} ${className}`}
      />
    );
  }

  return (
    <span className={`select-none leading-none ${className}`}>
      {value}
    </span>
  );
}

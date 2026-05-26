
import React from 'react';

interface PolyhedronGlyphProps {
  facet: 'law' | 'kid' | 'a11y';
  className?: string;
}

export default function PolyhedronGlyph({ facet, className }: PolyhedronGlyphProps) {
  const styleProps = {
    law: 'stroke-emerald-500 fill-transparent stroke-2',
    kid: 'fill-blue-500 stroke-transparent animate-pulse',
    a11y: 'fill-black stroke-transparent',
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={`transition-all duration-500 ${styleProps[facet]} ${className}`}
      aria-hidden="true"
    >
      <path d="M50 2 L98 25 L98 75 L50 98 L2 75 L2 25 Z M50 2 L50 98 M2 25 L98 75 M2 75 L98 25" />
    </svg>
  );
}

"use client";

import { useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataUrl?: string;
}

export function LazyImage({ src, alt, width, height, blurDataUrl }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      {!loaded && (
        blurDataUrl ? (
          <img
            src={blurDataUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(10px)", transform: "scale(1.05)" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

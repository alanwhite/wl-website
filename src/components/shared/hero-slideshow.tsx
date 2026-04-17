"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSlideshowProps {
  images: string[];
  interval?: number; // ms between transitions, default 8000
  fullScreen?: boolean; // fill entire viewport
  children: React.ReactNode;
}

// Each image gets a different pan direction for variety
const kenBurnsVariants = [
  "animate-kenburns-zoom-in",
  "animate-kenburns-zoom-out",
  "animate-kenburns-pan-left",
  "animate-kenburns-pan-right",
];

export function HeroSlideshow({
  images,
  interval = 8000,
  fullScreen = false,
  children,
}: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1 && images.length > 0) {
      // Single image still gets the Ken Burns effect, no need to advance
      return;
    }
    if (images.length <= 1) return;
    const timer = setInterval(advance, interval);
    return () => clearInterval(timer);
  }, [advance, interval, images.length]);

  const heightClass = fullScreen ? "min-h-screen" : "min-h-[70vh]";

  if (images.length === 0) {
    return (
      <section className={`relative flex ${heightClass} items-center justify-center`}>
        {children}
      </section>
    );
  }

  return (
    <section className={`relative flex ${heightClass} items-center justify-center overflow-hidden`}>
      {/* Background images with Ken Burns effect */}
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: i === currentIndex ? 1 : 0 }}
        >
          <div
            className={`h-full w-full ${kenBurnsVariants[i % kenBurnsVariants.length]}`}
            style={{
              animationDuration: `${interval}ms`,
              animationIterationCount: "infinite",
              animationDirection: "alternate",
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        </div>
      ))}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 text-white">
        {children}
      </div>
    </section>
  );
}

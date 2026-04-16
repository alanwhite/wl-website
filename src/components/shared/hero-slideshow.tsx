"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSlideshowProps {
  images: string[];
  interval?: number; // ms between transitions, default 6000
  children: React.ReactNode;
}

export function HeroSlideshow({
  images,
  interval = 6000,
  children,
}: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(advance, interval);
    return () => clearInterval(timer);
  }, [advance, interval, images.length]);

  if (images.length === 0) {
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center">
        {children}
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      {/* Background images */}
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: i === currentIndex ? 1 : 0 }}
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

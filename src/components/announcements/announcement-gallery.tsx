"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Facebook-style image gallery for announcement posts.
 * Thumbnails crop to fit the layout grid (object-cover); tapping any image
 * opens a lightbox showing the full image (object-contain) so portrait or
 * tall images aren't visually clipped.
 *
 * Layouts:
 * - 1 image: full-width 16:9 hero
 * - 2 images: side-by-side, square each
 * - 3 images: big-left + 2-stacked-right (16:9 container)
 * - 4+: 2x2 grid; if >4, last cell shows a "+N" overlay
 */
export function AnnouncementGallery({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, prev, next]);

  if (images.length === 0) return null;

  const cell = (src: string, i: number, extraClass = "", sizes = "(max-width: 768px) 100vw, 576px") => (
    <button
      key={i}
      type="button"
      onClick={() => setLightboxIndex(i)}
      className={`relative block w-full cursor-zoom-in bg-muted transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${extraClass}`}
      aria-label={`View image ${i + 1} of ${images.length}`}
    >
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" unoptimized />
    </button>
  );

  let grid: React.ReactNode;
  if (images.length === 1) {
    grid = (
      <button
        type="button"
        onClick={() => setLightboxIndex(0)}
        className="relative mx-auto block aspect-video w-full max-w-xl cursor-zoom-in bg-muted transition-opacity hover:opacity-90"
        aria-label="View image"
      >
        <Image
          src={images[0]}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 576px"
          className="object-cover"
          unoptimized
        />
      </button>
    );
  } else if (images.length === 2) {
    grid = (
      <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-0.5">
        {images.map((src, i) => cell(src, i, "aspect-square", "(max-width: 768px) 50vw, 288px"))}
      </div>
    );
  } else if (images.length === 3) {
    grid = (
      <div className="mx-auto grid aspect-video w-full max-w-xl grid-cols-3 grid-rows-2 gap-0.5">
        {cell(images[0], 0, "col-span-2 row-span-2 h-full", "(max-width: 768px) 67vw, 384px")}
        {cell(images[1], 1, "h-full", "(max-width: 768px) 33vw, 192px")}
        {cell(images[2], 2, "h-full", "(max-width: 768px) 33vw, 192px")}
      </div>
    );
  } else {
    const visible = images.slice(0, 4);
    const extras = images.length - 4;
    grid = (
      <div className="mx-auto grid w-full max-w-xl grid-cols-2 grid-rows-2 gap-0.5">
        {visible.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative block aspect-square w-full cursor-zoom-in bg-muted transition-opacity hover:opacity-90"
            aria-label={`View image ${i + 1} of ${images.length}`}
          >
            <Image src={src} alt="" fill sizes="(max-width: 768px) 50vw, 288px" className="object-cover" unoptimized />
            {i === 3 && extras > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
                +{extras}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {grid}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="flex max-h-[95vh] max-w-[min(95vw,1200px)] flex-col gap-0 bg-black/95 p-0 sm:rounded-md">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxIndex !== null && (
            <div className="relative flex min-h-[60vh] items-center justify-center">
              <Image
                src={images[lightboxIndex]}
                alt=""
                width={1600}
                height={1600}
                sizes="(max-width: 1200px) 95vw, 1200px"
                className="h-auto max-h-[90vh] w-auto max-w-full object-contain"
                unoptimized
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                    {lightboxIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import Image from "next/image";

/**
 * Facebook-style image gallery for announcement posts.
 * - 1 image: full-width 16:9 hero
 * - 2 images: side-by-side, 4:3 each
 * - 3 images: one big left, two stacked right (16:9 container)
 * - 4+ images: 2x2 grid; if >4, last cell shows a "+N" overlay
 */
export function AnnouncementGallery({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative mx-auto aspect-video w-full max-w-xl bg-muted">
        <Image
          src={images[0]}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 576px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-0.5">
        {images.map((src, i) => (
          <div key={i} className="relative aspect-square bg-muted">
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 288px"
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="mx-auto grid aspect-video w-full max-w-xl grid-cols-3 grid-rows-2 gap-0.5">
        <div className="relative col-span-2 row-span-2 bg-muted">
          <Image src={images[0]} alt="" fill sizes="(max-width: 768px) 67vw, 384px" className="object-cover" unoptimized />
        </div>
        <div className="relative col-span-1 row-span-1 bg-muted">
          <Image src={images[1]} alt="" fill sizes="(max-width: 768px) 33vw, 192px" className="object-cover" unoptimized />
        </div>
        <div className="relative col-span-1 row-span-1 bg-muted">
          <Image src={images[2]} alt="" fill sizes="(max-width: 768px) 33vw, 192px" className="object-cover" unoptimized />
        </div>
      </div>
    );
  }

  // 4 or more — 2x2 grid, last cell overlays "+N" if extras
  const visible = images.slice(0, 4);
  const extras = images.length - 4;
  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-2 grid-rows-2 gap-0.5">
      {visible.map((src, i) => (
        <div key={i} className="relative aspect-square bg-muted">
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 288px"
            className="object-cover"
            unoptimized
          />
          {i === 3 && extras > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
              +{extras}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

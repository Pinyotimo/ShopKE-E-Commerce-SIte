import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Product photos from `images`, falling back to the single cover photo. */
export const photosOf = (p: { images?: string[] | null; image_url?: string | null }) =>
  (p.images?.filter(Boolean).length ? p.images.filter(Boolean) : p.image_url ? [p.image_url] : []) as string[];

const SWIPE = 60;      // px dragged before it counts as a swipe
const FLICK = 400;     // px/s that counts as a flick even if short

/** Swipeable product gallery: drag/swipe, arrows, dots, thumbnails and arrow keys. */
export default function ProductGallery({ images, alt, className }: { images: string[]; alt: string; className?: string }) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const reduce = useReducedMotion();
  const many = images.length > 1;

  useEffect(() => setState([0, 0]), [images.join('|')]);

  const go = (to: number) => {
    if (!many) return;
    const next = (to + images.length) % images.length;
    setState([next, to > index ? 1 : -1]);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE || info.velocity.x < -FLICK) go(index + 1);
    else if (info.offset.x > SWIPE || info.velocity.x > FLICK) go(index - 1);
  };

  if (!images.length) return <div className={cn('aspect-square rounded-2xl border bg-muted', className)} />;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={many ? 0 : -1}
        role={many ? 'region' : undefined}
        aria-roledescription={many ? 'carousel' : undefined}
        aria-label={many ? `${alt} photos` : undefined}
        onKeyDown={e => { if (e.key === 'ArrowRight') go(index + 1); if (e.key === 'ArrowLeft') go(index - 1); }}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={images[index] + index}
            src={images[index]}
            alt={`${alt}, photo ${index + 1} of ${images.length}`}
            custom={dir}
            variants={{
              enter: (d: number) => (reduce ? { opacity: 0 } : { x: d >= 0 ? '100%' : '-100%', opacity: 1 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => (reduce ? { opacity: 0 } : { x: d >= 0 ? '-100%' : '100%', opacity: 1 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.32, 0.72, 0, 1] }}
            drag={many ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            draggable={false}
            className={cn('absolute inset-0 h-full w-full select-none object-cover', many && 'cursor-grab active:cursor-grabbing touch-pan-y')}
          />
        </AnimatePresence>

        {many && (
          <>
            {(['prev', 'next'] as const).map(side => (
              <button
                key={side}
                type="button"
                aria-label={side === 'prev' ? 'Previous photo' : 'Next photo'}
                onClick={() => go(index + (side === 'prev' ? -1 : 1))}
                className={cn(
                  'absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-md backdrop-blur transition hover:bg-white md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100',
                  side === 'prev' ? 'left-3' : 'right-3',
                )}
              >
                {side === 'prev' ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
              </button>
            ))}
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={cn('h-1.5 rounded-full bg-white shadow transition-all', i === index ? 'w-5' : 'w-1.5 opacity-60 hover:opacity-100')}
                />
              ))}
            </div>
            <span className="absolute right-3 top-3 z-10 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition',
                i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

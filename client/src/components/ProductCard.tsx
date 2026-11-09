import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '../cart';
import { Price } from '../ui';
import Countdown from './Countdown';
import { AddToCartButton } from '@/components/kokonutui/cart-button';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { photosOf } from './ProductGallery';

export default function ProductCard({ p }: { p: any }) {
  const { add, items, setQty } = useCart();
  const inCart = items.find(i => i.id === p.id)?.qty ?? 0;
  const nav = useNavigate();
  const now = p.price_now ?? p.price;
  const off = now < p.price ? Math.round((1 - now / p.price) * 100) : 0;

  const images = photosOf(p);
  const many = images.length > 1;
  const [shown, setShown] = useState(0);
  // Touch swipe state; a swipe must not also open the product.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  // Desktop: the photo follows the mouse across the card. Touch: swipe sideways.
  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (!many || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setShown(Math.min(images.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * images.length))));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false;
    if (many && e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
      swiped.current = true;
      setShown(i => Math.min(images.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
    }
  };

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden border-none bg-card py-0 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-100">
      <Link
        to={`/product/${p.id}`}
        className="relative block aspect-square touch-pan-y overflow-hidden bg-muted"
        onPointerMove={onPointerMove}
        onPointerLeave={e => e.pointerType === 'mouse' && setShown(0)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClickCapture={e => { if (swiped.current) { e.preventDefault(); swiped.current = false; } }}
        draggable={false}
      >
        {/* Photo strip: slides to the photo being shown */}
        <div className="relative h-full w-full">
          <motion.div
            className="flex h-full w-full"
            animate={{ x: `-${shown * 100}%` }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            {images.map((img, i) => (
              <img
                key={img + i}
                src={img}
                alt={i === 0 ? p.name : ''}
                loading="lazy"
                draggable={false}
                className="h-full w-full shrink-0 select-none object-cover"
              />
            ))}
          </motion.div>

          {many && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1">
              {images.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${i === shown ? 'w-4' : 'w-1.5 opacity-60'}`} />
              ))}
            </div>
          )}

          {/* Overlay Gradient for better badge contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        {off > 0 && <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-lg z-10">- {off}%</span>}
        {p.stock < 1 && <span className="absolute left-3 top-3 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm z-10">Sold out</span>}
        {p.stock > 0 && p.stock <= 5 && <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-lg z-10">Only {p.stock} left</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{p.category}</span>
        </div>
        <Link to={`/product/${p.id}`} className="text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-emerald-700">{p.name}</Link>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground group-hover:text-muted-foreground">
          {p.description || 'Premium quality product selected for the best shopping experience.'}
        </p>
        {off > 0 && p.sale_ends_at && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 w-fit px-2 py-0.5 rounded-md">
            <Timer className="h-3 w-3" />
            <span>Ends <Countdown to={p.sale_ends_at} /></span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3 border-t border-border/60">
          <Price now={now} was={p.price} className="text-xl font-black" />
          {p.stock < 1 ? (
            <Button size="icon" className="h-9 w-9 rounded-full" disabled aria-label="Sold out"><ShoppingCart className="h-4 w-4" /></Button>
          ) : (
            // "Add +" opens into a − n + stepper that stays in sync with the cart.
            <AddToCartButton
              name={p.name}
              quantity={inCart}
              max={Math.max(inCart, p.stock ?? 20)}
              onQuantityChange={n => {
                if (inCart === 0) {
                  add(p, n);
                  toast.success(`${p.name} added`, { action: { label: 'View cart', onClick: () => nav('/cart') } });
                } else setQty(p.id, n);
              }}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
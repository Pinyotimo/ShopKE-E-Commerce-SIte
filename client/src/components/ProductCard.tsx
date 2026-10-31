import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '../cart';
import { Price } from '../ui';
import Countdown from './Countdown';

export default function ProductCard({ p }: { p: any }) {
  const { add } = useCart();
  const nav = useNavigate();
  const now = p.price_now ?? p.price;
  const off = now < p.price ? Math.round((1 - now / p.price) * 100) : 0;
  return (
    <Card className="group gap-0 overflow-hidden py-0 transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/product/${p.id}`} className="relative block aspect-square overflow-hidden bg-muted">
        <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {off > 0 && <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">-{off}%</span>}
        {p.stock < 1 && <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>}
        {p.stock > 0 && p.stock <= 5 && <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">Only {p.stock} left</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{p.category}</span>
        <Link to={`/product/${p.id}`} className="font-semibold leading-snug hover:underline">{p.name}</Link>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
        {off > 0 && p.sale_ends_at && <p className="flex items-center gap-1 text-xs font-medium text-rose-600"><Timer className="h-3.5 w-3.5" />Ends <Countdown to={p.sale_ends_at} /></p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price now={now} was={p.price} className="text-lg" />
          <Button size="icon" disabled={p.stock < 1} aria-label="Add to cart"
            onClick={() => { add(p); toast.success(`${p.name} added`, { action: { label: 'View cart', onClick: () => nav('/cart') } }); }}>
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
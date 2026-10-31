import { useEffect, useState } from 'react';
import { Tag, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '../api';
import Countdown from '../components/Countdown';
import ProductCard from '../components/ProductCard';
import { Empty, Page } from '../ui';

export default function Deals() {
  const [ps, setPs] = useState<any[] | null>(null);
  useEffect(() => { api('/products?sale=1').then(setPs).catch(() => setPs([])); }, []);
  const ends = (ps || []).filter(p => p.sale_ends_at).map(p => +new Date(p.sale_ends_at)).sort((a, b) => a - b)[0];
  return (
    <Page>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-rose-600 to-orange-500 p-6 text-white md:p-8">
        <Zap className="h-8 w-8 fill-white" />
        <div><h1 className="text-3xl font-extrabold tracking-tight">Deals & flash sales</h1><p className="text-white/90">Limited-time prices and ongoing discounts.</p></div>
        {ends && <span className="ml-auto rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">Next ends in <Countdown to={new Date(ends).toISOString()} /></span>}
      </div>
      {ps === null ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        : !ps.length ? <Empty icon={Tag} title="No deals right now">Check back soon.</Empty>
        : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">{ps.map(p => <ProductCard key={p.id} p={p} />)}</div>}
    </Page>
  );
}
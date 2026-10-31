import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { api } from '../api';
import Countdown from './Countdown';
import ProductCard from './ProductCard';

export default function FlashSale() {
  const [ps, setPs] = useState<any[]>([]);
  useEffect(() => { api('/flash-sales').then(setPs).catch(() => {}); }, []);
  if (!ps.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight"><Zap className="h-7 w-7 fill-rose-500 text-rose-500" />Flash sale</h2>
        <span className="rounded-full bg-rose-600 px-3 py-1 text-sm font-bold text-white">Ends in <Countdown to={ps[0].sale_ends_at} /></span>
        <Link to="/deals" className="ml-auto flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">All deals<ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {ps.map(p => <div key={p.id} className="w-56 shrink-0 snap-start"><ProductCard p={p} /></div>)}
      </div>
    </section>
  );
}
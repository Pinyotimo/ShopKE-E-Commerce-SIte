import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '../api';

export default function CategoryGrid({ limit }: { limit?: number }) {
  const [cs, setCs] = useState<any[] | null>(null);
  useEffect(() => { api('/categories').then(setCs).catch(() => setCs([])); }, []);
  if (cs === null) return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}</div>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
      {cs.slice(0, limit).map(c => (
        <Link key={c.name} to={`/shop?category=${encodeURIComponent(c.name)}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white"><p className="text-lg font-bold">{c.name}</p><p className="text-xs text-white/80">{c.n} product{c.n === 1 ? '' : 's'}</p></div>
        </Link>
      ))}
    </div>
  );
}
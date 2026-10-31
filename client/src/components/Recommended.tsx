import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import ProductCard from './ProductCard';

export default function Recommended() {
  const { user } = useAuth();
  const [ps, setPs] = useState<any[]>([]);
  useEffect(() => { api('/recommendations').then(setPs).catch(() => {}); }, [user?.id]);
  if (!ps.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <h2 className="mb-1 text-3xl font-extrabold tracking-tight">{user ? 'Picked for you' : 'Popular right now'}</h2>
      <p className="mb-5 text-sm text-muted-foreground">{user ? 'Based on what you have bought before.' : 'Log in for picks based on your orders.'}</p>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">{ps.slice(0, 4).map(p => <ProductCard key={p.id} p={p} />)}</div>
    </section>
  );
}
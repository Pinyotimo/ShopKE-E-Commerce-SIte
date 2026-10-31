import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { Empty, Page, Title } from '../ui';

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const search = sp.get('search') || '', cat = sp.get('category') || '', sale = sp.get('sale') || '';
  const [ps, setPs] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [sort, setSort] = useState('new');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };

  useEffect(() => { api('/categories').then(a => setCats(a.map((c: any) => c.name))).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => api(`/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(cat)}&sale=${sale}`)
      .then(d => { setPs(d); setErr(''); }).catch(e => setErr(e.message)).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [search, cat, sale]);

  const list = useMemo(() => [...ps].sort((a, b) => sort === 'low' ? a.price_now - b.price_now : sort === 'high' ? b.price_now - a.price_now : b.id - a.id), [ps, sort]);
  return (
    <Page>
      <Title>{cat || 'Shop'}</Title>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products…" value={search} onChange={e => set('search', e.target.value)} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
        </select>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" className="rounded-full" variant={!cat && !sale ? 'default' : 'outline'} onClick={() => { set('category', ''); set('sale', ''); }}>All</Button>
        <Button size="sm" className="rounded-full" variant={sale ? 'default' : 'outline'} onClick={() => set('sale', sale ? '' : '1')}>On sale</Button>
        {cats.map(c => <Button key={c} size="sm" className="rounded-full" variant={cat === c ? 'default' : 'outline'} onClick={() => set('category', cat === c ? '' : c)}>{c}</Button>)}
      </div>
      {err && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      {loading && !ps.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        : !list.length ? <Empty icon={PackageSearch} title="No products found">Try a different search or category.</Empty>
        : <div className={`grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-5 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>{list.map(p => <ProductCard key={p.id} p={p} />)}</div>}
    </Page>
  );
}
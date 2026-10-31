import { useEffect, useMemo, useState } from 'react';
import { PackageSearch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { Empty, Page, Title } from '../ui';

export default function Shop() {
  const [ps, setPs] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('new');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => { api('/products').then(a => setCats([...new Set<string>(a.map((p: any) => p.category))])).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => api(`/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(cat)}`)
      .then(d => { setPs(d); setErr(''); }).catch(e => setErr(e.message)).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [search, cat]);

  const list = useMemo(() => [...ps].sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : b.id - a.id), [ps, sort]);

  return (
    <Page>
      <Title>Shop</Title>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Newest</SelectItem><SelectItem value="low">Price: low to high</SelectItem><SelectItem value="high">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Button size="sm" className="rounded-full" variant={!cat ? 'default' : 'outline'} onClick={() => setCat('')}>All</Button>
        {cats.map(c => <Button key={c} size="sm" className="rounded-full" variant={cat === c ? 'default' : 'outline'} onClick={() => setCat(c)}>{c}</Button>)}
      </div>
      {err && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      {loading && !ps.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        : !list.length ? <Empty icon={PackageSearch} title="No products found">Try a different search or category.</Empty>
        : <div className={`grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-5 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            {list.map(p => <ProductCard key={p.id} p={p} />)}
          </div>}
    </Page>
  );
}
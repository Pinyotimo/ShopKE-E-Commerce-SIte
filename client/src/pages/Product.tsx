import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Minus, PackageX, Plus, RotateCcw, ShoppingCart, Smartphone, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, kes } from '../api';
import { useCart } from '../cart';
import ProductCard from '../components/ProductCard';
import { Empty, Page } from '../ui';

export default function Product() {
  const { id } = useParams();
  const { add } = useCart();
  const nav = useNavigate();
  const [p, setP] = useState<any>(null);
  const [rel, setRel] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setP(null); setErr(''); setQty(1); window.scrollTo(0, 0);
    api('/products/' + id)
      .then(x => { setP(x); return api('/products?category=' + encodeURIComponent(x.category)); })
      .then(r => setRel(r.filter((x: any) => x.id !== +id!).slice(0, 4)))
      .catch(e => setErr(e.message));
  }, [id]);

  if (err) return <Page><Empty icon={PackageX} title="Product not found"><Button asChild className="mt-2"><Link to="/shop">Back to shop</Link></Button></Empty></Page>;
  if (!p) return <Page><div className="grid gap-8 md:grid-cols-2"><Skeleton className="aspect-square rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></Page>;

  const out = p.stock < 1;
  const addNow = () => { add(p, qty); toast.success(`${qty} × ${p.name} added`); };
  return (
    <Page>
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/shop" className="hover:underline">Shop</Link><ChevronRight className="h-3.5 w-3.5" /><span>{p.category}</span><ChevronRight className="h-3.5 w-3.5" /><span className="truncate text-foreground">{p.name}</span>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="aspect-square overflow-hidden rounded-2xl border bg-muted">
          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{p.category}</span>
          <h1 className="text-3xl font-extrabold tracking-tight">{p.name}</h1>
          <p className="text-3xl font-extrabold">{kes(p.price)}</p>
          <p className={`text-sm font-medium ${out ? 'text-rose-600' : p.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {out ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left` : 'In stock'}
          </p>
          <p className="text-muted-foreground">{p.description || 'No description yet.'}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center rounded-lg border">
              <Button variant="ghost" size="icon" disabled={qty <= 1} onClick={() => setQty(q => q - 1)}><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <Button variant="ghost" size="icon" disabled={qty >= p.stock} onClick={() => setQty(q => q + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button size="lg" disabled={out} onClick={addNow}><ShoppingCart className="mr-2 h-4 w-4" />Add to cart</Button>
            <Button size="lg" variant="outline" disabled={out} onClick={() => { add(p, qty); nav('/checkout'); }}>Buy now</Button>
          </div>
          <ul className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" />Pay securely with M-Pesa</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" />Delivery priced by distance, free over KES 5,000</li>
            <li className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-emerald-600" />7-day refunds</li>
          </ul>
        </motion.div>
      </div>
      {rel.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-extrabold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">{rel.map(r => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </Page>
  );
}
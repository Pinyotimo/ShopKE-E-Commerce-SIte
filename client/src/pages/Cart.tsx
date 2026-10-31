import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { kes } from '../api';
import { useCart } from '../cart';
import { Empty, Page, Title } from '../ui';

export default function Cart() {
  const { items, setQty, subtotal } = useCart();
  if (!items.length) return <Page><Empty icon={ShoppingCart} title="Your cart is empty"><Button asChild className="mt-2"><Link to="/shop">Start shopping</Link></Button></Empty></Page>;
  return (
    <Page>
      <Title>Your cart</Title>
      <div className="grid items-start gap-5 md:grid-cols-[1fr_320px]">
        <Card className="gap-0 divide-y py-0">
          {items.map(i => (
            <div key={i.id} className="flex items-center gap-4 p-4">
              <Link to={`/product/${i.id}`}><img src={i.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-muted object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${i.id}`} className="block truncate font-semibold hover:underline">{i.name}</Link>
                <p className="text-sm text-muted-foreground">{kes(i.price)} each</p>
                <div className="mt-2 inline-flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.id, i.qty - 1)}><Minus className="h-3.5 w-3.5" /></Button>
                  <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(i.id, i.qty + 1)}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{kes(i.price * i.qty)}</p>
                <Button variant="ghost" size="icon" className="mt-1 text-rose-600 hover:text-rose-700" onClick={() => setQty(i.id, 0)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </Card>
        <Card className="sticky top-20 gap-3 p-5">
          <h2 className="font-bold">Order summary</h2>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{kes(subtotal)}</span></div>
          <p className="text-xs text-muted-foreground">Delivery is quoted at checkout from your location.</p>
          <Button asChild><Link to="/checkout">Checkout</Link></Button>
          <Link to="/shop" className="text-center text-sm text-muted-foreground hover:underline">Continue shopping</Link>
        </Card>
      </div>
    </Page>
  );
}
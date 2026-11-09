import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { kes } from '../api';
import { useCart } from '../cart';
import { Empty, Page, Title } from '../ui';
import SmoothDrawer from '@/components/kokonutui/smooth-drawer';
import { AddToCartButton } from '@/components/kokonutui/cart-button';

// Items saved before stock was tracked fall back to this limit; the server still checks real stock.
const FALLBACK_MAX = 20;

export default function Cart() {
  const { items, setQty, subtotal } = useCart();
  const nav = useNavigate();
  const count = items.reduce((a, i) => a + i.qty, 0);
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
                {/* − n + stepper; − becomes a bin at 1 and removes the line. */}
                <AddToCartButton
                  className="mt-2"
                  name={i.name}
                  quantity={i.qty}
                  max={Math.max(i.qty, i.stock ?? FALLBACK_MAX)}
                  onQuantityChange={n => setQty(i.id, n)}
                />
              </div>
              <div className="text-right">
                <p className="font-bold">{kes(i.price * i.qty)}</p>
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

      {/* Mobile: sticky bar above the bottom nav that opens a review sheet. */}
      <div className="h-20 md:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Subtotal · {count} item{count === 1 ? '' : 's'}</p>
            <p className="text-lg font-extrabold leading-tight">{kes(subtotal)}</p>
          </div>
          <SmoothDrawer
            title="Your cart"
            description={`${count} item${count === 1 ? '' : 's'} · Delivery quoted at checkout`}
            triggerLabel="Review & checkout"
            triggerClassName="h-11 border-0 bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            confirmLabel="Continue to checkout"
            currency="KES"
            locale="en-KE"
            taxRate={0}
            showDelivery={false}
            deliveryNote="Quoted at checkout"
            paymentLabel="M-Pesa, card or Paystack at checkout"
            items={items.map(i => ({ id: String(i.id), name: i.name, price: i.price, quantity: i.qty, image: i.image_url, detail: i.was && i.was > i.price ? `Was ${kes(i.was)}` : `${kes(i.price)} each` }))}
            onConfirm={() => nav('/checkout')}
          />
        </div>
      </div>
    </Page>
  );
}
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, kes } from '../api';
import { useCart } from '../cart';
import { PayMethods } from '../components/PayPanel';
import { Empty, Page, Title } from '../ui';
import SlideToConfirm from '@/components/kokonutui/slide-to-confirm';
import DeliveryLocationPicker, { type Pos } from '../components/DeliveryLocationPicker';

export default function Checkout() {
  const { items, subtotal } = useCart();
  const nav = useNavigate();
  const [pos, setPos] = useState<Pos | null>(null);
  const [q, setQ] = useState<any>(null);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!items.length) return;
    api('/checkout/quote', { method: 'POST', body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), lat: pos?.[0], lng: pos?.[1], coupon: applied } })
      .then(d => { setQ(d); setErr(''); }).catch(e => { setQ(null); setErr(e.message); });
  }, [pos, applied, items]);

  if (!items.length) return <Page><Empty icon={ShoppingCart} title="Your cart is empty"><Button asChild className="mt-2"><Link to="/shop">Shop</Link></Button></Empty></Page>;

  const dOk = q?.delivery?.ok;

  // Driven by the slider: it throws on any problem so the thumb springs back.
  async function place() {
    setErr('');
    const fail = (m: string) => { setErr(m); throw new Error(m); };
    if (!pos || !dOk) fail('Pick a delivery location inside our delivery area');
    if (q.couponError) fail(q.couponError);
    try {
      const o = await api('/orders', { method: 'POST', body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), address, lat: pos![0], lng: pos![1], phone, coupon: applied } });
      // Let the green "Order placed" state show for a moment, then go and pay.
      setTimeout(() => nav('/order/' + o.id, { state: { autoPay: method } }), 700);
    } catch (e: any) { fail(e.message); }
  }

  return (
    <Page>
      <Title>Checkout</Title>
      <div className="grid items-start gap-5 md:grid-cols-[1fr_380px]">
        <Card className="gap-4 p-5">
          <div>
            <h2 className="font-bold">1. Delivery location</h2>
            <p className="text-sm text-muted-foreground">Drag the map so the pin sits on your gate or building, then tap Deliver here.</p>
          </div>
          <DeliveryLocationPicker
            value={pos}
            onChange={(p, label) => { setPos(p); if (p && label && !address.trim()) setAddress(label); }}
            delivery={pos ? q?.delivery : null}
            formatMoney={kes}
          />
          <div className="space-y-1.5"><Label>Building / street / landmark</Label><Input placeholder="e.g. Yaya Centre, Argwings Kodhek Rd" value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone (for M-Pesa and delivery)</Label><Input inputMode="tel" placeholder="07XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <h2 className="pt-2 font-bold">2. Payment method</h2>
          <PayMethods value={method} onChange={setMethod} />
          <p className="text-xs text-muted-foreground">You pay on the next screen, after the order is created.</p>
        </Card>

        <Card className="gap-3 p-5 md:sticky md:top-20">
          <h2 className="font-bold">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            {items.map(i => <div key={i.id} className="flex justify-between gap-3"><span className="text-muted-foreground">{i.name} × {i.qty}</span><span>{kes(i.price * i.qty)}</span></div>)}
          </div>
          <div className="flex gap-2 border-t pt-3">
            <div className="relative flex-1"><Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 uppercase" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value)} /></div>
            <Button variant="outline" onClick={() => setApplied(code.trim().toUpperCase())}>Apply</Button>
          </div>
          {applied && q?.couponError && <p className="text-xs text-rose-600">{q.couponError}</p>}
          {q?.coupon && <p className="text-xs font-semibold text-emerald-700">Coupon {q.coupon} applied</p>}
          <div className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{kes(q?.subtotal ?? subtotal)}</span></div>
            {!!q?.discount && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{kes(q.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery {dOk && `(${q.delivery.distanceKm} km)`}</span>
              <span className={dOk && !q.delivery.fee ? 'font-semibold text-emerald-600' : ''}>{dOk ? (q.delivery.fee ? kes(q.delivery.fee) : 'FREE') : '—'}</span></div>
            {q?.delivery && !dOk && <p className="text-xs text-rose-600">{q.delivery.error}</p>}
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><span>Total</span><span>{q?.total != null ? kes(q.total) : '—'}</span></div>
          {err && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          <SlideToConfirm
            label={q?.total != null ? `Slide to order · ${kes(q.total)}` : 'Slide to place order'}
            confirmingLabel="Placing order"
            doneLabel="Order placed"
            onConfirm={place}
            resetAfter={null}
            disabled={!pos || !dOk || q?.total == null}
            className="max-w-none"
          />
          {(!pos || !dOk) && <p className="-mt-1 text-center text-xs text-muted-foreground">Pick a delivery location to continue</p>}
        </Card>
      </div>
    </Page>
  );
}
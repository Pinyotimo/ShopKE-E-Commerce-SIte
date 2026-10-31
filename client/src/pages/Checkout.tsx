import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, ShoppingCart, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, kes } from '../api';
import { useCart } from '../cart';
import { PayMethods } from '../components/PayPanel';
import { useTheme } from '../theme';
import { Empty, Page, Spinner, Title } from '../ui';

type Pos = [number, number];
function Picker({ pos, onPick }: { pos: Pos | null; onPick: (p: Pos) => void }) {
  const map = useMap();
  const { brand } = useTheme();
  useMapEvents({ click: e => onPick([e.latlng.lat, e.latlng.lng]) });
  useEffect(() => { if (pos) map.flyTo(pos, Math.max(map.getZoom(), 15)); }, [pos]);
  return pos ? <CircleMarker center={pos} radius={10} pathOptions={{ color: brand, fillColor: brand, fillOpacity: 0.8 }} /> : null;
}

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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    api('/checkout/quote', { method: 'POST', body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), lat: pos?.[0], lng: pos?.[1], coupon: applied } })
      .then(d => { setQ(d); setErr(''); }).catch(e => { setQ(null); setErr(e.message); });
  }, [pos, applied, items]);

  if (!items.length) return <Page><Empty icon={ShoppingCart} title="Your cart is empty"><Button asChild className="mt-2"><Link to="/shop">Shop</Link></Button></Empty></Page>;

  const locate = () => navigator.geolocation.getCurrentPosition(
    p => setPos([p.coords.latitude, p.coords.longitude]), () => toast.error('Location denied: tap the map instead'));
  const dOk = q?.delivery?.ok;

  async function place() {
    setErr('');
    if (!pos || !dOk) return setErr('Pick a delivery location inside our delivery area');
    if (q.couponError) return setErr(q.couponError);
    setBusy(true);
    try {
      const o = await api('/orders', { method: 'POST', body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), address, lat: pos[0], lng: pos[1], phone, coupon: applied } });
      nav('/order/' + o.id, { state: { autoPay: method } });
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Page>
      <Title>Checkout</Title>
      <div className="grid items-start gap-5 md:grid-cols-[1fr_380px]">
        <Card className="gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">1. Delivery location</h2>
            <Button variant="outline" size="sm" onClick={locate}><Crosshair className="mr-1.5 h-4 w-4" />Use my location</Button>
          </div>
          <MapContainer center={[-1.2921, 36.8219]} zoom={12} className="z-0 h-72 rounded-xl border">
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Picker pos={pos} onPick={setPos} />
          </MapContainer>
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
          <Button size="lg" disabled={busy} onClick={place}>{busy ? <Spinner /> : 'Place order & continue'}</Button>
        </Card>
      </div>
    </Page>
  );
}
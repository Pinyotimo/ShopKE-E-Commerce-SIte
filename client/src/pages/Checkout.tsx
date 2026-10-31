import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, kes } from '../api';
import { useCart } from '../cart';
import { Empty, Page, Spinner, Title } from '../ui';

type Pos = [number, number];
function Picker({ pos, onPick }: { pos: Pos | null; onPick: (p: Pos) => void }) {
  const map = useMap();
  useMapEvents({ click: e => onPick([e.latlng.lat, e.latlng.lng]) });
  useEffect(() => { if (pos) map.flyTo(pos, Math.max(map.getZoom(), 15)); }, [pos]);
  return pos ? <CircleMarker center={pos} radius={10} pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.8 }} /> : null;
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [pos, setPos] = useState<Pos | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [state, setState] = useState<'form' | 'paying' | 'failed'>('form');
  const orderId = useRef<number | null>(null);
  const timer = useRef<any>();
  
  useEffect(() => () => clearInterval(timer.current), []);

  useEffect(() => {
    if (!pos) return;
    setErr('');
    api('/delivery/quote', { method: 'POST', body: { lat: pos[0], lng: pos[1], subtotal } })
      .then(setQuote).catch(e => { setQuote(null); setErr(e.message); });
  }, [pos, subtotal]);

  if (!items.length) return <Page><Empty icon={ShoppingCart} title="Your cart is empty"><Button asChild className="mt-2"><Link to="/shop">Shop</Link></Button></Empty></Page>;

  const locate = () => navigator.geolocation.getCurrentPosition(
    p => setPos([p.coords.latitude, p.coords.longitude]), () => toast.error('Location denied: tap the map instead'));

  async function pay(id: number) {
    setState('paying'); setErr('');
    try { await api('/payments/mpesa', { method: 'POST', body: { orderId: id } }); }
    catch (e: any) { setErr(e.message); return setState('failed'); }
    
    const t0 = Date.now();
    timer.current = setInterval(async () => {
      const o = await api('/orders/' + id).catch(() => null);
      if (o?.status === 'paid') { clearInterval(timer.current); clear(); toast.success('Payment received'); nav('/orders'); }
      else if (Date.now() - t0 > 90_000) { clearInterval(timer.current); setErr('Payment not confirmed'); setState('failed'); }
    }, 3000);
  }

  async function place() {
    setErr('');
    if (!pos || !quote?.ok) return setErr('Pick a delivery location first');
    try {
      const o = await api('/orders', { method: 'POST', body: { items: items.map(i => ({ productId: i.id, qty: i.qty })), address, lat: pos[0], lng: pos[1], phone } });
      orderId.current = o.id;
      pay(o.id);
    } catch (e: any) { setErr(e.message); }
  }

  const busy = state === 'paying';
  
  return (
    <Page>
      <Title>Checkout</Title>
      <div className="grid items-start gap-5 md:grid-cols-[1fr_360px]">
        <Card className="gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">1. Delivery location</h2>
            <Button variant="outline" size="sm" onClick={locate} disabled={busy}><Crosshair className="mr-1.5 h-4 w-4" />Use my location</Button>
          </div>
          <MapContainer center={[-1.2921, 36.8219]} zoom={12} className="z-0 h-72 rounded-xl border">
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Picker pos={pos} onPick={setPos} />
          </MapContainer>
          <p className="text-xs text-muted-foreground">Tap the map to drop a pin.</p>
          <div className="space-y-1.5">
            <Label>Building / street / landmark</Label>
            <Input placeholder="e.g. Yaya Centre, Argwings Kodhek Rd" value={address} onChange={e => setAddress(e.target.value)} disabled={busy} />
          </div>
          <h2 className="pt-2 font-bold">2. Payment</h2>
          <div className="space-y-1.5">
            <Label>M-Pesa phone</Label>
            <Input inputMode="tel" placeholder="07XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} />
          </div>
        </Card>

        <Card className="sticky top-20 gap-3 p-5">
          <h2 className="font-bold">Order summary</h2>
          <div className="space-y-1.5 text-sm">
            {items.map(i => (
              <div key={i.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{i.name} × {i.qty}</span>
                <span>{kes(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{kes(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery {quote?.ok && `(${quote.distanceKm} km)`}</span>
              <span className={quote?.ok && !quote.fee ? 'font-semibold text-emerald-600' : ''}>{quote?.ok ? (quote.fee ? kes(quote.fee) : 'FREE') : '—'}</span></div>
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><span>Total</span><span>{quote?.ok ? kes(subtotal + quote.fee) : '—'}</span></div>
          {err && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
          {state === 'form' && <Button size="lg" onClick={place}>Place order &amp; pay with M-Pesa</Button>}
          {busy && <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800"><Spinner />Check your phone and enter your M-Pesa PIN…</div>}
          {state === 'failed' && orderId.current && <Button size="lg" className="bg-amber-500 hover:bg-amber-600" onClick={() => pay(orderId.current!)}>Retry payment</Button>}
        </Card>
      </div>
    </Page>
  );
}
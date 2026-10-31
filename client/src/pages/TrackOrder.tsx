import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, kes } from '../api';
import { Events, Stepper } from '../components/Timeline';
import { Page, Spinner, Status, Title } from '../ui';

export default function TrackOrder() {
  const [sp] = useSearchParams();
  const [id, setId] = useState(sp.get('order') || '');
  const [phone, setPhone] = useState('');
  const [o, setO] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setO(null);
    try { setO(await api('/track', { method: 'POST', body: { orderId: id, phone } })); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <Page>
      <Title>Track an order</Title>
      <form onSubmit={go} className="mb-6 grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input placeholder="Order number" inputMode="numeric" value={id} onChange={e => setId(e.target.value)} />
        <Input placeholder="Phone used at checkout" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        <Button disabled={busy || !id || !phone}>{busy ? <Spinner /> : <><Search className="mr-1.5 h-4 w-4" />Track</>}</Button>
      </form>
      {err && <p className="max-w-2xl rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      {o && (
        <Card className="max-w-2xl gap-0 p-5">
          <div className="flex items-center justify-between"><b>Order #{o.id}</b><Status s={o.status} /></div>
          <Stepper s={o.status} />
          <Events events={o.events} />
          <ul className="mt-4 space-y-1 border-t pt-3 text-sm text-muted-foreground">{o.items?.map((i: any, k: number) => <li key={k}>{i.name} × {i.qty}</li>)}</ul>
          <p className="mt-2 text-sm font-semibold">{kes(o.total)}</p>
        </Card>
      )}
    </Page>
  );
}
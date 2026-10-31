import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { api, kes } from '../api';
import { Empty, Page, Status, Title } from '../ui';

const STEPS = [['paid', CreditCard], ['packed', Package], ['out_for_delivery', Truck], ['delivered', CheckCircle2]] as const;

function Track({ s }: { s: string }) {
  const i = STEPS.findIndex(x => x[0] === s);
  if (i < 0) return null;
  return (
    <div className="my-4 flex items-center">
      {STEPS.map(([k, I], n) => (
        <div key={k} className="flex flex-1 items-center last:flex-none">
          <div className={cn('grid h-8 w-8 place-items-center rounded-full border-2 transition', n <= i ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted text-muted-foreground')}><I className="h-4 w-4" /></div>
          {n < 3 && <div className={cn('mx-1 h-0.5 flex-1', n < i ? 'bg-emerald-600' : 'bg-muted')} />}
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [os, setOs] = useState<any[] | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api('/orders').then(setOs).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  async function submit() {
    setBusy(true);
    try { await api('/refunds', { method: 'POST', body: { orderId: target, reason } }); toast.success('Refund requested'); setTarget(null); setReason(''); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  const canRefund = (o: any) => ['paid', 'packed', 'out_for_delivery', 'delivered'].includes(o.status)
    && (!o.refund_status || ['rejected', 'failed'].includes(o.refund_status))
    && Date.now() - +new Date(o.created_at) < 7 * 864e5;

  return (
    <Page>
      <Title>My orders</Title>
      {os === null ? <Skeleton className="h-40 rounded-2xl" />
        : !os.length ? <Empty icon={Package} title="No orders yet"><Button asChild className="mt-2"><Link to="/shop">Start shopping</Link></Button></Empty>
        : <div className="space-y-4">
          {os.map((o, k) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }}>
              <Card className="gap-0 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><b>Order #{o.id}</b><span className="ml-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  <div className="flex items-center gap-2">
                    <Link to={`/order/${o.id}`} className="text-sm font-semibold text-emerald-700 hover:underline">{o.status === 'pending' ? 'Pay now' : 'Track'}</Link>
                    <Status s={o.status} />
                  </div>
                </div>
                <Track s={o.status} />
                <ul className="mb-3 space-y-1 text-sm text-muted-foreground">{o.items?.map((i: any, n: number) => <li key={n} className="flex justify-between"><span>{i.name} × {i.qty}</span><span>{kes(i.price * i.qty)}</span></li>)}</ul>
                <div className="flex flex-wrap items-end justify-between gap-2 border-t pt-3 text-sm">
                  <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" />{o.address}</p>
                  <p className="font-bold">{kes(o.total)} <span className="font-normal text-muted-foreground">incl. {kes(o.delivery_fee)} delivery</span></p>
                </div>
                {(o.refund_status || canRefund(o)) && (
                  <div className="mt-3 flex items-center gap-3">
                    {o.refund_status && <span className="flex items-center gap-2 text-sm text-muted-foreground">Refund: <Status s={o.refund_status} /></span>}
                    {canRefund(o) && <Button variant="outline" size="sm" onClick={() => setTarget(o.id)}>Request refund</Button>}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>}
      <Dialog open={target !== null} onOpenChange={o => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request refund</DialogTitle><DialogDescription>Order #{target}. The owner reviews requests; approved refunds return to your M-Pesa.</DialogDescription></DialogHeader>
          <Textarea placeholder="What went wrong?" value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter><Button disabled={!reason.trim() || busy} onClick={submit}>Submit request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
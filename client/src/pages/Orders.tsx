import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, CreditCard, MapPin, Package, Truck, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api, kes } from '../api';
import { Empty, Page, Spinner, Status, Title } from '../ui';

const STEPS = [['paid', CreditCard], ['packed', Package], ['out_for_delivery', Truck], ['delivered', CheckCircle2]] as const;

function Track({ s }: { s: string }) {
  const i = STEPS.findIndex(x => x[0] === s);
  if (i < 0) return null;
  return (
    <div className="my-6 flex items-center">
      {STEPS.map(([k, I], n) => (
        <div key={k} className="flex flex-1 items-center last:flex-none">
          <div className="relative flex flex-col items-center">
            <div className={cn(
              'grid h-9 w-9 place-items-center rounded-full border-2 transition-all duration-500',
              n <= i ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110' : 'border-muted text-muted-foreground bg-background'
            )}>
              <I className="h-4 w-4" />
            </div>
            <span className={cn(
              "absolute -bottom-5 text-[10px] font-bold uppercase tracking-tighter transition-colors",
              n <= i ? "text-emerald-700" : "text-muted-foreground/50"
            )}>
              {k.replace(/_/g, ' ')}
            </span>
          </div>
          {n < 3 && (
            <div className="relative mx-2 h-1 flex-1 bg-muted rounded-full overflow-hidden">
              {n < i && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-full bg-emerald-600"
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [os, setOs] = useState<any[] | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/orders').then(setOs).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  async function submit() {
    setBusy(true);
    try {
      await api('/refunds', { method: 'POST', body: { orderId: target, reason: `${category}: ${reason}` } });
      toast.success('Refund requested', { description: 'Our team will review it and notify you shortly.' });
      setTarget(null); setReason(''); setCategory(''); load();
    }
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
        : <div className="space-y-6">
          {os.map((o, k) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }}>
              <Card className="group relative gap-0 overflow-hidden border-none bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <b className="text-lg">Order #{o.id}</b>
                      <span className="ml-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link to={`/order/${o.id}`} className="text-sm font-bold text-emerald-700 hover:underline">{o.status === 'pending' ? 'Pay now' : 'Details'}</Link>
                    <Status s={o.status} />
                  </div>
                </div>
                <Track s={o.status} />
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {o.items?.map((i: any, n: number) => (
                      <li key={n} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{i.name} × {i.qty}</span>
                        <span className="font-medium text-foreground">{kes(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col items-end justify-end gap-1 border-l pl-6">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{o.address}</p>
                    <p className="text-xl font-black text-foreground">{kes(o.total)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Incl. {kes(o.delivery_fee)} delivery</p>
                  </div>
                </div>
                {(o.refund_status || canRefund(o)) && (
                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="flex items-center gap-3">
                      {o.refund_status && (
                        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          <RotateCcw className="h-3 w-3" /> Refund: <Status s={o.refund_status} />
                        </div>
                      )}
                    </div>
                    {canRefund(o) && (
                      <Button variant="outline" size="sm" className="rounded-full gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all" onClick={() => setTarget(o.id)}>
                        <RotateCcw className="h-3 w-3" /> Request refund
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>}
      <Dialog open={target !== null} onOpenChange={o => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-2xl">Request a Refund</DialogTitle>
            <DialogDescription className="text-center">
              Order #{target}. We're sorry something went wrong. Our team reviews all requests; approved refunds are sent directly to your M-Pesa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Reason for return</Label>
              <Select onValueChange={setCategory}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Item arrived damaged</SelectItem>
                  <SelectItem value="wrong">Received wrong item</SelectItem>
                  <SelectItem value="quality">Quality not as expected</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Additional details</Label>
              <Textarea
                placeholder="Please describe the issue in detail..."
                className="min-h-[120px] focus-visible:ring-emerald-500"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>Cancel</Button>
            <Button disabled={!reason.trim() || !category || busy} onClick={submit} className="px-8">
              {busy ? <Spinner /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
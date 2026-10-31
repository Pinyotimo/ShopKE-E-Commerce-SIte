import { useEffect, useRef, useState } from 'react';
import { CreditCard, Landmark, Smartphone, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { Spinner } from '../ui';

export const METHODS: [string, any, string, string][] = [
  ['mpesa', Smartphone, 'M-Pesa', 'Prompt on your phone'],
  ['till', Store, 'M-Pesa Till', 'Buy Goods prompt'],
  ['card', CreditCard, 'Card', 'Visa / Mastercard'],
  ['paystack', Landmark, 'Paystack', 'Card, bank, mobile money'],
];
export function PayMethods({ value, onChange, disabled }: { value: string; onChange: (m: string) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {METHODS.map(([k, I, l, d]) => (
        <button key={k} type="button" disabled={disabled} onClick={() => onChange(k)}
          className={cn('flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition disabled:opacity-50',
            value === k ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-600/10' : 'hover:bg-muted')}>
          <I className="h-5 w-5 text-emerald-700" /><span className="text-sm font-semibold">{l}</span><span className="text-[11px] text-muted-foreground">{d}</span>
        </button>
      ))}
    </div>
  );
}

export default function PayPanel({ order, initial, autoStart, onPaid }: { order: any; initial?: string; autoStart?: boolean; onPaid: () => void }) {
  const [method, setMethod] = useState(initial || 'mpesa');
  const [state, setState] = useState<'idle' | 'waiting' | 'failed'>('idle');
  const [err, setErr] = useState('');
  const timer = useRef<any>();
  const started = useRef(false);

  async function pay() {
    setState('waiting'); setErr('');
    try {
      const r = await api('/payments/pay', { method: 'POST', body: { orderId: order.id, method } });
      if (r.kind === 'redirect') { location.href = r.url; return; }
    } catch (e: any) { setErr(e.message); return setState('failed'); }
    const t0 = Date.now();
    clearInterval(timer.current);
    timer.current = setInterval(async () => {
      const o = await api('/orders/' + order.id).catch(() => null);
      if (o && o.status !== 'pending') { clearInterval(timer.current); toast.success('Payment received'); onPaid(); }
      else if (Date.now() - t0 > 90_000) {
        clearInterval(timer.current);
        setErr('Not confirmed yet. If money left your account it will be matched automatically; otherwise try again.');
        setState('failed');
      }
    }, 3000);
  }
  useEffect(() => {
    if (autoStart && !started.current) { started.current = true; pay(); }
    return () => clearInterval(timer.current);
  }, []);

  const stk = method === 'mpesa' || method === 'till';
  return (
    <div className="space-y-3">
      <PayMethods value={method} onChange={setMethod} disabled={state === 'waiting'} />
      {stk && <p className="text-xs text-muted-foreground">The prompt goes to {order.phone}.</p>}
      {err && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      {state === 'waiting'
        ? <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800"><Spinner />{stk ? 'Check your phone and enter your PIN…' : 'Opening secure checkout…'}</div>
        : <Button size="lg" className="w-full" onClick={pay}>{state === 'failed' ? 'Try again' : `Pay with ${METHODS.find(m => m[0] === method)![2]}`}</Button>}
    </div>
  );
}
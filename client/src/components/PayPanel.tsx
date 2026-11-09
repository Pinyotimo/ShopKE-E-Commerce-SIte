import { useEffect, useRef, useState } from 'react';
import { CreditCard, Landmark, Smartphone, Store, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../api';
import { Spinner } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';

export const METHODS: [string, any, string, string][] = [
  ['mpesa', Smartphone, 'M-Pesa', 'Prompt on your phone'],
  ['till', Store, 'M-Pesa Till', 'Buy Goods prompt'],
  ['card', CreditCard, 'Card', 'Visa / Mastercard'],
  ['paystack', Landmark, 'Paystack', 'Card, bank, mobile money'],
];

export function PayMethods({ value, onChange, disabled }: { value: string; onChange: (m: string) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {METHODS.map(([k, I, l, d]) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onChange(k)}
          className={cn(
            'group relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-300 disabled:opacity-50',
            value === k
              ? 'border-emerald-600 bg-emerald-50 ring-4 ring-emerald-600/10 shadow-sm'
              : 'border-border bg-card hover:border-emerald-200 hover:bg-emerald-50/30'
          )}
        >
          <div className={cn(
            "grid h-10 w-10 place-items-center rounded-xl transition-colors",
            value === k ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700"
          )}>
            <I className="h-5 w-5" />
          </div>
          <div className="mt-2">
            <span className="block text-sm font-bold text-foreground">{l}</span>
            <span className="block text-[11px] text-muted-foreground leading-tight">{d}</span>
          </div>
          {value === k && (
            <motion.div layoutId="activePayment" className="absolute -right-1 -top-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </motion.div>
          )}
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
      if (o && o.status !== 'pending') {
        clearInterval(timer.current);
        toast.success('Payment received!', {
          description: 'Your order is now being processed.',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        });
        onPaid();
      }
      else if (Date.now() - t0 > 90_000) {
        clearInterval(timer.current);
        setErr('Payment not confirmed yet. If funds were deducted, we will match them automatically; otherwise, please try again.');
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
    <div className="space-y-5">
      <PayMethods value={method} onChange={setMethod} disabled={state === 'waiting'} />

      <AnimatePresence mode="wait">
        {err && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{err}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {state === 'waiting' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl bg-emerald-50 p-6 text-center"
        >
          <div className="relative">
            <Spinner className="h-10 w-10 text-emerald-600" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-emerald-400 blur-xl"
            />
          </div>
          <div>
            <p className="font-bold text-emerald-800">Processing Payment</p>
            <p className="text-sm text-emerald-700">
              {stk ? `Please check your phone (${order.phone}) and enter your PIN` : 'Redirecting to secure gateway...'}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {stk && (
            <p className="text-center text-xs text-muted-foreground">
              Prompt will be sent to <span className="font-semibold text-foreground">{order.phone}</span>
            </p>
          )}
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-95"
            onClick={pay}
          >
            {state === 'failed' ? 'Try Again' : `Pay with ${METHODS.find(m => m[0] === method)![2]}`}
          </Button>
        </div>
      )}
    </div>
  );
}
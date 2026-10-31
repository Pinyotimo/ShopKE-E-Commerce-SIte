import { CheckCircle2, CreditCard, Package, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [['paid', CreditCard], ['packed', Package], ['out_for_delivery', Truck], ['delivered', CheckCircle2]] as const;
export function Stepper({ s }: { s: string }) {
  const i = STEPS.findIndex(x => x[0] === s);
  if (i < 0) return null;
  return (
    <div className="my-4 flex items-center">
      {STEPS.map(([k, I], n) => (
        <div key={k} className="flex flex-1 items-center last:flex-none">
          <div className={cn('grid h-8 w-8 place-items-center rounded-full border-2', n <= i ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted text-muted-foreground')}><I className="h-4 w-4" /></div>
          {n < 3 && <div className={cn('mx-1 h-0.5 flex-1', n < i ? 'bg-emerald-600' : 'bg-muted')} />}
        </div>
      ))}
    </div>
  );
}

const LABEL: Record<string, string> = { pending: 'Order placed', paid: 'Payment confirmed', packed: 'Packed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' };
export function Events({ events }: { events?: { status: string; note: string; at: string }[] }) {
  if (!events?.length) return null;
  return (
    <ol className="space-y-4 border-l-2 border-muted pl-5">
      {[...events].reverse().map((e, i) => (
        <li key={i} className="relative">
          <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background', i === 0 ? 'bg-emerald-600' : 'bg-muted-foreground/40')} />
          <p className="text-sm font-semibold">{LABEL[e.status] || e.status}</p>
          {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
          <p className="text-[11px] text-muted-foreground/70">{new Date(e.at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </li>
      ))}
    </ol>
  );
}
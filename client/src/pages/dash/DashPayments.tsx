import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, kes } from '../../api';
import { Empty, Status, Title } from '../../ui';
import UptimeCard, { type Incident, type UptimeService } from '@/components/kokonutui/uptime-card';

const HEALTH_DAYS = 30;
const GROUPS: [string, string[]][] = [['M-Pesa', ['mpesa', 'till']], ['Card', ['card']], ['Paystack', ['paystack']]];
const dayKey = (d: Date) => d.toLocaleDateString('en-CA'); // local YYYY-MM-DD
const dayIndex = (key: string, today: string) => HEALTH_DAYS - 1 - Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${key}T00:00:00Z`)) / 86_400_000);

/**
 * Daily payment success per method, shaped for the uptime card. A day with
 * failures becomes an incident; minutes are scaled so the card's % equals the
 * average daily success rate (it counts degraded minutes at half).
 */
function paymentHealth(rows: any[], today: string): UptimeService[] {
  return GROUPS.map(([name, methods]) => {
    const days = new Map<number, any[]>();
    for (const p of rows) {
      if (!methods.includes(p.method)) continue;
      const i = dayIndex(dayKey(new Date(p.created_at)), today);
      if (i < 0 || i >= HEALTH_DAYS) continue;
      days.set(i, [...(days.get(i) ?? []), p]);
    }
    const incidents: Record<number, Incident> = {};
    for (const [i, ps] of days) {
      const failed = ps.filter(p => p.status === 'failed');
      if (!failed.length) continue;
      const rate = failed.length / ps.length;
      incidents[i] = {
        title: `${failed.length} of ${ps.length} payment${ps.length === 1 ? '' : 's'} failed`,
        status: rate >= 0.5 ? 'down' : 'degraded',
        minutes: Math.round((rate >= 0.5 ? 1 : 2) * rate * 1440),
        updates: failed.slice(0, 5).map(p => ({
          time: new Date(p.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          label: 'Failed',
          note: `Order #${p.order_id} · ${kes(p.amount)}${p.note ? ` · ${p.note}` : ''}`,
        })),
      };
    }
    const first = days.size ? Math.min(...days.keys()) : HEALTH_DAYS;
    return { name, incidents, missing: first };
  }).filter(s => s.missing! < HEALTH_DAYS); // methods with no payments in the window would show NaN%
}

export default function DashPayments() {
  const [d, setD] = useState<any>(null);
  const load = () => api('/admin/payments').then(setD).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const act = (id: number, what: 'match' | 'resolve') => api(`/admin/payments/${id}/${what}`, { method: 'POST' })
    .then(() => toast.success(what === 'match' ? 'Matched and order marked paid' : 'Marked as refunded')).catch(e => toast.error(e.message)).finally(load);

  if (!d) return <><Title>Payments</Title><Skeleton className="h-48 rounded-2xl" /></>;
  const s = d.summary, diff = s.paid_payments - s.paid_orders;
  const cards: [string, string | number, boolean][] = [
    ['Received (paid payments)', kes(s.paid_payments), false], ['Paid orders total', kes(s.paid_orders), false],
    ['Difference', kes(diff), diff !== 0], ['Needs review', s.review, s.review > 0], ['Orders paid with no payment', s.orphans, s.orphans > 0],
  ];
  return (
    <div className="space-y-5">
      <Title>Payments</Title>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([l, v, bad]) => <Card key={l} className={`gap-1 p-4 ${bad ? 'border-amber-300 bg-amber-50 text-amber-900' : ''}`}><p className="text-[11px] font-semibold uppercase opacity-70">{l}</p><p className="text-xl font-extrabold">{v}</p></Card>)}
      </div>
      {d.rows.length > 0 && (() => {
        const today = dayKey(new Date());
        const health = paymentHealth(d.rows, today);
        return health.length > 0 && (
          <UptimeCard
            className="max-w-none rounded-2xl bg-card"
            title={`Payment success · last ${HEALTH_DAYS} days`}
            services={health}
            days={HEALTH_DAYS}
            endDate={today}
          />
        );
      })()}
      <p className="text-sm text-muted-foreground">Payments that do not match their order (wrong amount, late, or duplicate) are listed first. Match them to the order, or mark them refunded once you have returned the money.</p>
      {!d.rows.length ? <Empty icon={CreditCard} title="No payments yet" /> : (
        <Card className="p-0"><Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead>Expected</TableHead><TableHead>Received</TableHead><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{d.rows.map((p: any) => (
            <TableRow key={p.id} className={p.status === 'review' ? 'bg-amber-50/60' : ''}>
              <TableCell>{p.id}</TableCell>
              <TableCell>#{p.order_id}<div className="text-[11px] text-muted-foreground">{p.order_status}</div></TableCell>
              <TableCell>{p.customer}<div className="text-[11px] text-muted-foreground">{p.phone}</div></TableCell>
              <TableCell className="capitalize">{p.method}</TableCell>
              <TableCell>{kes(p.amount)}</TableCell>
              <TableCell className={p.paid_amount != null && p.paid_amount !== p.amount ? 'font-semibold text-rose-600' : ''}>{p.paid_amount != null ? kes(p.paid_amount) : '—'}</TableCell>
              <TableCell className="max-w-40 truncate font-mono text-xs">{p.mpesa_receipt || p.reference || '—'}</TableCell>
              <TableCell><Status s={p.status === 'review' ? 'requested' : p.status} />{p.note && <div className="mt-1 max-w-48 whitespace-normal text-[11px] text-muted-foreground">{p.note}</div>}</TableCell>
              <TableCell className="space-x-2 whitespace-nowrap text-right">
                {p.status === 'review' && <>
                  <Button size="sm" onClick={() => act(p.id, 'match')}><Link2 className="mr-1 h-3.5 w-3.5" />Match</Button>
                  <Button size="sm" variant="outline" onClick={() => act(p.id, 'resolve')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Refunded</Button></>}
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>)}
    </div>
  );
}
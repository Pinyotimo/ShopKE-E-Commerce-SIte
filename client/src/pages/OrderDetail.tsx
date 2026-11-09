import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, MapPin, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, kes } from '../api';
import PayPanel, { METHODS } from '../components/PayPanel';
import { Events, Stepper } from '../components/Timeline';
import { Page, Status, Title } from '../ui';
import CurrencyTransfer, { type TransferStatus } from '@/components/kokonutui/currency-transfer';
import ReceiptPrinter, { type ReceiptItem } from '@/components/kokonutui/receipt-printer';

const SHOP = 'ShopKE';
const when = (iso?: string) => (iso ? new Date(iso) : new Date());

export default function OrderDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const auto = useRef<string | undefined>((loc.state as any)?.autoPay);
  const [o, setO] = useState<any>(null);
  const [err, setErr] = useState('');
  // Returning from Paystack: 'verifying' until the API answers, 'failed' if the order is still unpaid.
  const [payFlow, setPayFlow] = useState<'verifying' | 'failed' | null>(sp.get('reference') ? 'verifying' : null);
  const load = () => api('/orders/' + id).then(setO).catch(e => setErr(e.message));

  useEffect(() => {
    if (auto.current) nav(loc.pathname + loc.search, { replace: true, state: null }); // no re-pay on refresh
    const ref = sp.get('reference'); // returning from Paystack
    (async () => {
      if (ref) {
        const r = await api('/payments/paystack/verify', { method: 'POST', body: { reference: ref } }).catch(() => null);
        setPayFlow(r && r.order !== 'pending' ? null : 'failed');
      }
      load();
    })();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [id]);

  if (err) return <Page><p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p></Page>;
  if (!o) return <Page><Skeleton className="h-64 rounded-2xl" /></Page>;
  const review = o.payment?.status === 'review';
  const paid = !['pending', 'cancelled'].includes(o.status);
  const confirmed = paid && o.payment?.status === 'paid';

  // Payment progress card: shown while a payment is being checked, and once it is confirmed.
  let payStatus: TransferStatus | null = null;
  if (confirmed) payStatus = 'completed';
  else if (review || (payFlow === 'verifying' && o.status === 'pending')) payStatus = 'processing';
  else if (payFlow === 'failed' && o.status === 'pending') payStatus = 'failed';
  const methodLabel = METHODS.find(m => m[0] === o.payment?.method)?.[2] || (o.payment?.method ?? 'Paystack');
  const paidAt = o.events?.find((e: any) => e.status === 'paid')?.at;
  const retryPayment = () => { setPayFlow(null); nav(loc.pathname, { replace: true }); };

  const receiptItems: ReceiptItem[] = [
    ...(o.items ?? []).map((i: any) => ({ name: i.name, quantity: i.qty, price: i.price })),
    { name: 'Delivery', quantity: 1, price: o.delivery_fee || 0 },
    ...(o.discount > 0 ? [{ name: `Discount${o.coupon_code ? ` (${o.coupon_code})` : ''}`, quantity: 1, price: -o.discount }] : []),
  ];

  return (
    <Page>
      <Title action={<Status s={o.status} />}>Order #{o.id}</Title>
      <div className="grid items-start gap-5 md:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {payStatus && (
            <CurrencyTransfer
              className="mx-0 max-w-none"
              status={payStatus}
              locale="en-KE"
              from={{ amount: o.total, currency: 'KES', symbol: 'KES ', bank: methodLabel, last4: o.phone?.slice(-4) }}
              to={{ amount: o.total, currency: 'KES', symbol: 'KES ', bank: `Order #${o.id}`, name: SHOP }}
              rate={1}
              txnId={o.payment?.receipt || sp.get('reference') || `ORDER-${o.id}`}
              timestamp={when(paidAt).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })}
              onRetry={retryPayment}
            />
          )}
          {o.status === 'pending' && !review && payStatus !== 'processing' && (
            <Card className="gap-3 p-5"><h2 className="font-bold">Pay for this order</h2>
              <p className="text-sm text-muted-foreground">Unpaid orders are released after 30 minutes.</p>
              <PayPanel order={o} initial={auto.current} autoStart={!!auto.current} onPaid={load} /></Card>
          )}
          {review && (
            <Card className="flex-row gap-3 border-amber-300 bg-amber-50 p-5 text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">We received your payment but need to match it to this order. We will confirm shortly. You do not need to pay again.</p></Card>
          )}
          {o.status === 'cancelled' && (
            <Card className="flex-row gap-3 p-5"><XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">This order expired. Paid and it still shows here? We will match it automatically or refund you. <Link to="/contact" className="underline">Contact us</Link>.</p></Card>
          )}
          <Card className="gap-0 p-5">
            <h2 className="mb-1 font-bold">Tracking</h2>
            <Stepper s={o.status} />
            <Events events={o.events} />
          </Card>
        </div>
        <Card className="gap-3 p-5">
          <h2 className="font-bold">Summary</h2>
          <ul className="space-y-1 text-sm">{o.items?.map((i: any, k: number) => <li key={k} className="flex justify-between gap-2"><span className="text-muted-foreground">{i.name} × {i.qty}</span><span>{kes(i.price * i.qty)}</span></li>)}</ul>
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{kes(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount {o.coupon_code && `(${o.coupon_code})`}</span><span>-{kes(o.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{o.delivery_fee ? kes(o.delivery_fee) : 'FREE'}</span></div>
          </div>
          <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><span>Total</span><span>{kes(o.total)}</span></div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{o.address}</p>
          <Link to="/orders" className="text-sm text-muted-foreground hover:underline">All my orders</Link>
        </Card>
        {confirmed && (
          <div className="md:col-start-2">
            <p className="mb-2 text-center text-xs text-muted-foreground">Your receipt. Pull it down to tear it off.</p>
            <ReceiptPrinter
              className="mx-auto"
              merchant={SHOP}
              order={`#${o.id}`}
              date={when(paidAt || o.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              items={receiptItems}
              tax={0}
              currency="KES "
            />
          </div>
        )}
      </div>
    </Page>
  );
}
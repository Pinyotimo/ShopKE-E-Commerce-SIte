import { useEffect, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Boxes, Repeat, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, kes } from '../../api';

const C = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6'];
const NAME: Record<string, string> = { mpesa: 'M-Pesa', till: 'M-Pesa Till', card: 'Card', paystack: 'Paystack' };

export default function Insights() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('/admin/insights').then(setD).catch(() => {}); }, []);
  if (!d) return null;
  const rep = d.buyers.total ? Math.round((100 * d.buyers.repeat) / d.buyers.total) : 0;
  const cards: [string, string | number, any][] = [
    ['Stock value (at price)', kes(d.stock.stock_value), Boxes], ['Out of stock', d.stock.out_of_stock, Boxes],
    ['Repeat buyers', `${rep}%`, Repeat], ['Coupons used', d.coupons.reduce((a: number, c: any) => a + c.orders, 0), Ticket],
  ];
  const data = d.methods.map((m: any) => ({ name: NAME[m.method] || m.method, value: m.revenue }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([l, v, I]) => <Card key={l} className="gap-1 p-4"><I className="h-4 w-4 text-emerald-600" /><p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p><p className="text-xl font-extrabold">{v}</p></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Revenue by payment method</CardTitle></CardHeader>
          <CardContent className="px-5">{data.length ? (
            <ResponsiveContainer width="100%" height={240}><PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{data.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Pie>
              <Tooltip formatter={(v: any) => kes(v)} /><Legend /></PieChart></ResponsiveContainer>) : <p className="py-10 text-center text-sm text-muted-foreground">No paid orders yet.</p>}</CardContent></Card>
        <Card className="gap-3 py-5"><CardHeader className="px-5"><CardTitle className="text-base">Top coupons</CardTitle></CardHeader>
          <CardContent className="space-y-2 px-5">{d.coupons.length ? d.coupons.map((c: any) => (
            <div key={c.code} className="flex items-center justify-between text-sm"><span className="font-mono font-bold">{c.code}</span><span className="text-muted-foreground">{c.orders} orders · {kes(c.discount)} given</span></div>
          )) : <p className="py-10 text-center text-sm text-muted-foreground">No coupon orders yet.</p>}</CardContent></Card>
      </div>
    </>
  );
}
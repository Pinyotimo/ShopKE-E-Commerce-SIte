import { useEffect, useState } from 'react';
import { useTheme } from '../../theme';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Banknote, ShoppingBag, TrendingUp, Undo2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, kes } from '../../api';
import { Title } from '../../ui';

const C = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#14b8a6'];
const axis = { tickLine: false, axisLine: false, fontSize: 11 } as const;
const k = (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v));
const Box = ({ title, className = '', children }: any) => (
  <Card className={`gap-3 py-5 ${className}`}><CardHeader className="px-5"><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="px-5">{children}</CardContent></Card>
);

type SeriesKey = 'units' | 'sales';
const SERIES: { key: SeriesKey; name: string }[] = [{ key: 'units', name: 'Units sold' }, { key: 'sales', name: 'Sales (KES)' }];

/** Units sold vs sales per month, two Y axes. Click a legend item to hide or show its line. */
function UnitsVsSales({ data, brand, accent }: { data: any[]; brand: string; accent: string }) {
  const [hidden, setHidden] = useState<Record<SeriesKey, boolean>>({ units: false, sales: false });
  const color: Record<SeriesKey, string> = { units: brand, sales: accent };
  const toggle = (key: SeriesKey) => setHidden(h => ({ ...h, [key]: !h[key] }));

  return (
    <>
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">Last 12 months. Click the legend to hide or show a line.</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axis} />
          <YAxis yAxisId="units" width={40} allowDecimals={false} {...axis} stroke={color.units} tick={{ fill: color.units, fontSize: 11 }}
            hide={hidden.units} label={{ value: 'Units', angle: -90, position: 'insideLeft', fill: color.units, fontSize: 11 }} />
          <YAxis yAxisId="sales" orientation="right" width={48} tickFormatter={k} {...axis} stroke={color.sales} tick={{ fill: color.sales, fontSize: 11 }}
            hide={hidden.sales} label={{ value: 'KES', angle: 90, position: 'insideRight', fill: color.sales, fontSize: 11 }} />
          <Tooltip
            formatter={(v: any, name: any) => (name === 'Sales (KES)' ? kes(v) : `${Number(v).toLocaleString()} units`)}
          />
          <Legend
            onClick={(e: any) => toggle(e.dataKey as SeriesKey)}
            wrapperStyle={{ cursor: 'pointer', fontSize: 12 }}
            formatter={(value: any, entry: any) => (
              <span style={{ opacity: hidden[entry.dataKey as SeriesKey] ? 0.4 : 1, textDecoration: hidden[entry.dataKey as SeriesKey] ? 'line-through' : 'none' }}>{value}</span>
            )}
          />
          {SERIES.map(s => (
            <Line key={s.key} yAxisId={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={color[s.key]}
              strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} hide={hidden[s.key]} animationDuration={800} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export default function Analytics() {
  const { brand, accent } = useTheme();
  const [d, setD] = useState<any>(null);
  useEffect(() => { api('/admin/analytics').then(setD).catch(e => toast.error(e.message)); }, []);
  if (!d) return <><Title>Analytics</Title><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></>;

  const t = d.totals;
  const stats: [string, string | number, any, string][] = [
    ['Revenue', kes(t.revenue), Banknote, 'text-emerald-600 bg-emerald-50'],
    ['Paid orders', t.orders, ShoppingBag, 'text-sky-600 bg-sky-50'],
    ['Avg order', kes(t.orders ? Math.round(t.revenue / t.orders) : 0), TrendingUp, 'text-violet-600 bg-violet-50'],
    ['Customers', t.customers, Users, 'text-amber-600 bg-amber-50'],
    ['Refunded', kes(t.refunded), Undo2, 'text-rose-600 bg-rose-50'],
    ['Low stock', t.low_stock, AlertTriangle, 'text-orange-600 bg-orange-50'],
  ];
  return (
    <div className="space-y-5">
      <Title>Analytics</Title>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(([l, v, I, c], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="gap-2 p-4">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${c}`}><I className="h-4 w-4" /></span>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p><p className="text-xl font-extrabold">{v}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {d.monthly && (
        <Box title="Units sold vs sales">
          <UnitsVsSales data={d.monthly} brand={brand} accent={accent} />
        </Box>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Revenue, last 30 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.daily} margin={{ left: 0, right: 8, top: 8 }}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand} stopOpacity={0.35} /><stop offset="100%" stopColor={brand} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" interval={4} {...axis} /><YAxis width={44} tickFormatter={k} {...axis} />
              <Tooltip formatter={(v: any) => kes(v)} />
              <Area type="monotone" dataKey="revenue" stroke={brand} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
        <Box title="Orders by status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.status} dataKey="n" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>{d.status.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Pie>
              <Tooltip /><Legend formatter={(v: any) => String(v).replace(/_/g, ' ')} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <Box title="Top products by revenue" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.top} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={120} {...axis} />
              <Tooltip formatter={(v: any) => kes(v)} />
              <Bar dataKey="revenue" fill={brand} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        <Box title="Revenue by category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.category}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" {...axis} /><YAxis width={44} tickFormatter={k} {...axis} />
              <Tooltip formatter={(v: any) => kes(v)} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>{d.category.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </div>
    </div>
  );
}
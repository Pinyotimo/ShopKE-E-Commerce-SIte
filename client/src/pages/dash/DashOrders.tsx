import { useEffect, useState } from 'react';
import { ClipboardList, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, kes } from '../../api';
import { Empty, Status, Title } from '../../ui';

const ACTIVE = ['paid', 'packed', 'out_for_delivery'];
const FILTERS = ['active', 'all', 'pending', 'paid', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];

export default function DashOrders() {
  const [os, setOs] = useState<any[] | null>(null);
  const [f, setF] = useState('active');
  const load = () => api('/staff/orders').then(setOs).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const upd = (id: number, status: string) => api(`/staff/orders/${id}/status`, { method: 'PATCH', body: { status } })
    .then(() => { toast.success(`Order #${id} → ${status.replace(/_/g, ' ')}`); load(); }).catch(e => toast.error(e.message));
  const rows = (os || []).filter(o => f === 'all' || (f === 'active' ? ACTIVE.includes(o.status) : o.status === f));

  return (
    <>
      <Title action={
        <Select value={f} onValueChange={setF}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{FILTERS.map(x => <SelectItem key={x} value={x} className="capitalize">{x === 'active' ? 'To fulfil' : x.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>}>Orders</Title>
      {os === null ? <Skeleton className="h-48 rounded-2xl" />
        : !rows.length ? <Empty icon={ClipboardList} title="No orders here" />
        : <Card className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Deliver to</TableHead><TableHead>Status</TableHead><TableHead className="w-44">Update</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-bold">#{o.id}</TableCell>
                  <TableCell><div>{o.customer}</div><div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{o.phone}</div></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.items?.map((i: any, k: number) => <div key={k}>{i.name} × {i.qty}</div>)}</TableCell>
                  <TableCell className="font-semibold">{kes(o.total)}</TableCell>
                  <TableCell className="max-w-48"><div className="truncate text-sm">{o.address}</div>
                    <a className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline" target="_blank" href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}><MapPin className="h-3 w-3" />{o.distance_km} km · map</a></TableCell>
                  <TableCell><div className="flex flex-col items-start gap-1"><Status s={o.status} />{o.refund_status && <Status s={o.refund_status} />}</div></TableCell>
                  <TableCell>
                    {ACTIVE.includes(o.status) && (
                      <Select value="" onValueChange={v => upd(o.id, v)}>
                        <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Set status…" /></SelectTrigger>
                        <SelectContent><SelectItem value="packed">Packed</SelectItem><SelectItem value="out_for_delivery">Out for delivery</SelectItem><SelectItem value="delivered">Delivered</SelectItem></SelectContent>
                      </Select>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>}
    </>
  );
}
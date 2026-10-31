import { useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, kes } from '../../api';
import { Empty, Status, Title } from '../../ui';

export default function DashRefunds() {
  const [rs, setRs] = useState<any[] | null>(null);
  const load = () => api('/admin/refunds').then(setRs).catch(e => toast.error(e.message));
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const act = (id: number, what: 'approve' | 'reject') => api(`/admin/refunds/${id}/${what}`, { method: 'POST' })
    .then(() => toast.success(what === 'approve' ? 'Reversal sent to M-Pesa' : 'Refund rejected')).catch(e => toast.error(e.message)).finally(load);
  return (
    <>
      <Title>Refund requests</Title>
      {rs === null ? <Skeleton className="h-40 rounded-2xl" />
        : !rs.length ? <Empty icon={RotateCcw} title="No refund requests" />
        : <Card className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {rs.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{f.id}</TableCell><TableCell>#{f.order_id}</TableCell><TableCell>{f.customer}</TableCell>
                  <TableCell className="font-semibold">{kes(f.amount)}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-muted-foreground">“{f.reason}”</TableCell>
                  <TableCell><Status s={f.status} /></TableCell>
                  <TableCell className="space-x-2 text-right">
                    {['requested', 'failed'].includes(f.status) && <Button size="sm" onClick={() => act(f.id, 'approve')}><Check className="mr-1 h-3.5 w-3.5" />{f.status === 'failed' ? 'Retry' : 'Approve'}</Button>}
                    {f.status === 'requested' && <Button size="sm" variant="outline" className="text-rose-600" onClick={() => act(f.id, 'reject')}><X className="mr-1 h-3.5 w-3.5" />Reject</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>}
    </>
  );
}
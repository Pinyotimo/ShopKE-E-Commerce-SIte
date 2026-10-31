import { useEffect, useState } from 'react';
import { Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, kes } from '../../api';
import { Empty, Title } from '../../ui';

const blank = { code: '', kind: 'percent', value: '', min_subtotal: '', max_uses: '', expires_at: '' };

export default function DashCoupons() {
  const [cs, setCs] = useState<any[] | null>(null);
  const [f, setF] = useState<any>(blank);
  const load = () => api('/admin/coupons').then(setCs).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function create() {
    try {
      await api('/admin/coupons', { method: 'POST', body: { ...f, value: +f.value, min_subtotal: +f.min_subtotal || 0, max_uses: +f.max_uses || null, expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null } });
      toast.success('Coupon created'); setF(blank); load();
    } catch (e: any) { toast.error(e.message); }
  }
  const toggle = (c: any) => api(`/admin/coupons/${c.id}`, { method: 'PATCH', body: { active: !c.active } }).then(load).catch(e => toast.error(e.message));
  const del = (c: any) => api(`/admin/coupons/${c.id}`, { method: 'DELETE' }).then(r => { toast.success(r.archived ? 'Already used, so it was deactivated' : 'Deleted'); load(); }).catch(e => toast.error(e.message));

  return (
    <div className="space-y-5">
      <Title>Coupons</Title>
      <Card className="gap-3 p-5">
        <h2 className="font-bold">New coupon</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Input placeholder="CODE" className="uppercase" value={f.code} onChange={set('code')} />
          <select value={f.kind} onChange={set('kind')} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="percent">Percent off</option><option value="fixed">KES off</option></select>
          <Input type="number" placeholder={f.kind === 'percent' ? '% (max 90)' : 'KES amount'} value={f.value} onChange={set('value')} />
          <Input type="number" placeholder="Min spend (KES)" value={f.min_subtotal} onChange={set('min_subtotal')} />
          <Input type="number" placeholder="Max uses" value={f.max_uses} onChange={set('max_uses')} />
          <Input type="datetime-local" value={f.expires_at} onChange={set('expires_at')} />
        </div>
        <div><Button disabled={!f.code || !+f.value} onClick={create}>Create coupon</Button></div>
      </Card>
      {cs === null ? <Skeleton className="h-40 rounded-2xl" /> : !cs.length ? <Empty icon={Ticket} title="No coupons yet" /> : (
        <Card className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Min spend</TableHead><TableHead>Used</TableHead><TableHead>Expires</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{cs.map(c => (
            <TableRow key={c.id} className={c.active ? '' : 'opacity-50'}>
              <TableCell className="font-mono font-bold">{c.code}</TableCell>
              <TableCell>{c.kind === 'percent' ? `${c.value}%` : kes(c.value)}</TableCell>
              <TableCell>{c.min_subtotal ? kes(c.min_subtotal) : '—'}</TableCell>
              <TableCell>{c.used}{c.max_uses ? ` / ${c.max_uses}` : ''}</TableCell>
              <TableCell className="text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-KE') : 'Never'}</TableCell>
              <TableCell><Switch checked={c.active} onCheckedChange={() => toggle(c)} /></TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-rose-600" onClick={() => del(c)}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>)}
    </div>
  );
}
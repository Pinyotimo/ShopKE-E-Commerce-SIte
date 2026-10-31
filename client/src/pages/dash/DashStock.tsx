import { useEffect, useState } from 'react';
import { Boxes, PackageX, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '../../api';
import { Spinner, Title } from '../../ui';

const REASONS = ['Restock', 'Damaged / lost', 'Stock count correction', 'Customer return'];

export default function DashStock() {
  const [ps, setPs] = useState<any[] | null>(null);
  const [log, setLog] = useState<any[]>([]);
  const [t, setT] = useState<any>(null);
  const [chg, setChg] = useState('');
  const [why, setWhy] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const load = () => { api('/staff/stock').then(setPs).catch(e => toast.error(e.message)); api('/staff/stock-log').then(setLog).catch(() => {}); };
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    try { await api(`/staff/stock/${t.id}/adjust`, { method: 'POST', body: { change: +chg, reason: why } }); toast.success('Stock updated'); setT(null); setChg(''); load(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  const act = (ps || []).filter(p => p.active);
  const stats: [string, number, any][] = [
    ['Out of stock', act.filter(p => p.stock === 0).length, PackageX],
    ['Low (5 or fewer)', act.filter(p => p.stock > 0 && p.stock <= 5).length, TriangleAlert],
    ['Units on hand', act.reduce((a, p) => a + p.stock, 0), Boxes],
  ];
  const left = (p: any) => (p.sold30 ? Math.floor(p.stock / (p.sold30 / 30)) : null);

  return (
    <div className="space-y-5">
      <Title>Stock</Title>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([l, n, I]) => <Card key={l} className="gap-1 p-4"><I className="h-4 w-4 text-emerald-600" /><p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p><p className="text-2xl font-extrabold">{n}</p></Card>)}
      </div>
      {ps === null ? <Skeleton className="h-48 rounded-2xl" /> : (
        <Card className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>In stock</TableHead><TableHead>Sold (30d)</TableHead><TableHead>Runs out in</TableHead><TableHead className="text-right">Adjust</TableHead></TableRow></TableHeader>
          <TableBody>{ps.map(p => { const d = left(p); return (
            <TableRow key={p.id} className={p.active ? '' : 'opacity-50'}>
              <TableCell><div className="flex items-center gap-3"><img src={p.image_url} alt="" className="h-9 w-9 rounded-lg bg-muted object-cover" /><span className="font-medium">{p.name}</span></div></TableCell>
              <TableCell>{p.stock === 0 ? <Badge variant="outline" className="border-0 bg-rose-100 text-rose-800">Out</Badge> : p.stock <= 5 ? <Badge variant="outline" className="border-0 bg-amber-100 text-amber-800">{p.stock}</Badge> : p.stock}</TableCell>
              <TableCell>{p.sold30}</TableCell>
              <TableCell>{d === null ? <span className="text-muted-foreground">No recent sales</span> : <span className={d <= 7 ? 'font-semibold text-rose-600' : ''}>{d} day{d === 1 ? '' : 's'}{d <= 7 && ' · reorder'}</span>}</TableCell>
              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setT(p); setChg(''); }}>Adjust</Button></TableCell>
            </TableRow>); })}</TableBody>
        </Table></Card>)}
      <h2 className="pt-2 font-bold">Recent movements</h2>
      <Card className="p-0"><Table>
        <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Product</TableHead><TableHead>Change</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
        <TableBody>{log.map(m => (
          <TableRow key={m.id}>
            <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
            <TableCell>{m.product}</TableCell>
            <TableCell className={m.change > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{m.change > 0 ? '+' : ''}{m.change}</TableCell>
            <TableCell className="text-muted-foreground">{m.reason}{m.order_id && ` · order #${m.order_id}`}</TableCell>
            <TableCell className="text-muted-foreground">{m.by_user || 'system'}</TableCell>
          </TableRow>))}</TableBody>
      </Table></Card>

      <Dialog open={!!t} onOpenChange={o => !o && setT(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust stock: {t?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Now {t?.stock}. Use a positive number to add and a negative number to remove.</p>
          <div className="space-y-1.5"><Label>Change</Label><Input type="number" placeholder="e.g. 20 or -3" value={chg} onChange={e => setChg(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Reason</Label>
            <select value={why} onChange={e => setWhy(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">{REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
          <DialogFooter><Button disabled={busy || !+chg} onClick={save}>{busy ? <Spinner /> : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}